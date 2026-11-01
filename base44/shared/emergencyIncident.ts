/**
 * emergencyIncident — the deterministic decision layer for a confirmed SOS.
 *
 * Everything here is a pure function of its arguments: no model call, no
 * randomness, no network, no wall-clock read that isn't passed in. That is what
 * makes the incident record auditable — the same inputs always produce the same
 * verdict, so a screen that said "security response not confirmed" at 03:14 can
 * be explained months later.
 *
 * The rules it encodes, in order of how badly they hurt if broken:
 *
 *   1. A missing location never blocks an alert. A traveller who cannot get a
 *      GPS fix is in more danger, not less.
 *   2. A network-derived or manually typed position is never labelled as live
 *      GPS, and an old precise fix is never labelled current.
 *   3. A message that was SENT is never a response. Only a human acknowledgement
 *      can raise capability above UNAVAILABLE.
 *   4. External response is unavailable unless a two-person-approved profile
 *      covers the destination, at that hour, with a verified contact and a real
 *      channel. Defaulting to optimism here is the one thing that could get
 *      somebody killed.
 */

// ── States ────────────────────────────────────────────────────────────────────

export type RecipientStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'ESCALATED';

export type TransportState =
  | 'REQUESTED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'UNAVAILABLE'
  | 'FAILED'
  | 'CANCELLED';

export type ResponseCapability = 'unavailable' | 'unconfirmed' | 'confirmed';
export type LocationSource = 'gps' | 'network' | 'manual' | 'none';
export type LocationFreshness = 'current' | 'stale' | 'unknown' | 'unavailable';

// ── Recipient state machine ───────────────────────────────────────────────────

/**
 * An explicit table, not a rank comparison. A rank comparison would let
 * QUEUED jump to ACKNOWLEDGED, which is how a fabricated "a human answered"
 * gets stored. Each step must be the next real step, and the responder steps
 * branch off only from a delivered/acknowledged row.
 */
const RECIPIENT_TRANSITIONS: Record<RecipientStatus, RecipientStatus[]> = {
  QUEUED: ['SENT', 'FAILED', 'TIMED_OUT', 'ESCALATED'],
  SENT: ['DELIVERED', 'FAILED', 'TIMED_OUT', 'ESCALATED'],
  DELIVERED: ['ACKNOWLEDGED', 'FAILED', 'TIMED_OUT', 'ESCALATED'],
  ACKNOWLEDGED: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ESCALATED'],
  ACCEPTED: ['EN_ROUTE', 'ARRIVED', 'ESCALATED'],
  EN_ROUTE: ['ARRIVED', 'ESCALATED'],
  ARRIVED: [],
  FAILED: ['QUEUED', 'ESCALATED'],
  TIMED_OUT: ['ESCALATED', 'ACKNOWLEDGED'],
  ESCALATED: ['ACKNOWLEDGED', 'ACCEPTED'],
};

export function canAdvanceRecipient(from: RecipientStatus, to: RecipientStatus): boolean {
  if (!from || !to) return false;
  if (from === to) return false;
  return (RECIPIENT_TRANSITIONS[from] || []).includes(to);
}

/**
 * The only states in which a person on the other end is known to have engaged.
 * A responder may report en-route or arrival from ACKNOWLEDGED or ACCEPTED —
 * but never straight from SENT, because "the carrier accepted the SMS" is not
 * "a driver is coming".
 */
export function isHumanEngaged(status: RecipientStatus): boolean {
  return status === 'ACKNOWLEDGED' || status === 'ACCEPTED' || status === 'EN_ROUTE' || status === 'ARRIVED';
}

export function recipientIsTerminal(status: RecipientStatus): boolean {
  return status === 'ARRIVED';
}

// ── Transport state machine ───────────────────────────────────────────────────

const TRANSPORT_TRANSITIONS: Record<TransportState, TransportState[]> = {
  REQUESTED: ['OFFERED', 'ACCEPTED', 'UNAVAILABLE', 'FAILED', 'CANCELLED'],
  OFFERED: ['ACCEPTED', 'UNAVAILABLE', 'FAILED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'ARRIVED', 'FAILED', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'FAILED', 'CANCELLED'],
  ARRIVED: ['CANCELLED'],
  UNAVAILABLE: ['REQUESTED', 'CANCELLED'],
  FAILED: ['REQUESTED', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransitionTransport(from: TransportState, to: TransportState): boolean {
  if (!from || !to) return false;
  if (from === to) return false;
  return (TRANSPORT_TRANSITIONS[from] || []).includes(to);
}

/**
 * A request is "secured" only when a named driver has accepted it. Everything
 * before that is a request, an offer or an unanswered ring — and the screen
 * language follows this function rather than the optimistic word.
 */
export function transportIsSecured(state: TransportState): boolean {
  return state === 'ACCEPTED' || state === 'EN_ROUTE' || state === 'ARRIVED';
}

// ── Location integrity ────────────────────────────────────────────────────────

export const DEFAULT_LOCATION_THRESHOLDS = {
  /** Older than this and the fix is stale, whatever its accuracy. */
  stale_after_seconds: 300,
  /** GPS readings worse than this are described as coarse, not precise. */
  precise_accuracy_m: 100,
};

export interface LocationInput {
  source?: LocationSource | null;
  captured_at?: string | null;
  accuracy_m?: number | null;
}

export interface LocationVerdict {
  source: LocationSource;
  freshness: LocationFreshness;
  age_seconds: number | null;
  accuracy_m: number | null;
  /** 'precise' | 'coarse' | 'unknown' — how the accuracy should be described. */
  precision: 'precise' | 'coarse' | 'unknown';
  /** True only for a current position. Never used to decide whether to alert. */
  is_current: boolean;
  /** The sentence a screen may show. Deliberately literal. */
  label: string;
}

/**
 * The single place a position is judged.
 *
 * A missing position returns freshness 'unavailable' and is_current false — and
 * nothing about this function is allowed to stop an incident being created.
 */
export function evaluateLocationIntegrity(
  input: LocationInput | null | undefined,
  now: string | number = Date.now(),
  thresholds: { stale_after_seconds?: number; precise_accuracy_m?: number } = {},
): LocationVerdict {
  const staleAfter = thresholds.stale_after_seconds ?? DEFAULT_LOCATION_THRESHOLDS.stale_after_seconds;
  const preciseM = thresholds.precise_accuracy_m ?? DEFAULT_LOCATION_THRESHOLDS.precise_accuracy_m;

  const source: LocationSource = (input?.source as LocationSource) || 'none';
  const accuracy = typeof input?.accuracy_m === 'number' && Number.isFinite(input.accuracy_m)
    ? input.accuracy_m
    : null;

  if (source === 'none') {
    return {
      source: 'none',
      freshness: 'unavailable',
      age_seconds: null,
      accuracy_m: accuracy,
      precision: 'unknown',
      is_current: false,
      label: 'No position was captured. The alert still went out.',
    };
  }

  const nowMs = new Date(now).getTime();
  const capturedMs = input?.captured_at ? new Date(input.captured_at).getTime() : NaN;

  if (!Number.isFinite(capturedMs) || !Number.isFinite(nowMs)) {
    return {
      source,
      freshness: 'unknown',
      age_seconds: null,
      accuracy_m: accuracy,
      precision: accuracy === null ? 'unknown' : accuracy <= preciseM ? 'precise' : 'coarse',
      is_current: false,
      label: 'Position age unknown — do not treat it as current.',
    };
  }

  const ageSeconds = Math.max(0, Math.round((nowMs - capturedMs) / 1000));
  const ageHours = Math.floor(ageSeconds / 3600);
  const ageMinutes = Math.round(ageSeconds / 60);

  // A typed address has no age and no accuracy: it is what someone wrote down.
  if (source === 'manual') {
    return {
      source,
      freshness: ageSeconds <= staleAfter ? 'current' : 'stale',
      age_seconds: ageSeconds,
      accuracy_m: null,
      precision: 'unknown',
      is_current: ageSeconds <= staleAfter,
      label: 'Location entered by hand — no accuracy recorded.',
    };
  }

  if (source === 'network') {
    return {
      source,
      freshness: ageSeconds <= staleAfter ? 'current' : 'stale',
      age_seconds: ageSeconds,
      accuracy_m: accuracy,
      precision: 'coarse',
      is_current: ageSeconds <= staleAfter,
      label: ageSeconds <= staleAfter
        ? 'Approximate position from the network — may be several kilometres out.'
        : `Approximate position from the network, ${ageMinutes}m old.`,
    };
  }

  // GPS
  if (ageSeconds > staleAfter) {
    return {
      source,
      freshness: 'stale',
      age_seconds: ageSeconds,
      accuracy_m: accuracy,
      precision: accuracy === null ? 'unknown' : accuracy <= preciseM ? 'precise' : 'coarse',
      is_current: false,
      label: `Last GPS fix ${ageHours >= 1 ? `${ageHours}h` : `${ageMinutes}m`} old — no longer a current position.`,
    };
  }

  return {
    source,
    freshness: 'current',
    age_seconds: ageSeconds,
    accuracy_m: accuracy,
    precision: accuracy === null ? 'unknown' : accuracy <= preciseM ? 'precise' : 'coarse',
    is_current: true,
    label: accuracy === null
      ? 'Current GPS fix, accuracy not stated.'
      : `Current GPS fix, ±${Math.round(accuracy)} m.`,
  };
}

// ── On-duty evaluation ────────────────────────────────────────────────────────

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Local weekday + minute-of-day in a specific IANA zone, without a date library.
 * Returns null rather than guessing when the zone is invalid — an unknown clock
 * must not silently read as "on duty".
 */
export function localMinuteOfWeek(
  at: string | number,
  timeZone: string,
): { dayKey: string; minute: number } | null {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const weekday = (get('weekday') || '').toLowerCase().slice(0, 3);
    const hour = Number(get('hour') || '0') % 24; // some ICU builds emit '24'
    const minute = Number(get('minute') || '0');
    if (!WEEKDAY_KEYS.includes(weekday as any)) return null;
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { dayKey: weekday, minute: hour * 60 + minute };
  } catch (_) {
    return null;
  }
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isWithinDutyWindow(
  windows: Array<{ days?: string[]; start?: string; end?: string }> | null | undefined,
  at: string | number,
  timeZone: string,
): { on_duty: boolean; reason: string } {
  const list = Array.isArray(windows) ? windows.filter((w) => w && w.start && w.end) : [];
  if (list.length === 0) {
    return { on_duty: false, reason: 'No operational hours are configured for this team.' };
  }

  const local = localMinuteOfWeek(at, timeZone);
  if (!local) {
    return { on_duty: false, reason: 'Operational hours could not be checked against a valid time zone.' };
  }

  for (const w of list) {
    if (!HHMM_RE.test(String(w.start)) || !HHMM_RE.test(String(w.end))) continue;
    const [sh, sm] = String(w.start).split(':').map(Number);
    const [eh, em] = String(w.end).split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const days = (w.days && w.days.length > 0 ? w.days : [...WEEKDAY_KEYS]).map((d) => String(d).toLowerCase());

    const wraps = endMin <= startMin;
    // A wrapping window belongs to the day it STARTED on, so a 22:00-06:00
    // Sunday shift still covers 02:00 on Monday.
    const startDayKey = local.dayKey;
    const prevDayIndex = (WEEKDAY_KEYS.indexOf(startDayKey as any) + 6) % 7;
    const prevDayKey = WEEKDAY_KEYS[prevDayIndex];

    if (!wraps) {
      if (days.includes(startDayKey) && local.minute >= startMin && local.minute < endMin) {
        return { on_duty: true, reason: `On duty (${w.start}-${w.end}).` };
      }
    } else {
      if (days.includes(startDayKey) && local.minute >= startMin) {
        return { on_duty: true, reason: `On duty (${w.start}-${w.end}, overnight).` };
      }
      if (days.includes(prevDayKey) && local.minute < endMin) {
        return { on_duty: true, reason: `On duty (${w.start}-${w.end}, overnight).` };
      }
    }
  }

  return { on_duty: false, reason: 'No team is on duty at this hour.' };
}

// ── Readiness gate ────────────────────────────────────────────────────────────

export interface ReadinessProfileLike {
  id?: string;
  status?: string;
  country_code?: string;
  coverage_areas?: string[] | null;
  coverage_notes?: string | null;
  team_label?: string | null;
  operational_hours?: string | null;
  on_duty_windows?: Array<{ days?: string[]; start?: string; end?: string }> | null;
  timezone?: string | null;
  authorized_contact_name?: string | null;
  authorized_contact_phone?: string | null;
  authorized_contact_email?: string | null;
  contact_verified_at?: string | null;
  communication_channels?: string[] | null;
  escalation_contact_name?: string | null;
  escalation_contact_phone?: string | null;
  escalation_contact_email?: string | null;
  escalation_tested_at?: string | null;
  response_time_assumption_minutes?: number | null;
  valid_until?: string | null;
  proposed_by?: string | null;
  approved_by?: string | null;
  approvals?: Array<{ approver_email?: string }> | null;
}

export interface ReadinessVerdict {
  capability: ResponseCapability;
  blockers: string[];
  profile_id: string | null;
  on_duty: boolean;
  in_coverage: boolean;
  approved: boolean;
  /** Human-readable assumptions shown next to a confirmed response. */
  team_name: string | null;
  operational_hours: string | null;
  response_time_assumption_minutes: number | null;
}

function normalise(s?: string | null): string {
  return String(s || '').trim().toLowerCase();
}

/**
 * Two-person approval is checked here as well as in the write path, because a
 * row written before the rule existed (or by a service-role bug) must not be
 * able to produce a confirmed response on its own.
 */
export function hasTwoPersonApproval(profile: ReadinessProfileLike | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.proposed_by || !profile.approved_by) return false;
  if (normalise(profile.proposed_by) === normalise(profile.approved_by)) return false;
  const approvals = Array.isArray(profile.approvals) ? profile.approvals : [];
  if (approvals.length > 0) {
    return approvals.some(
      (a) => a?.approver_email && normalise(a.approver_email) !== normalise(profile.proposed_by),
    );
  }
  // approved_by without an approvals entry is an older/partial row. Accept it
  // only when the two identities are genuinely different, which is checked above.
  return true;
}

export function destinationInCoverage(
  profile: ReadinessProfileLike | null | undefined,
  destination: { area_label?: string | null; country_code?: string | null },
): boolean {
  if (!profile) return false;
  const country = normalise(profile.country_code);
  const destCountry = normalise(destination?.country_code);
  if (country && destCountry && country !== destCountry) return false;

  const areas = (profile.coverage_areas || []).map(normalise).filter(Boolean);
  if (areas.length === 0) return false;

  const label = normalise(destination?.area_label);
  if (!label) {
    // No area on the incident: a country-wide claim only holds when coverage is
    // explicitly the whole country, which is what a single area equal to the
    // country name expresses. Otherwise it is unknown, and unknown is a blocker.
    return areas.includes(country);
  }
  return areas.some((a) => label.includes(a) || a.includes(label));
}

/**
 * The one function allowed to produce the word 'confirmed'.
 *
 * `acknowledged` must come from a stored recipient row whose status is
 * ACKNOWLEDGED or beyond — never from "we sent it". Everything else is a
 * checklist where a single failure means the traveller is told the truth.
 */
export function evaluateResponseReadiness(params: {
  profile: ReadinessProfileLike | null | undefined;
  destination: { area_label?: string | null; country_code?: string | null };
  now: string | number;
  acknowledged: boolean;
}): ReadinessVerdict {
  const { profile, destination } = params;
  const nowMs = new Date(params.now).getTime();
  const blockers: string[] = [];

  if (!profile) {
    return {
      capability: 'unavailable',
      blockers: ['No approved security team is configured for this destination.'],
      profile_id: null,
      on_duty: false,
      in_coverage: false,
      approved: false,
      team_name: null,
      operational_hours: null,
      response_time_assumption_minutes: null,
    };
  }

  const approvedStatus = profile.status === 'approved';
  const twoPerson = hasTwoPersonApproval(profile);
  const validUntilMs = profile.valid_until ? new Date(profile.valid_until).getTime() : NaN;
  const approvalLapsed = Number.isFinite(validUntilMs) ? validUntilMs <= nowMs : profile.status === 'expired';

  if (!approvedStatus) {
    blockers.push('The security profile for this destination has not been approved.');
  }
  if (approvedStatus && !twoPerson) {
    blockers.push('The security profile has not been approved by a second administrator.');
  }
  if (approvedStatus && approvalLapsed) {
    blockers.push('The security profile approval has expired and needs re-approval.');
  }

  const inCoverage = destinationInCoverage(profile, destination);
  if (!inCoverage) {
    blockers.push('This destination is outside the team\'s confirmed coverage.');
  }

  const duty = isWithinDutyWindow(profile.on_duty_windows, params.now, profile.timezone || 'UTC');
  if (inCoverage && !duty.on_duty) {
    blockers.push(duty.reason);
  }

  const hasContact = Boolean(profile.authorized_contact_phone || profile.authorized_contact_email);
  if (!hasContact) {
    blockers.push('No authorised contact is configured for this team.');
  } else if (!profile.contact_verified_at) {
    blockers.push('The authorised contact has never been verified.');
  }

  const channels = Array.isArray(profile.communication_channels) ? profile.communication_channels : [];
  if (channels.length === 0) {
    blockers.push('No communication channel is configured for this team.');
  }

  if (!(profile.escalation_contact_name || profile.escalation_contact_phone || profile.escalation_contact_email)) {
    blockers.push('No escalation contact is configured.');
  }

  if (!params.acknowledged && blockers.length === 0) {
    blockers.push('Nobody has acknowledged the alert yet.');
  }

  const base = {
    profile_id: profile.id || null,
    on_duty: duty.on_duty,
    in_coverage: inCoverage,
    approved: approvedStatus && twoPerson && !approvalLapsed,
    team_name: profile.team_label || null,
    operational_hours: profile.operational_hours || null,
    response_time_assumption_minutes:
      typeof profile.response_time_assumption_minutes === 'number'
        ? profile.response_time_assumption_minutes
        : null,
  };

  if (blockers.length === 0 && params.acknowledged) {
    return { capability: 'confirmed', blockers: [], ...base };
  }

  // A message has gone out (or a row exists) but the chain is incomplete. That
  // is 'unconfirmed' when a team was identifiable, 'unavailable' when the gaps
  // are structural (no approval, no coverage, no contact, no channel).
  const structural = !approvedStatus || !twoPerson || approvalLapsed || !inCoverage || !hasContact || channels.length === 0;
  return {
    capability: structural ? 'unavailable' : 'unconfirmed',
    blockers,
    ...base,
  };
}

// ── Deadlines and idempotency ─────────────────────────────────────────────────

export const DEFAULT_ACKNOWLEDGEMENT_DEADLINE_SECONDS = 120;

export function acknowledgementDeadlineSeconds(policy?: { acknowledgement_deadline_seconds?: number } | null): number {
  const v = policy?.acknowledgement_deadline_seconds;
  return typeof v === 'number' && v > 0 ? Math.min(v, 3600) : DEFAULT_ACKNOWLEDGEMENT_DEADLINE_SECONDS;
}

export function acknowledgementDeadline(
  confirmedAt: string | number,
  seconds: number = DEFAULT_ACKNOWLEDGEMENT_DEADLINE_SECONDS,
): string {
  const base = new Date(confirmedAt).getTime();
  const safe = Number.isFinite(base) ? base : Date.now();
  return new Date(safe + Math.max(1, seconds) * 1000).toISOString();
}

/**
 * A passed deadline with a pending acknowledgement is a timeout — recorded,
 * never left looking like an unanswered-but-pending row, and never turned into
 * an acceptance.
 */
export function isAcknowledgementOverdue(
  row: { acknowledgement_deadline_at?: string | null; acknowledgement_state?: string | null; status?: string | null },
  now: string | number,
): boolean {
  if (!row?.acknowledgement_deadline_at) return false;
  if (row.acknowledgement_state !== 'pending') return false;
  if (isHumanEngaged((row.status || 'QUEUED') as RecipientStatus)) return false;
  if (row.status === 'FAILED' || row.status === 'TIMED_OUT' || row.status === 'ESCALATED') return false;
  const deadline = new Date(row.acknowledgement_deadline_at).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(deadline) || !Number.isFinite(n)) return false;
  return deadline <= n;
}

export const INCIDENT_IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;

/**
 * Stable per confirmation. A replay of the same explicit confirmation — an
 * offline flush arriving twice, a double tap, a retried request — resolves to
 * one incident. Bucketed so a genuine second emergency hours later is a new
 * incident rather than being swallowed by the first.
 */
export function buildIncidentIdempotencyKey(params: {
  patientId: string;
  type: string;
  at: string | number;
  windowMs?: number;
}): string {
  const windowMs = params.windowMs ?? INCIDENT_IDEMPOTENCY_WINDOW_MS;
  const ts = new Date(params.at).getTime();
  const safe = Number.isFinite(ts) ? ts : 0;
  const bucket = Math.floor(safe / windowMs);
  return `${params.patientId}:${params.type}:${bucket}`;
}

/** Short human reference printed on screen. Derived, so it is stable. */
export function shortIncidentRef(id: string): string {
  const clean = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `MC-${(clean.slice(-6) || 'UNKNOWN').padStart(6, '0')}`;
}

// ── Closure ──────────────────────────────────────────────────────────────────

export const CLOSURE_REASONS = [
  'resolved_safe',
  'false_alarm',
  'handover',
  'cancelled_by_traveller',
  'care_team_closed',
] as const;

/**
 * 'handover' does NOT close the incident: it changes who owns it, and stays
 * open until that owner closes it. Treating a handover as a closure is how an
 * incident disappears while somebody is still dealing with it.
 */
export function closureClosesIncident(reason: string): boolean {
  return reason !== 'handover';
}

export function isValidClosureReason(reason: string): boolean {
  return (CLOSURE_REASONS as readonly string[]).includes(String(reason));
}