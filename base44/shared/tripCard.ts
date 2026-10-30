/**
 * tripCard — the pure rules behind the printed trip QR card.
 *
 * Nothing here touches the database, the network, or a model. Every decision
 * is a function of its arguments, so the same scan replays the same way and no
 * language model ever sits between a stranger and a request for help.
 *
 * The three rules that matter most:
 *   1. The token is emergency-only. It can open or rejoin ONE request for ONE
 *      trip. It can never read a record, never move a case, never answer for
 *      the traveller.
 *   2. The card's life follows the ACTUAL trip end, not the scheduled one. A
 *      delayed flight or an extended recovery must not kill a card while the
 *      traveller is still in the country.
 *   3. Arrival is a GPS fact that landed on the server, never a driver's tap.
 */

// ── Token ─────────────────────────────────────────────────────────────────────

export const TRIP_CARD_KIND = 'tripcard';

/** A card stays live for 24 hours past the end of the trip it belongs to. */
export const TRIP_END_GRACE_MS = 24 * 60 * 60 * 1000;

export class TripCardSecretMissing extends Error {
  constructor() {
    super(
      'PORTAL_TOKEN_SECRET is not set. Trip card tokens cannot be signed or verified ' +
      'without it. There is deliberately no default — a published default is a forgeable key.',
    );
  }
}

function tripCardSecret(): string {
  const s = Deno.env.get('PORTAL_TOKEN_SECRET');
  if (!s || s === 'change-me-in-production') throw new TripCardSecretMissing();
  return s;
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(tripCardSecret()),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TripCardTokenPayload {
  k: string;
  card_id: string;
  trip_id: string;
  country: string;
  lang: string;
  iat: number;
  exp: number;
}

/**
 * The token carries an `exp`, but it is NOT the authority: the card row's live
 * `expires_at` is. That separation is the whole point of Boardy's change — a
 * trip that moves extends the card in the database, and the QR already printed
 * and stuck to a passport keeps working without being reissued.
 */
export async function signTripCardToken(params: {
  cardId: string;
  tripId: string;
  country: string;
  lang: string;
  expiresAtMs: number;
}): Promise<string> {
  const payload: TripCardTokenPayload = {
    k: TRIP_CARD_KIND,
    card_id: params.cardId,
    trip_id: params.tripId,
    country: String(params.country || '').toUpperCase(),
    lang: params.lang,
    iat: Date.now(),
    exp: params.expiresAtMs,
  };
  const data = JSON.stringify(payload);
  return `${btoa(data)}.${await hmacHex(data)}`;
}

export async function verifyTripCardToken(token: string): Promise<TripCardTokenPayload | null> {
  const raw = String(token || '').trim();
  if (!raw || !raw.includes('.')) return null;

  const [encoded, sig] = raw.split('.');
  if (!encoded || !sig) return null;

  let data: string;
  let payload: TripCardTokenPayload;
  try {
    data = atob(encoded);
    payload = JSON.parse(data);
  } catch {
    return null;
  }

  if (!payload || payload.k !== TRIP_CARD_KIND) return null;
  if (!payload.card_id || !payload.trip_id) return null;

  let expected: string;
  try {
    expected = await hmacHex(data);
  } catch {
    return null;
  }

  // Constant-time-ish compare: equal length first, then every character.
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  return payload;
}

// ── Expiry follows the trip ───────────────────────────────────────────────────

/**
 * The trip's real end. Nothing here may shorten a card: a cleared date field
 * must never be the reason a card died while the traveller was still abroad.
 */
export function deriveTripEnd(params: {
  storedEnd?: string | null;
  procedureDate?: string | null;
  departureDate?: string | null;
  recoveryDays?: number | null;
}): { tripEnd: string; source: 'stored' | 'case_derived' } {
  const candidates: number[] = [];

  const stored = params.storedEnd ? new Date(params.storedEnd).getTime() : NaN;
  if (Number.isFinite(stored)) candidates.push(stored);

  const derived: number[] = [];
  const procedure = params.procedureDate ? new Date(params.procedureDate).getTime() : NaN;
  const recovery = Number(params.recoveryDays);
  if (Number.isFinite(procedure)) {
    const days = Number.isFinite(recovery) && recovery > 0 ? recovery : 1;
    derived.push(procedure + days * 24 * 60 * 60 * 1000);
  }

  const departure = params.departureDate ? new Date(params.departureDate).getTime() : NaN;
  if (Number.isFinite(departure)) derived.push(departure);

  const derivedMax = derived.length ? Math.max(...derived) : NaN;
  if (Number.isFinite(derivedMax)) candidates.push(derivedMax);

  if (!candidates.length) {
    // No dates at all: keep whatever was stored, otherwise a card with no trip
    // date would silently expire on its issue day.
    const fallback = Number.isFinite(stored)
      ? new Date(stored).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return { tripEnd: fallback, source: 'stored' };
  }

  const max = Math.max(...candidates);
  return {
    tripEnd: new Date(max).toISOString(),
    source: Number.isFinite(derivedMax) && derivedMax >= max && derivedMax > (Number.isFinite(stored) ? stored : -Infinity)
      ? 'case_derived'
      : 'stored',
  };
}

export function expiresAtForTripEnd(tripEnd: string): string {
  const t = new Date(tripEnd).getTime();
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + TRIP_END_GRACE_MS).toISOString();
}

// ── Arrival deadline ──────────────────────────────────────────────────────────

const TEN_MIN = 10 * 60 * 1000;
const TWENTY_FIVE_MIN = 25 * 60 * 1000;

/**
 * The buffer Boardy specified: max(10 min, half the quoted ETA), capped at 25.
 *
 * A flat ten minutes is the wrong shape — on a six-minute drive it is nearly
 * three times the trip, and on a forty-minute run across Caracas it is nothing.
 * Erring tight is deliberate: missing the deadline costs a second offer and a
 * care-team page, while being generous costs minutes where nobody is moving.
 *
 * An unknown ETA gets the buffer only, no invented travel time. That is the
 * tight end, which is the side we chose.
 */
export function arrivalBufferSeconds(etaSeconds: number | null | undefined): number {
  const eta = Number(etaSeconds);
  if (!Number.isFinite(eta) || eta <= 0) return TEN_MIN / 1000;
  const half = eta / 2;
  return Math.min(TWENTY_FIVE_MIN / 1000, Math.max(TEN_MIN / 1000, half));
}

/**
 * Measured from the moment the driver accepted — not from when the offer went
 * out. The ETA only starts existing when he says yes.
 */
export function arrivalDeadlineAt(
  acceptedAt: string,
  etaSeconds: number | null | undefined,
): string {
  const t = new Date(acceptedAt).getTime();
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + arrivalBufferSeconds(etaSeconds) * 1000).toISOString();
}

export function arrivalTotalSeconds(etaSeconds: number | null | undefined): number {
  const eta = Number(etaSeconds);
  const travel = Number.isFinite(eta) && eta > 0 ? eta : 0;
  return Math.round(travel + arrivalBufferSeconds(etaSeconds));
}

export function isArrivalDeadlineMissed(
  offer: {
    status?: string;
    accepted_at?: string | null;
    arrival_deadline_at?: string | null;
    arrived_at?: string | null;
    arrival_deadline_missed_at?: string | null;
  },
  now: string | number,
): boolean {
  if (!offer || offer.status !== 'ACCEPTED') return false;
  if (offer.arrived_at) return false;
  if (offer.arrival_deadline_missed_at) return false;
  if (!offer.arrival_deadline_at) return false;
  const deadline = new Date(offer.arrival_deadline_at).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(deadline) || !Number.isFinite(n)) return false;
  return deadline <= n;
}

// ── Arrival is a place, not a button ──────────────────────────────────────────

/** How close the driver's phone has to be to the confirmed destination. */
export const ARRIVAL_RADIUS_METERS = 300;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function validCoordinate(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  if (a === 0 && b === 0) return null;
  return { lat: a, lng: b };
}

// ── False-alarm closure ───────────────────────────────────────────────────────

/**
 * A reason is mandatory, and one of them is the common case Boardy named: a
 * false alarm is usually a traveller who did not know how the card works. That
 * is a card you can fix, so the reason has to be recorded, not a free-text
 * afterthought.
 */
export const FALSE_ALARM_REASONS = [
  { code: 'traveller_confirmed_well', label: 'Traveller confirmed safe by phone', en: 'Traveller confirmed safe by phone' },
  { code: 'guardian_confirmed_no_emergency', label: 'Guardian confirmed no emergency', en: 'Guardian confirmed no emergency' },
  { code: 'card_misunderstood', label: 'Card tapped without understanding it', en: 'Card tapped without understanding it' },
  { code: 'accidental_tap', label: 'Accidental tap by a bystander', en: 'Accidental tap by a bystander' },
  { code: 'issue_already_handled', label: 'Issue already being handled elsewhere', en: 'Issue already being handled elsewhere' },
];

export function isValidFalseAlarmReason(code: string): boolean {
  return FALSE_ALARM_REASONS.some((r) => r.code === code);
}

/**
 * A closure is only valid once a human actually spoke to the traveller or the
 * guardian. "Could not reach anyone" is not a closure — it holds at one live
 * offer. The contact timestamp is part of the proof, not decoration.
 */
export function closureContactValid(params: {
  contactParty?: string | null;
  contactAt?: string | null;
  contactMethod?: string | null;
  now: string;
}): { valid: boolean; reason?: string } {
  const party = String(params.contactParty || '');
  if (party !== 'traveller' && party !== 'guardian') {
    return { valid: false, reason: 'A closure needs documented contact with the traveller or the guardian.' };
  }
  const method = String(params.contactMethod || '').trim();
  if (!method) {
    return { valid: false, reason: 'Record how the contact happened (call, WhatsApp, in person).' };
  }
  const at = params.contactAt ? new Date(params.contactAt).getTime() : NaN;
  if (!Number.isFinite(at)) {
    return { valid: false, reason: 'Record when the contact happened.' };
  }
  if (at > new Date(params.now).getTime() + 5 * 60 * 1000) {
    return { valid: false, reason: 'The contact time is in the future.' };
  }
  return { valid: true };
}

/** The recall fee. Paying it is what keeps a 3am yes from becoming a coin flip. */
export const DRIVER_RECALL_FEE_USD = 10;

// ── Language ──────────────────────────────────────────────────────────────────

const COUNTRY_LANGUAGE: Record<string, string> = {
  VE: 'es', MX: 'es', CO: 'es', ES: 'es', DO: 'es', AR: 'es', CL: 'es', PE: 'es', EC: 'es', CR: 'es', PA: 'es', CU: 'es', UY: 'es', PY: 'es', BO: 'es', GT: 'es', HN: 'es', SV: 'es', NI: 'es',
  BR: 'pt', PT: 'pt',
  FR: 'fr', BE: 'fr', MC: 'fr', SN: 'fr', CI: 'fr',
  IT: 'it',
  DE: 'de', AT: 'de', CH: 'de',
  TR: 'tr',
  TH: 'th',
  AE: 'ar', SA: 'ar', EG: 'ar', MA: 'ar', QA: 'ar', JO: 'ar', KW: 'ar',
  CN: 'zh', TW: 'zh', SG: 'zh', HK: 'zh',
  JP: 'en', GB: 'en', US: 'en', IE: 'en', AU: 'en', NZ: 'en', CA: 'en', ZA: 'en', IN: 'en', JM: 'en', TT: 'en', BB: 'en',
};

export const SUPPORTED_LANGUAGES = ['es', 'pt', 'fr', 'it', 'de', 'tr', 'th', 'ar', 'zh', 'en'];

export function languageForCountry(countryCode: string | null | undefined): string {
  const code = String(countryCode || '').toUpperCase();
  return COUNTRY_LANGUAGE[code] || 'en';
}

export function isRtl(lang: string): boolean {
  return lang === 'ar';
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}