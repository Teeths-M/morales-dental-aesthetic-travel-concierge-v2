import { createHandler, ok } from '../../shared/createHandler.ts';
import { formatMinor } from '../../shared/partnerMoney.ts';
import { derivePricingStatus, isFirmCurrent } from '../../shared/partnerCatalogue.ts';

/**
 * searchPartnerOffers — the read-only window M-Care and the partner portal look
 * through.
 *
 * Deliberately read-only, and deliberately returns commercial facts only: no
 * partner contact details, no patient data, no internal ids beyond the ones a
 * follow-up call needs.
 *
 * Credential verification, price freshness and operational availability are
 * returned as THREE separate fields. They are different kinds of evidence and
 * collapsing them into one "status" is exactly how a submitted price starts
 * looking verified.
 */

const VERIFIED_STATES = new Set(['verified', 'verified', 'manually_approved', 'approved']);

const VERIFICATION_ENTITY = {
  travel_agency: 'TravelAgency',
  taxi_service: 'TaxiService',
  companion: 'Companion',
  security_agency: 'SecurityAgency',
  doctor: 'Doctor',
  hotel: 'Partner',
  tour_guide: 'Partner',
  clinic: 'Clinic',
};

function verificationRank(status: string): number {
  if (VERIFIED_STATES.has(status)) return 3;
  if (!status) return 0;
  return 1;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const payload = await body<any>();
  const category = typeof payload.category === 'string' ? payload.category.trim() : '';
  const country = typeof payload.country === 'string' ? payload.country.trim() : '';
  const city = typeof payload.city === 'string' ? payload.city.trim() : '';
  const query = typeof payload.query === 'string' ? payload.query.trim().toLowerCase() : '';
  const includeNonCurrent = payload.include_non_current === true;
  const limit = Math.min(Math.max(Number(payload.limit) || 20, 1), 50);

  // Active offers only. Paused and withdrawn cards keep their history but are
  // never searchable — a traveller must not be quoted from one.
  const filters: Record<string, unknown> = { status: 'active' };
  if (category) filters.category = category;
  if (country) filters.country = country;

  const cards = await base44.asServiceRole.entities.PartnerRateCard
    .filter(filters, '-last_updated_at', 200)
    .catch(() => []);

  // The listing has to be live too. A price is 'active' the moment a partner saves it, but its listing stays a
  // draft until the partner is approved (managePartnerService only publishes for an active partner), so checking
  // the price alone let a not-yet-approved partner's price reach travellers. Fails closed: a listing that can't be
  // loaded here is left out, never shown.
  // Status only: a price keeps the country and category it was saved with, so matching those against the listing
  // could drop a real offer whose listing was edited since.
  const liveServices = await base44.asServiceRole.entities.PartnerService
    .filter({ status: 'active' }, '-last_updated_at', 1000)
    .then((page: any) => page?.items ?? page ?? [])
    .catch(() => []);
  const liveServiceIds = new Set((liveServices as any[]).map((s) => s.id));

  const now = new Date();
  const enriched = (cards as any[])
    .filter((card) => liveServiceIds.has(card.service_id))
    .map((card) => ({ card, status: derivePricingStatus(card, now) }))
    .filter(({ card, status }) => status !== 'WITHDRAWN' && status !== 'EXPIRED')
    .filter(({ status }) => includeNonCurrent || status !== 'STALE' || true)
    .filter(({ card }) => !city || String(card.city || '').toLowerCase().includes(city.toLowerCase()))
    .filter(({ card }) => {
      if (!query) return true;
      const haystack = `${card.service_name || ''} ${card.category || ''} ${card.city || ''} ${card.country || ''} ${card.location_label || ''}`.toLowerCase();
      return haystack.includes(query);
    });

  // Firm, current offers first — that is the order M-Care must consider them in:
  // current network prices before anything needing reconfirmation.
  enriched.sort((a, b) => {
    const aFirm = isFirmCurrent(a.card, now) ? 0 : 1;
    const bFirm = isFirmCurrent(b.card, now) ? 0 : 1;
    if (aFirm !== bFirm) return aFirm - bFirm;
    return (a.card.amount_minor ?? Number.MAX_SAFE_INTEGER) - (b.card.amount_minor ?? Number.MAX_SAFE_INTEGER);
  });

  const page = enriched.slice(0, limit);

  // Verification is looked up only for the page we actually return.
  const idsByType: Record<string, string[]> = {};
  for (const { card } of page) {
    const entity = VERIFICATION_ENTITY[card.partner_type];
    if (!entity) continue;
    (idsByType[entity] ||= []).push(card.partner_id);
  }
  const verificationById: Record<string, string> = {};
  await Promise.allSettled(Object.entries(idsByType).map(async ([entity, ids]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return;
    const rows = await base44.asServiceRole.entities[entity].list('-created_date', 400).catch(() => []);
    for (const row of rows as any[]) {
      if (!unique.includes(row.id)) continue;
      verificationById[row.id] = row.verification_status || '';
    }
  }));

  const offers = page.map(({ card, status }) => {
    const verificationStatus = verificationById[card.partner_id] || '';
    return {
      rate_card_id: card.id,
      service_id: card.service_id,
      service_name: card.service_name,
      category: card.category,
      is_package: Boolean(card.is_package),
      partner_type: card.partner_type,
      partner_display_name: card.partner_display_name || '',
      country: card.country || '',
      city: card.city || '',
      location_label: card.location_label || '',
      currency: card.currency,
      amount_minor: card.amount_minor ?? null,
      amount_display: formatMinor(card.amount_minor, card.currency),
      pricing_unit: card.pricing_unit,
      price_kind: card.price_kind,
      is_total_price: card.price_kind === 'firm' && card.pricing_unit !== 'starting_from',
      inclusions: card.inclusions || [],
      exclusions: card.exclusions || [],
      taxes_and_fees_minor: card.taxes_and_fees_minor ?? null,
      conditions: card.conditions || '',
      cancellation_terms: card.cancellation_terms || '',
      availability_status: card.availability_status || 'unknown',
      pricing_status: status,
      price_is_current: status === 'CURRENT_PARTNER_CONFIRMED',
      requires_reconfirmation: ['STALE', 'PARTNER_SUBMITTED'].includes(status),
      valid_until: card.valid_until || null,
      last_confirmed_at: card.last_confirmed_at || null,
      next_review_at: card.next_review_at || null,
      // A separate dimension, never merged into the price status.
      partner_verification: verificationRank(verificationStatus) === 3 ? 'verified' : verificationStatus || 'unknown',
      partner_is_verified: verificationRank(verificationStatus) === 3,
      missing_fields: card.missing_fields || [],
      medical_disclaimer_applies: Boolean(card.medical_disclaimer_applies),
      medical_price_is_informational: Boolean(card.medical_disclaimer_applies),
    };
  });

  return ok({
    offers,
    returned: offers.length,
    has_more: enriched.length > offers.length,
    note: offers.length === 0
      ? 'No approved Morales partner offer matched. External discovery would be the next step.'
      : undefined,
  });
}, { name: 'searchPartnerOffers', requireAuth: false, rateLimit: { max: 60, windowSeconds: 60 } }));