/**
 * partnerCatalogue — the deterministic rules behind the partner commercial
 * catalogue: who may act, which pricing units make sense for a category, and
 * — most importantly — how a stored rate card's price freshness is derived.
 *
 * Freshness is DERIVED, never trusted from the stored label alone. A card that
 * says CURRENT_PARTNER_CONFIRMED but whose review deadline passed two days ago
 * must read STALE, because a label that outlives its own deadline is exactly
 * how a stale price gets quoted as current. Derivation only ever moves an
 * active offer toward caution; it never promotes anything back to confirmed —
 * only the partner's own reconfirmation does that.
 */

export const CATEGORY_UNITS: Record<string, string[]> = {
  flight: ['fixed', 'per_person', 'starting_from', 'quote_required'],
  package: ['per_package', 'per_person', 'starting_from', 'quote_required'],
  lodging: ['per_night', 'fixed', 'per_person', 'starting_from', 'quote_required'],
  transfer: ['per_trip', 'per_vehicle', 'fixed', 'quote_required'],
  chauffeur_hourly: ['per_hour', 'per_day', 'per_trip', 'quote_required'],
  companion_care: ['per_hour', 'per_day', 'fixed', 'quote_required'],
  tour: ['per_person', 'per_hour', 'per_day', 'fixed', 'quote_required'],
  security: ['per_hour', 'per_day', 'fixed', 'quote_required'],
  clinic_procedure: ['fixed', 'starting_from', 'quote_required'],
};

/** Roles that own a catalogue, mapped to the existing partner entity. */
export const PARTNER_ENTITY_BY_ROLE: Record<string, { entity: string; type: string }> = {
  travel_agency: { entity: 'TravelAgency', type: 'travel_agency' },
  taxi_service: { entity: 'TaxiService', type: 'taxi_service' },
  companion: { entity: 'Companion', type: 'companion' },
  security_agency: { entity: 'SecurityAgency', type: 'security_agency' },
  doctor: { entity: 'Doctor', type: 'doctor' },
  local_doctor: { entity: 'Doctor', type: 'doctor' },
};

export const OFFER_CATEGORIES = Object.keys(CATEGORY_UNITS);

export function isValidUnitForCategory(category: string, unit: string): boolean {
  return (CATEGORY_UNITS[category] || []).includes(unit);
}

/** On-duty style quiet-hours check, in the partner's own IANA timezone. */
export function isQuietHours(
  timezone: string | undefined,
  start: string | undefined,
  end: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!start || !end || start === end) return false;
  let minutesNow: number;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    minutesNow = hour * 60 + minute;
  } catch {
    return false; // an unusable timezone must never silently mute all reminders
  }

  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const from = toMinutes(start);
  const to = toMinutes(end);
  return from <= to
    ? minutesNow >= from && minutesNow < to
    : minutesNow >= from || minutesNow < to; // wraps past midnight
}

const TERMINAL = new Set(['WITHDRAWN', 'QUOTE_CONFIRMED']);

/**
 * The freshness a traveller-facing surface must actually show.
 *
 * Order matters: an ended validity beats everything (it cannot be quoted at
 * any price), then a passed review deadline makes a "confirmed" price stale,
 * then the stored status stands.
 */
export function derivePricingStatus(card: any, now: Date = new Date()): string {
  const stored = card?.pricing_status || 'PARTNER_SUBMITTED';
  if (TERMINAL.has(stored)) return stored;
  if (card?.status === 'paused') return stored;
  if (card?.status === 'withdrawn') return 'WITHDRAWN';

  if (card?.valid_until) {
    const end = new Date(`${card.valid_until}T23:59:59Z`);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) return 'EXPIRED';
  }
  if (stored === 'CURRENT_PARTNER_CONFIRMED' && card?.next_review_at) {
    const due = new Date(card.next_review_at);
    if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) return 'STALE';
  }
  if (card?.valid_from) {
    const start = new Date(`${card.valid_from}T00:00:00Z`);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) return 'STALE';
  }
  return stored;
}

/** Only a firm, confirmed, in-date price may ever be presented as current. */
export function isFirmCurrent(card: any, now: Date = new Date()): boolean {
  return derivePricingStatus(card, now) === 'CURRENT_PARTNER_CONFIRMED'
    && card?.status !== 'paused'
    && card?.price_kind !== 'quote_required';
}

/** Named gaps, so a partner can close them while calm rather than at 3am. */
export function missingFieldsFor(card: any, service: any): string[] {
  const missing: string[] = [];
  if (card?.price_kind !== 'quote_required' && (card?.amount_minor === null || card?.amount_minor === undefined)) {
    missing.push('price');
  }
  if (!card?.valid_until) missing.push('valid_until');
  if (!service?.country) missing.push('country');
  if (!card?.cancellation_terms && !service?.cancellation_terms) missing.push('cancellation_terms');
  if (service?.is_package && !(service?.package_components || []).length) missing.push('package_components');
  if (card?.availability_status === 'unknown') missing.push('availability');
  return missing;
}

/** Material change → a new version. Availability-only edits are not material. */
export function isMaterialChange(before: any, after: any): boolean {
  const keys = [
    'amount_minor', 'currency', 'pricing_unit', 'price_kind',
    'inclusions', 'exclusions', 'taxes_and_fees_minor',
    'valid_from', 'valid_until', 'conditions', 'cancellation_terms',
  ];
  return keys.some((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null));
}

export function snapshotOf(card: any): Record<string, unknown> {
  return {
    amount_minor: card?.amount_minor ?? null,
    currency: card?.currency ?? null,
    pricing_unit: card?.pricing_unit ?? null,
    price_kind: card?.price_kind ?? null,
    inclusions: card?.inclusions ?? [],
    exclusions: card?.exclusions ?? [],
    taxes_and_fees_minor: card?.taxes_and_fees_minor ?? null,
    availability_status: card?.availability_status ?? 'unknown',
    valid_from: card?.valid_from ?? null,
    valid_until: card?.valid_until ?? null,
    conditions: card?.conditions ?? null,
    cancellation_terms: card?.cancellation_terms ?? null,
    pricing_status: card?.pricing_status ?? null,
    status: card?.status ?? null,
  };
}

/** Stable fingerprint of the details a traveller is agreeing to share. */
export function detailsFingerprint(details: Record<string, unknown>): string {
  return JSON.stringify(details, Object.keys(details).sort());
}