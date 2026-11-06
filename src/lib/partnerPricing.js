/**
 * partnerPricing — partner-facing helpers for the commercial catalogue.
 *
 * Formats money that was stored as integer minor units, and mirrors the
 * server's freshness derivation so a screen never shows "confirmed" for a price
 * whose review deadline has already passed. The server remains authoritative;
 * this is only so the UI cannot drift more than a page-load behind it.
 */

export const GOLD = '#D4AF37';

export const CATEGORY_OPTIONS = [
  { value: 'flight', label: 'Flight', units: ['fixed', 'per_person', 'starting_from', 'quote_required'] },
  { value: 'package', label: 'Travel package', units: ['per_package', 'per_person', 'starting_from', 'quote_required'] },
  { value: 'lodging', label: 'Hotel / lodging', units: ['per_night', 'fixed', 'per_person', 'starting_from', 'quote_required'] },
  { value: 'transfer', label: 'Airport transfer', units: ['per_trip', 'per_vehicle', 'fixed', 'quote_required'] },
  { value: 'chauffeur_hourly', label: 'Driver (hourly / daily)', units: ['per_hour', 'per_day', 'per_trip', 'quote_required'] },
  { value: 'companion_care', label: 'Travel companion', units: ['per_hour', 'per_day', 'fixed', 'quote_required'] },
  { value: 'tour', label: 'Tour / activity', units: ['per_person', 'per_hour', 'per_day', 'fixed', 'quote_required'] },
  { value: 'security', label: 'Security service', units: ['per_hour', 'per_day', 'fixed', 'quote_required'] },
  { value: 'clinic_procedure', label: 'Clinic or facility', units: ['fixed', 'starting_from', 'quote_required'] },
];

export const UNIT_LABELS = {
  fixed: 'total',
  per_person: 'per person',
  per_night: 'per night',
  per_trip: 'per trip',
  per_hour: 'per hour',
  per_day: 'per day',
  per_vehicle: 'per vehicle',
  per_package: 'per package',
  starting_from: 'starting from',
  quote_required: 'quote required',
};

export function unitsForCategory(category) {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.units || ['fixed'];
}

export function formatMinor(amountMinor, currency = 'USD') {
  if (amountMinor === null || amountMinor === undefined) return null;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function minorToInput(amountMinor, currency = 'USD') {
  if (amountMinor === null || amountMinor === undefined) return '';
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP'].includes(String(currency).toUpperCase());
  if (zeroDecimal) return String(amountMinor);
  return (amountMinor / 100).toFixed(2);
}

/**
 * Typed decimal → integer minor units, by string arithmetic only.
 *
 * parseFloat("0.29") * 100 is 28.999999999999996, and rounding that is how a
 * price ends up a cent out. Splitting on the decimal point keeps every digit an
 * integer, so the value that reaches the server is exactly what was typed.
 * Returns undefined for anything that is not a plain amount.
 */
export function inputToMinor(input) {
  const raw = String(input ?? '').trim().replace(/[,\s]/g, '');
  if (!raw) return undefined;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) return undefined;
  const [, whole, fraction = ''] = match;
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
}

/** Mirrors base44/shared/partnerCatalogue.ts::derivePricingStatus. */
export function deriveStatus(card, now = new Date()) {
  const stored = card?.pricing_status || 'PARTNER_SUBMITTED';
  if (stored === 'WITHDRAWN' || stored === 'QUOTE_CONFIRMED') return stored;
  if (card?.status === 'withdrawn') return 'WITHDRAWN';

  if (card?.valid_until) {
    const end = new Date(`${card.valid_until}T23:59:59Z`);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) return 'EXPIRED';
  }
  if (stored === 'CURRENT_PARTNER_CONFIRMED' && card?.next_review_at) {
    const due = new Date(card.next_review_at);
    if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) return 'STALE';
  }
  return stored;
}

export function isQuotable(card) {
  const status = deriveStatus(card);
  return card?.status === 'active' && !['EXPIRED', 'WITHDRAWN'].includes(status);
}

export function daysUntil(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / 86_400_000);
}