import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { derivePricingStatus, snapshotOf } from '../../shared/partnerCatalogue.ts';

/**
 * adminPartnerPricing — moderation, never editing.
 *
 * An administrator may pause a listing, suspend it, reinstate it after review,
 * or record a note against it. There is deliberately no action here that
 * changes a partner's price: the partner's own number stays their statement,
 * and every administrative decision is written as an immutable version row
 * naming who did it and why.
 */

const text = (value: unknown, max = 800) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const ACTIONS = new Set(['pause_offer', 'reinstate_offer', 'suspend_service', 'reinstate_service', 'record_note']);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const payload = await body<any>();
  const action = text(payload.action, 40);
  const reason = text(payload.reason, 800);

  if (!ACTIONS.has(action)) return err('Unknown action.', 400);
  if (!reason) return err('A reason is required for every administrative action — it is the audit record.', 400);

  const nowIso = new Date().toISOString();

  if (action === 'suspend_service' || action === 'reinstate_service') {
    const serviceId = text(payload.service_id, 100);
    if (!serviceId) return err('service_id is required.', 400);
    const service = await base44.asServiceRole.entities.PartnerService.get(serviceId).catch(() => null);
    if (!service) return err('Service not found.', 404);

    const status = action === 'suspend_service' ? 'suspended' : 'active';
    const updated = await base44.asServiceRole.entities.PartnerService.update(serviceId, {
      status,
      updated_by: user!.email,
      last_updated_at: nowIso,
    });

    if (action === 'suspend_service') {
      const cards = await base44.asServiceRole.entities.PartnerRateCard
        .filter({ service_id: serviceId }, '-created_date', 50).catch(() => []);
      await Promise.allSettled((cards as any[]).map((card) => base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
        status: 'paused',
        last_updated_by: user!.email,
        last_updated_at: nowIso,
      })));
    }

    return ok({ service: updated, action, reason });
  }

  // ── Offer-level actions write a version row first ─────────────────────────
  const rateCardId = text(payload.rate_card_id, 100);
  if (!rateCardId) return err('rate_card_id is required.', 400);

  const card = await base44.asServiceRole.entities.PartnerRateCard.get(rateCardId).catch(() => null);
  if (!card) return err('Price not found.', 404);

  const changeKind = action === 'pause_offer' ? 'admin_suspended'
    : action === 'reinstate_offer' ? 'admin_reinstated'
      : 'admin_note';

  await base44.asServiceRole.entities.RateCardVersion.create({
    rate_card_id: card.id,
    service_id: card.service_id,
    partner_id: card.partner_id,
    partner_email: card.partner_email,
    version: card.version || 1,
    change_kind: changeKind,
    previous_amount_minor: card.amount_minor ?? null,
    snapshot: snapshotOf(card),
    changed_by: user!.email,
    changed_at: nowIso,
    note: reason,
  });

  if (action === 'record_note') {
    return ok({ rate_card: card, note_recorded: true });
  }

  const nextStatus = action === 'pause_offer' ? 'paused' : 'active';
  const updated = await base44.asServiceRole.entities.PartnerRateCard.update(card.id, {
    status: nextStatus,
    pricing_status: nextStatus === 'active' ? derivePricingStatus({ ...card, status: 'active' }) : card.pricing_status,
    version: (card.version || 1) + 1,
    last_updated_by: user!.email,
    last_updated_at: nowIso,
  });

  return ok({ rate_card: updated, action, reason });
}, { name: 'adminPartnerPricing', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));