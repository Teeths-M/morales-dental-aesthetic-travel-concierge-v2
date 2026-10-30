/**
 * surroundings — the deterministic policy engine behind M-Care's "Around You"
 * awareness layer.
 *
 * WHY THIS FILE EXISTS AND WHY IT CONTAINS NO AI CALL
 * A safety claim about where a traveller is standing has to be reproducible and
 * explainable after the fact. Every rule below is a pure function of stored
 * facts — a source, two timestamps, a reported level, a coordinate — so the same
 * record always produces the same warning, and "why did M-Care say that?" is
 * answered by reading data rather than re-running a model.
 *
 * THE FOUR RULES THIS FILE ENFORCES
 * 1. Never invent. There is no path here that manufactures an incident. No
 *    alert record means no alert, and the caller must say so plainly.
 * 2. Never upgrade an unverified report. A public report or a news item can be
 *    a CAUTION at most; it can never become a WARNING or URGENT on its own.
 * 3. Never present stale information as live. A record that has not been
 *    re-checked inside its level's window is downgraded, and one that is long
 *    past it is reduced to INFORMATION with the staleness stated.
 * 4. Never describe a place, only an event and its distance. There is no
 *    neighbourhood score anywhere in this module, deliberately — an isolated
 *    report about a street is not a statement about the people who live there.
 */

export type AlertLevel = 'information' | 'caution' | 'warning' | 'urgent';

export const LEVEL_ORDER: AlertLevel[] = ['information', 'caution', 'warning', 'urgent'];

export const LEVEL_RANK: Record<AlertLevel, number> = {
  information: 0,
  caution: 1,
  warning: 2,
  urgent: 3,
};

export const LEVEL_LABEL: Record<AlertLevel, string> = {
  information: 'Information',
  caution: 'Caution',
  warning: 'Warning',
  urgent: 'Urgent',
};

/** Plain-language meaning, shown next to the badge so a level is never a mystery. */
export const LEVEL_MEANING: Record<AlertLevel, string> = {
  information: 'Useful local guidance. Nothing you need to act on right now.',
  caution: 'A developing situation nearby. Worth knowing before you set out.',
  warning: 'A credible risk close to you or one of your saved places. Take it into account.',
  urgent: 'A significant, immediate threat, supported by information that is current and verified.',
};

/** Severity colour used by the client, kept here so server copy and UI agree. */
export const LEVEL_COLOR: Record<AlertLevel, string> = {
  information: '#7DD3FC',
  caution: '#FBBF24',
  warning: '#FB923C',
  urgent: '#EF4444',
};

// ── Categories ───────────────────────────────────────────────────────────────
// A closed list on purpose: a new kind of hazard needs a decision about how it
// is described, not a free-text field someone can type "danger" into.
export const CATEGORIES: Record<string, string> = {
  security_incident: 'Reported security incident',
  civil_unrest: 'Civil unrest or demonstration',
  road_closure: 'Road closure or transport disruption',
  severe_weather: 'Severe weather or flooding',
  official_advisory: 'Official safety advisory',
  scam_risk: 'Reported scam risk',
  restricted_area: 'Restricted or closed area',
};

export function categoryLabel(key?: string): string {
  return CATEGORIES[key || ''] || 'Local advisory';
}

// ── Sources ──────────────────────────────────────────────────────────────────
export type SourceType =
  | 'official_government'
  | 'official_local_authority'
  | 'official_transport'
  | 'official_weather'
  | 'verified_partner'
  | 'media'
  | 'public_report';

const SOURCE_LABELS: Record<SourceType, string> = {
  official_government: 'Government source',
  official_local_authority: 'Local authority',
  official_transport: 'Transport authority',
  official_weather: 'Meteorological service',
  verified_partner: 'Verified M-Care partner',
  media: 'News report',
  public_report: 'Public report (unverified)',
};

const VERIFIED_SOURCES = new Set<string>([
  'official_government',
  'official_local_authority',
  'official_transport',
  'official_weather',
  'verified_partner',
]);

export const SOURCE_TYPE_KEYS = Object.keys(SOURCE_LABELS);

export function sourceLabel(type?: string): string {
  return SOURCE_LABELS[type as SourceType] || 'Unspecified source';
}

export function isVerifiedSource(type?: string): boolean {
  return VERIFIED_SOURCES.has(String(type || ''));
}

/** What the UI prints under the SOURCE heading — never a bare "verified". */
export function verificationLabel(type?: string, independentlyConfirmed = false): string {
  if (isVerifiedSource(type)) return 'Verified source';
  if (independentlyConfirmed) return 'Independently confirmed';
  return 'Unverified — treat as a report, not a fact';
}

// ── Freshness ────────────────────────────────────────────────────────────────
// How long a record of each level may be called "current" before it must be
// re-checked. Tighter windows for the louder claims: an URGENT that is an hour
// old is no longer an urgent.
const MAX_AGE_MINUTES: Record<AlertLevel, number> = {
  information: 24 * 60,
  caution: 6 * 60,
  warning: 3 * 60,
  urgent: 60,
};

export type FreshnessStatus = 'live' | 'aging' | 'stale' | 'unknown';

export type Freshness = {
  status: FreshnessStatus;
  age_minutes: number | null;
  max_age_minutes: number;
  label: string;
  checked_at: string | null;
};

export function describeAge(minutes: number | null): string {
  if (minutes == null) return 'time unknown';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function evaluateFreshness(alert: any, nowMs: number = Date.now()): Freshness {
  const reportedLevel = (LEVEL_ORDER.includes(alert?.level) ? alert.level : 'information') as AlertLevel;
  const maxAge = MAX_AGE_MINUTES[reportedLevel] || MAX_AGE_MINUTES.information;
  const checkedAt: string | null = alert?.last_checked_at || alert?.reported_at || null;
  const parsed = checkedAt ? Date.parse(checkedAt) : NaN;

  if (Number.isNaN(parsed)) {
    return {
      status: 'unknown',
      age_minutes: null,
      max_age_minutes: maxAge,
      label: 'Not yet confirmed as current',
      checked_at: null,
    };
  }

  const age = Math.max(0, Math.round((nowMs - parsed) / 60000));
  const base = { age_minutes: age, max_age_minutes: maxAge, checked_at: checkedAt };

  if (age <= maxAge) {
    return { ...base, status: 'live', label: `Checked ${describeAge(age)}` };
  }
  if (age <= maxAge * 3) {
    return { ...base, status: 'aging', label: `Last checked ${describeAge(age)} — not re-confirmed since` };
  }
  return { ...base, status: 'stale', label: `Last checked ${describeAge(age)} — this may no longer be current` };
}

// ── Level derivation ─────────────────────────────────────────────────────────
const DOWNGRADE: Record<AlertLevel, AlertLevel> = {
  information: 'information',
  caution: 'information',
  warning: 'caution',
  urgent: 'warning',
};

export type DerivedLevel = {
  level: AlertLevel;
  reported_level: AlertLevel;
  downgraded: boolean;
  reasons: string[];
  freshness: Freshness;
  source_verified: boolean;
};

/**
 * Takes what the source claimed and returns what M-Care is allowed to say.
 * Anything that reduces the level also records why, so the UI can show the
 * reason instead of silently contradicting the source.
 */
export function deriveLevel(alert: any, nowMs: number = Date.now()): DerivedLevel {
  const reasons: string[] = [];
  const reported = (LEVEL_ORDER.includes(alert?.level) ? alert.level : 'information') as AlertLevel;
  let level = reported;

  const sourceVerified = isVerifiedSource(alert?.source_type) || alert?.independently_confirmed === true;
  if (!sourceVerified && LEVEL_RANK[level] > LEVEL_RANK.caution) {
    level = 'caution';
    reasons.push('the source is not official and the report is not independently confirmed');
  }
  if (alert?.confidence === 'low' && LEVEL_RANK[level] > LEVEL_RANK.caution) {
    level = 'caution';
    reasons.push('the report is marked low confidence');
  }

  const freshness = evaluateFreshness(alert, nowMs);
  if (freshness.status === 'aging' && LEVEL_RANK[level] > LEVEL_RANK.information) {
    level = DOWNGRADE[level];
    reasons.push('it has not been re-checked inside its freshness window');
  }
  if (freshness.status === 'stale') {
    level = 'information';
    reasons.push('the information is stale');
  }
  if (freshness.status === 'unknown') {
    level = 'information';
    reasons.push('freshness has not been confirmed');
  }

  return {
    level,
    reported_level: reported,
    downgraded: level !== reported,
    reasons,
    freshness,
    source_verified: sourceVerified,
  };
}

// ── Quiet hours ──────────────────────────────────────────────────────────────
function toMinutes(value?: string): number | null {
  if (typeof value !== 'string') return null;
  const [h, m] = value.split(':');
  const hours = Number(h);
  const mins = Number(m || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return Math.min(1439, Math.max(0, hours * 60 + mins));
}

function localMinutes(now: Date, timeZone?: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || undefined,
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  } catch {
    return null;
  }
}

/**
 * Quiet hours are OBSERVED IN THE DESTINATION'S CLOCK, not the phone's — a
 * traveller in Bogotá should not be woken because their app still thinks it is
 * Port of Spain. A missing/invalid zone falls back to the device's own clock
 * rather than silently disabling the window.
 */
export function quietHoursActive(settings: any, now: Date = new Date()): boolean {
  if (!settings?.quiet_hours_enabled) return false;
  const start = toMinutes(settings.quiet_hours_start);
  const end = toMinutes(settings.quiet_hours_end);
  if (start == null || end == null || start === end) return false;

  const minutes = localMinutes(now, settings.quiet_hours_timezone);
  if (minutes == null) return false;

  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

// ── Geometry ─────────────────────────────────────────────────────────────────
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function distanceLabel(meters: number | null): string | null {
  if (meters == null) return null;
  if (meters < 250) return 'less than 250 m';
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/** How far out each level is worth interrupting someone for. */
export const RELEVANCE_RADIUS_M: Record<AlertLevel, number> = {
  information: 1200,
  caution: 2000,
  warning: 3000,
  urgent: 4000,
};

/** A saved place is treated as "you care about this spot" within this radius. */
const PLACE_RADIUS_M = 1500;

export type RelevantAlert = {
  alert: any;
  level: AlertLevel;
  reported_level: AlertLevel;
  level_reasons: string[];
  freshness: Freshness;
  source_verified: boolean;
  distance_m: number | null;
  distance_label: string | null;
  matched_place: { id: string; label: string; kind: string } | null;
  proximity: 'position' | 'saved_visit' | 'saved_avoid' | 'country_only';
};

/**
 * The single relevance decision. Returns only alerts that genuinely bear on
 * where this traveller is, on a place they saved, or — when there is no
 * position at all — on their trip country, and in that last case the level is
 * capped at CAUTION because "somewhere in the country" cannot support more.
 */
export function selectRelevantAlerts(params: {
  alerts: any[];
  latitude?: number | null;
  longitude?: number | null;
  places?: any[];
  country?: string | null;
  nowMs?: number;
  minLevel?: AlertLevel;
}): RelevantAlert[] {
  const { alerts, latitude, longitude, places = [], country, nowMs = Date.now(), minLevel = 'information' } = params;
  const minRank = LEVEL_RANK[minLevel] ?? 0;
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);
  const out: RelevantAlert[] = [];

  for (const alert of alerts || []) {
    if (!alert || alert.status !== 'active') continue;
    if (alert.expires_at && Date.parse(alert.expires_at) < nowMs) continue;

    const derived = deriveLevel(alert, nowMs);
    if (LEVEL_RANK[derived.level] < minRank) continue;

    const alertHasPoint = Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude);
    let distance: number | null = null;
    let matchedPlace: RelevantAlert['matched_place'] = null;
    let proximity: RelevantAlert['proximity'] = 'country_only';

    if (hasPoint && alertHasPoint) {
      distance = haversineMeters(latitude as number, longitude as number, alert.latitude, alert.longitude);
      proximity = 'position';
    }

    if (alertHasPoint) {
      for (const place of places || []) {
        const pLat = Number(place?.latitude);
        const pLng = Number(place?.longitude);
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;
        const d = haversineMeters(pLat, pLng, alert.latitude, alert.longitude);
        if (d <= PLACE_RADIUS_M && (distance == null || d < distance)) {
          distance = d;
          matchedPlace = { id: place.id, label: place.label, kind: place.kind };
          proximity = place.kind === 'avoid' ? 'saved_avoid' : 'saved_visit';
        }
      }
    }

    let level = derived.level;
    const reasons = [...derived.reasons];

    if (distance == null) {
      if (!country || String(alert.country || '').toLowerCase() !== String(country).toLowerCase()) continue;
      if (LEVEL_RANK[level] > LEVEL_RANK.caution) {
        level = 'caution';
        reasons.push('it applies to your trip country generally, not to a location you are at');
      }
    } else {
      const radius = Math.max(RELEVANCE_RADIUS_M[level], Number(alert.radius_m) || 0);
      if (distance > radius) continue;
    }

    out.push({
      alert,
      level,
      reported_level: derived.reported_level,
      level_reasons: reasons,
      freshness: derived.freshness,
      source_verified: derived.source_verified,
      distance_m: distance,
      distance_label: distanceLabel(distance),
      matched_place: matchedPlace,
      proximity,
    });
  }

  return out.sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || (a.distance_m ?? 1e12) - (b.distance_m ?? 1e12),
  );
}

// ── Copy ─────────────────────────────────────────────────────────────────────
function trimPeriod(text: string): string {
  return String(text || '').trim().replace(/[.\s]+$/, '');
}

/**
 * The one sentence a traveller reads. Built only from stored fields: the
 * headline as the source gave it, real distance, real timestamps, real source.
 * The suggested action comes from the record — never generated here, because an
 * action invented at display time cannot be reviewed before someone follows it.
 */
export function composeAlertMessage(item: RelevantAlert): string {
  const alert = item.alert;
  const headline = trimPeriod(alert.headline);
  const source = sourceLabel(alert.source_type);
  const checked = item.freshness.age_minutes != null
    ? `last checked ${describeAge(item.freshness.age_minutes)}`
    : 'freshness not confirmed';

  let where: string;
  if (item.distance_m != null) {
    where = item.matched_place
      ? `about ${item.distance_label} from ${item.matched_place.label}`
      : `about ${item.distance_label} from where you are`;
  } else if (alert.area_label) {
    where = `in ${alert.area_label}`;
  } else {
    where = `in ${alert.country || 'your destination'}`;
  }

  const opening = `${headline}. This is a ${categoryLabel(alert.category).toLowerCase()} ${where} (${checked}; ${source}).`;
  const action = alert.suggested_action ? ` ${trimPeriod(alert.suggested_action)}.` : '';
  const caveat = item.proximity === 'country_only'
    ? ' It covers your destination generally, so check whether it applies to your area.'
    : '';

  return `${opening}${action}${caveat}`.trim();
}

export function composePushTitle(level: AlertLevel): string {
  if (level === 'urgent') return 'M-Care — urgent nearby alert';
  if (level === 'warning') return 'M-Care — nearby warning';
  if (level === 'caution') return 'M-Care — worth knowing nearby';
  return 'M-Care — around you';
}

/** Delivery wave for a level: chat bubble and/or push, decided by priority. */
export function deliveryFor(level: AlertLevel): { journey: boolean; push: boolean; priority: 'low' | 'medium' | 'high' | 'critical' } {
  if (level === 'urgent') return { journey: true, push: true, priority: 'critical' };
  if (level === 'warning') return { journey: true, push: true, priority: 'high' };
  if (level === 'caution') return { journey: false, push: true, priority: 'medium' };
  return { journey: false, push: false, priority: 'low' };
}

/** Stable per-recipient dedupe handle: one delivery per alert per person. */
export function noticeDedupeKey(alertId: string, email: string): string {
  return `surroundings:${alertId}:${String(email || '').toLowerCase()}`;
}

export function placeKindLabel(kind?: string): string {
  return kind === 'avoid' ? 'Avoid' : 'Want to visit';
}