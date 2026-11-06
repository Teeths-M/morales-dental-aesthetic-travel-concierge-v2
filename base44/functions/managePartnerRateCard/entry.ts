import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { normalizeCurrency, parseAmountMinor } from '../../shared/partnerMoney.ts';
import {
  PARTNER_ENTITY_BY_ROLE,
  derivePricingStatus,
  isMaterialChange,
  isValidUnitForCategory,
  missingFieldsFor,
  snapshotOf,
} from '../../shared/partnerCatalogue.ts';

/**
 * managePartnerRateCard — the only write path for prices.
 *
 * Every material change snapshots the PREVIOUS terms into RateCardVersion
 * before the live row is touched, so a quote issued against version 3 stays
 * readable after the partner reaches version 7.
 *
 * Two things this function deliberately cannot do:
 *  - mark a price "current" without the partner's own confirm action;
 *  - write a price as a float. Amounts arrive as partner-entered decimals and
 *    are converted to integer minor units here.
 */

const text = (value: unknown, max = 400) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const list = (value: unknown, max = 40) => (
  Array.isArray(value) ? value.map((v) => text(v, 160)).filter(Boolean).slice(0, max) : []
);
const int = (value: unknown) => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value)) : undefined);

const ACTIONS = new Set(['save', 'confirm', 'set_availability', 'pause', 'resume', 'withdraw']);

function plusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const payload = await body<any>();
  const action = text(payload.action, 40) || 'save';
  if (!ACTIONS.has(action)) return err('Unknown action.', 400);

  const roleMap = PARTNER_ENTITY_BY_ROLE[user!.role];
  if (!roleMap) return err('This account does not manage a partner catalogue.', 403);

  const partners = await base44.asServiceRole.entities[roleMap.entity]
    .filter({ email: user!.email }, '-created_date', 1)
    .catch(() => []);
  const partner = partners[0];
  if (!partner) return err('No partner profile is linked to this account.', 404);

  // ── The service this price belongs to ──────────────────────────────────────
  let card: any = null;
  if (payload.rate_card_id) {
    card = await base44.asServiceRole.entities.PartnerRateCard.get(payload.rate_card_id).catch(() => null);
    if (!card) return err('Price not found.', 404);
    if (card.partner_id !== partner.id) return err('That price belongs to another partner.', 403);
  }

  const serviceId = text(payload.service_id, 100) || card?.service_id;
  if (!serviceId) return err('service_id is required.', 400);
  const service = await base44.asServiceRole.entities.PartnerService.get(serviceId).catch(() => null);
  if (!service) return err('Service not found.', 404);
  if (service.partner_id !== partner.id) return err('That service belongs to another partner.', 403);
  if (service.status === 'suspended') return err('This listing is suspended pending review.', 409);

  const nowIso = new Date().toISOString();

  // ── State-only actions ─────────────────────────────────────────────────────
  if (action === 'pause' || action === 'resume' || action === 'withdraw') {
    if (!card) return err('rate_card_id is required.', 400);
    const status = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'withdrawn';
    await base44.asServiceRole.entities.RateCardVersion.create({
      rate_card_id: card.id,
      service_id: card.service_id,
      partner_id: card.partner_id,
      partner_email: card.partner_email,
      version: card.version || 1,
      change_kind: action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'withdrawn',
      previous_amount_minor: card.amount_minor ?? null,
      snapshot: snapshotOf(card),
      changed_by: user!.email,
      changed_at: nowIso,
      note: text(payload.reason, 500),
    }).catch(() => {});

    const updated = await base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
      status,
      pricing_status: status === 'withdrawn' ? 'WITHDRAWN' : card.pricing_status,
      version: (card.version || 1) + 1,
      last_updated_by: user!.email,
      last_updated_at: nowIso,
    });
    return ok({ rate_card: updated });
  }

  if (action === 'set_availability') {
    if (!card) return err('rate_card_id is required.', 400);
    const availability = ['unknown', 'available', 'limited', 'unavailable', 'requires_confirmation'].includes(payload.availability_status)
      ? payload.availability_status : 'unknown';
    const updated = await base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
      availability_status: availability,
      last_updated_by: user!.email,
      last_updated_at: nowIso,
    });
    return ok({ rate_card: updated });
  }

  if (action === 'confirm') {
    if (!card) return err('rate_card_id is required.', 400);
    if (card.status === 'withdrawn') return err('A withdrawn offer cannot be reconfirmed.', 409);

    const reviewDays = Number(card.review_interval_days) > 0 ? Number(card.review_interval_days) : 30;
    await base44.asServiceRole.entities.RateCardVersion.create({
      rate_card_id: card.id,
      service_id: card.service_id,
      partner_id: card.partner_id,
      partner_email: card.partner_email,
      version: card.version || 1,
      change_kind: 'reconfirmed',
      previous_amount_minor: card.amount_minor ?? null,
      snapshot: snapshotOf(card),
      changed_by: user!.email,
      changed_at: nowIso,
      note: 'Partner reconfirmed the published price.',
    }).catch(() => {});

    const updated = await base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
      pricing_status: 'CURRENT_PARTNER_CONFIRMED',
      last_confirmed_at: nowIso,
      last_confirmed_by: user!.email,
      next_review_at: plusDays(reviewDays),
      version: (card.version || 1) + 1,
      last_updated_by: user!.email,
      last_updated_at: nowIso,
    });

    // Any open reminder for this cycle is now answered.
    const reminders = await base44.asServiceRole.entities.PartnerPricingReminder
      .filter({ rate_card_id: card.id, status: 'queued' }, '-due_at', 20).catch(() => []);
    await Promise.allSettled((reminders as any[]).map((r) => base44.asServiceRole.entities.PartnerPricingReminder.update(r.id, {
      status: 'acknowledged',
      resolved_at: nowIso,
    })));

    return ok({ rate_card: updated, message: 'Price confirmed as still accurate.' });
  }

  // ── save (create or material update) ──────────────────────────────────────
  const currency = normalizeCurrency(payload.currency ?? card?.currency ?? 'USD');
  if (!currency) return err('Choose a valid three-letter currency code.', 400);

  const pricingUnit = text(payload.pricing_unit, 40) || card?.pricing_unit;
  if (!pricingUnit || !isValidUnitForCategory(service.category, pricingUnit)) {
    return err(`That pricing unit does not apply to a ${String(service.category).replace(/_/g, ' ')} service.`, 400);
  }

  const priceKind = ['firm', 'starting_from', 'quote_required'].includes(payload.price_kind)
    ? payload.price_kind
    : pricingUnit === 'quote_required' ? 'quote_required' : pricingUnit === 'starting_from' ? 'starting_from' : 'firm';

  let amountMinor: number | null = card?.amount_minor ?? null;
  if (priceKind !== 'quote_required') {
    const parsed = parseAmountMinor(payload.amount ?? (payload.amount_minor === undefined ? undefined : payload.amount_minor), currency);
    if (parsed === null && payload.amount !== undefined) {
      return err(`Enter the price as a number with at most ${currency === 'JPY' ? 0 : 2} decimal places.`, 400);
    }
    if (parsed !== null) amountMinor = parsed;
  } else {
    amountMinor = null;
  }

  const reviewDays = Number(payload.review_interval_days) > 0 ? Math.round(Number(payload.review_interval_days)) : (card?.review_interval_days || 30);
  const cadence = ['none', 'daily', 'weekly', 'custom'].includes(payload.reminder_cadence)
    ? payload.reminder_cadence
    : (card?.reminder_cadence || 'weekly');

  const next = {
    currency,
    amount_minor: amountMinor,
    pricing_unit: pricingUnit,
    price_kind: priceKind,
    inclusions: payload.inclusions === undefined ? (card?.inclusions || []) : list(payload.inclusions),
    exclusions: payload.exclusions === undefined ? (card?.exclusions || []) : list(payload.exclusions),
    taxes_and_fees_minor: payload.taxes === undefined ? (card?.taxes_and_fees_minor ?? null) : int(payload.taxes),
    taxes_note: text(payload.taxes_note, 400) || card?.taxes_note || '',
    additional_charges: Array.isArray(payload.additional_charges)
      ? payload.additional_charges.map((c: any) => ({
        label: text(c?.label, 160),
        amount_minor: Number.isInteger(c?.amount_minor) ? c.amount_minor : undefined,
      })).filter((c: any) => c.label)
      : (card?.additional_charges || []),
    min_booking: payload.min_booking === undefined ? card?.min_booking : int(payload.min_booking),
    max_capacity: payload.max_capacity === undefined ? card?.max_capacity : int(payload.max_capacity),
    valid_from: text(payload.valid_from, 10) || card?.valid_from || null,
    valid_until: text(payload.valid_until, 10) || card?.valid_until || null,
    conditions: text(payload.conditions, 2000) || card?.conditions || '',
    cancellation_terms: text(payload.cancellation_terms, 2000) || card?.cancellation_terms || '',
    review_interval_days: reviewDays,
    reminder_cadence: cadence,
    reminder_interval_days: cadence === 'custom' ? (Number(payload.reminder_interval_days) > 0 ? Math.round(Number(payload.reminder_interval_days)) : 14) : undefined,
    quiet_hours_start: text(payload.quiet_hours_start, 5) || card?.quiet_hours_start || '',
    quiet_hours_end: text(payload.quiet_hours_end, 5) || card?.quiet_hours_end || '',
    timezone: text(payload.timezone, 60) || card?.timezone || '',
    availability_status: ['unknown', 'available', 'limited', 'unavailable', 'requires_confirmation'].includes(payload.availability_status)
      ? payload.availability_status
      : (card?.availability_status || 'unknown'),
  };

  const material = !card || isMaterialChange(card, next);

  if (card && material) {
    await base44.asServiceRole.entities.RateCardVersion.create({
      rate_card_id: card.id,
      service_id: card.service_id,
      partner_id: card.partner_id,
      partner_email: card.partner_email,
      version: card.version || 1,
      change_kind: card.amount_minor !== next.amount_minor ? 'price_updated' : 'terms_updated',
      previous_amount_minor: card.amount_minor ?? null,
      snapshot: snapshotOf(card),
      changed_by: user!.email,
      changed_at: nowIso,
      note: text(payload.reason, 500),
    }).catch(() => {});
  }

  // A price the partner just edited is SUBMITTED, never automatically current —
  // even if they previously confirmed the old number.
  const pricingStatus = priceKind === 'quote_required'
    ? 'PARTNER_SUBMITTED'
    : payload.confirm === true ? 'CURRENT_PARTNER_CONFIRMED' : 'PARTNER_SUBMITTED';

  const payloadToWrite = {
    ...next,
    service_id: service.id,
    partner_id: partner.id,
    partner_email: user!.email,
    partner_type: roleMap.type,
    partner_display_name: service.partner_display_name || partner.agency_name || partner.full_name || '',
    category: service.category,
    service_name: service.name,
    is_package: Boolean(service.is_package),
    country: service.country || '',
    city: service.city || '',
    location_label: service.location_label || '',
    pricing_status: pricingStatus,
    status: card?.status === 'withdrawn' ? 'withdrawn' : (card?.status || 'active'),
    last_confirmed_at: pricingStatus === 'CURRENT_PARTNER_CONFIRMED' ? nowIso : (card?.last_confirmed_at ?? null),
    last_confirmed_by: pricingStatus === 'CURRENT_PARTNER_CONFIRMED' ? user!.email : (card?.last_confirmed_by ?? null),
    next_review_at: pricingStatus === 'CURRENT_PARTNER_CONFIRMED'
      ? plusDays(reviewDays)
      : (card?.next_review_at || plusDays(reviewDays)),
    version: (card?.version || 0) + 1,
    medical_disclaimer_applies: service.category === 'clinic_procedure',
    missing_fields: [],
    last_updated_by: user!.email,
    last_updated_at: nowIso,
  };

  const saved = card
    ? await base44.asServiceRole.entities.PartnerRateCard.update(card.id, payloadToWrite)
    : await base44.asServiceRole.entities.PartnerRateCard.create(payloadToWrite);

  const missing = missingFieldsFor(saved, service);
  if (missing.length > 0) {
    await base44.asServiceRole.entities.PartnerRateCard.update(saved.id, { missing_fields: missing }).catch(() => {});
  }

  return ok({
    rate_card: { ...saved, missing_fields: missing, derived_status: derivePricingStatus(saved) },
    missing_fields: missing,
  });
}, { name: 'managePartnerRateCard', requireAuth: true }));