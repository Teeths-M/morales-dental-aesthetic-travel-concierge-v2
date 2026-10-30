/**
 * incidentDispatch — the deterministic core of the emergency dispatch machine.
 *
 * EVERY decision in this module is a pure function of its arguments. There is
 * no model call, no randomness, no network, and no wall-clock read that isn't
 * passed in. That is the whole point: an emergency must resolve the same way
 * every time it is replayed, and must never depend on a language model's
 * judgment.
 *
 * The two invariants that matter most:
 *   1. Notifications fan out in PARALLEL and never gate dispatch.
 *   2. Dispatch is SEQUENTIAL — exactly one live offer per incident, ever.
 *
 * Both are enforced structurally here rather than by convention in the
 * caller: `nextOfferAction` can only ever return one responder, and
 * `fanoutTargets` returns everything at once with no ordering relationship
 * to dispatch.
 */

// ── States ────────────────────────────────────────────────────────────────────

export type IncidentStatus =
  | 'OPEN'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'UNRESOLVED'
  | 'RESOLVED'
  | 'DUPLICATE_SUPPRESSED';

export type OfferStatus =
  | 'QUEUED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type NotificationStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'FAILED';

/**
 * Legal incident transitions. Anything not listed here is refused by
 * `canTransitionIncident`, so a bug elsewhere in the system cannot walk an
 * incident backwards into a state that looks resolved when it isn't.
 */
const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['DISPATCHING', 'UNRESOLVED', 'RESOLVED', 'DUPLICATE_SUPPRESSED'],
  DISPATCHING: ['ASSIGNED', 'UNRESOLVED', 'RESOLVED'],
  // ASSIGNED → ARRIVED: a driver who reaches the traveller sends a GPS
  // check-in without ever passing through an explicit "en route" write. The
  // arrival is a real fact and must not be refused by bookkeeping.
  ASSIGNED: ['EN_ROUTE', 'ARRIVED', 'DISPATCHING', 'UNRESOLVED', 'RESOLVED'],
  // EN_ROUTE → DISPATCHING: a driver can accept, go en route, and then simply
  // not arrive. Without this edge the incident would be stuck with a promise
  // that nobody is keeping, which is exactly the screen-does-nothing case.
  EN_ROUTE: ['ARRIVED', 'DISPATCHING', 'UNRESOLVED', 'RESOLVED'],
  ARRIVED: ['RESOLVED'],
  UNRESOLVED: ['ASSIGNED', 'RESOLVED'],
  RESOLVED: [],
  DUPLICATE_SUPPRESSED: [],
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;
  return (INCIDENT_TRANSITIONS[from] || []).includes(to);
}

// ── Notification display ──────────────────────────────────────────────────────

/**
 * The render contract. SENT is emphatically NOT DELIVERED — "we handed it to
 * the carrier" and "the phone showed it" are different facts, and in an
 * emergency the difference is whether someone actually knows.
 *
 * Every UI surface must go through this function rather than printing the raw
 * status, so no screen can accidentally upgrade a SENT row.
 */
export function notificationDisplayStatus(status: NotificationStatus): {
  label: string;
  delivered: boolean;
  tone: 'pending' | 'ok' | 'bad';
} {
  switch (status) {
    case 'DELIVERED':
      return { label: 'Delivered', delivered: true, tone: 'ok' };
    case 'ACKNOWLEDGED':
      return { label: 'Acknowledged', delivered: true, tone: 'ok' };
    case 'SENT':
      return { label: 'Sent — not yet confirmed delivered', delivered: false, tone: 'pending' };
    case 'FAILED':
      return { label: 'Failed', delivered: false, tone: 'bad' };
    case 'QUEUED':
    default:
      return { label: 'Queued', delivered: false, tone: 'pending' };
  }
}

/**
 * Guards a status write: an inbound provider callback (or a buggy sender)
 * may not move a notification to DELIVERED/ACKNOWLEDGED without having first
 * reached SENT. Stops a fabricated "delivered" from ever being stored.
 */
/**
 * An explicit table, not a rank comparison. A rank comparison silently allows
 * QUEUED → DELIVERED because 2 > 0 — which would let a fabricated delivery
 * land without the message ever being sent. These tests caught exactly that.
 * Each step must be the next real step.
 */
const NOTIFICATION_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  QUEUED: ['SENT', 'FAILED'],
  SENT: ['DELIVERED', 'FAILED'],
  DELIVERED: ['ACKNOWLEDGED', 'FAILED'],
  ACKNOWLEDGED: [],
  FAILED: ['QUEUED'],
};

export function canAdvanceNotification(from: NotificationStatus, to: NotificationStatus): boolean {
  if (from === to) return false;
  return (NOTIFICATION_TRANSITIONS[from] || []).includes(to);
}

// ── Idempotency ───────────────────────────────────────────────────────────────

export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * A duplicate trigger inside the same window must not open a second dispatch.
 * The key is bucketed by time so the check is a plain equality query.
 */
export function buildDedupeKey(params: {
  patientId: string;
  tripId?: string | null;
  type: string;
  at: string | number;
  windowMs?: number;
}): string {
  const windowMs = params.windowMs ?? DEDUPE_WINDOW_MS;
  const ts = new Date(params.at).getTime();
  const safeTs = Number.isFinite(ts) ? ts : 0;
  const bucket = Math.floor(safeTs / windowMs);
  return `${params.patientId}:${params.tripId || 'no-trip'}:${params.type}:${bucket}`;
}

/**
 * Two simultaneous triggers can both pass the pre-create read and both insert.
 * Rather than trusting a unique index we don't have, the winner is decided
 * deterministically after the fact: the lexicographically smallest id keeps
 * the incident, everything else suppresses itself. Same inputs, same winner,
 * on every replay.
 */
export function pickSurvivingIncident<T extends { id: string }>(incidents: T[]): T | null {
  if (!incidents || incidents.length === 0) return null;
  return [...incidents].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
}

// ── Responder ranking ─────────────────────────────────────────────────────────

export type EtaSource = 'declared' | 'unknown';

export interface RankableResponder {
  responder_id: string;
  responder_type: string;
  display_name: string;
  verification_tier: number;
  eta_seconds: number | null;
  eta_source: EtaSource;
  last_accepted_at: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Maps a partner's verification field to an ordering score. Negative means
 * "not eligible at all" — a denied or suspended agency must never appear in a
 * dispatch pool, regardless of how fast it claims to be.
 */
export function verificationTierScore(value?: string | null): number {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 0;
  if (['verified', 'approved', 'active', 'medical_provider_approved', 'partner_verified'].includes(v)) return 3;
  if (['identity_verified', 'background_verified', 'license_verified'].includes(v)) return 2;
  if (['pending', 'documents_received', 'ai_analysis_complete', 'manual_review', 'self_attested'].includes(v)) return 1;
  if (['denied', 'rejected', 'suspended', 'failed'].includes(v)) return -1;
  return 0;
}

export function isEligibleResponder(r: RankableResponder): boolean {
  return r.verification_tier >= 0;
}

/**
 * Policy order, exactly: verification tier, then ETA, then last accepted.
 * Ties fall through to responder_id so the ordering is total and stable —
 * never dependent on the order the database happened to return rows in.
 */
export function rankResponders(pool: RankableResponder[]): RankableResponder[] {
  return [...(pool || [])]
    .filter(isEligibleResponder)
    .sort((a, b) => {
      if (b.verification_tier !== a.verification_tier) return b.verification_tier - a.verification_tier;

      const aEta = a.eta_seconds == null ? Number.POSITIVE_INFINITY : a.eta_seconds;
      const bEta = b.eta_seconds == null ? Number.POSITIVE_INFINITY : b.eta_seconds;
      if (aEta !== bEta) return aEta - bEta;

      const aLast = a.last_accepted_at ? new Date(a.last_accepted_at).getTime() : -1;
      const bLast = b.last_accepted_at ? new Date(b.last_accepted_at).getTime() : -1;
      if (bLast !== aLast) return bLast - aLast;

      return String(a.responder_id).localeCompare(String(b.responder_id));
    });
}

// ── Sequential dispatch ───────────────────────────────────────────────────────

export const DEFAULT_OFFER_TIMEOUT_SECONDS = 90;
export const DEFAULT_MAX_OFFERS = 5;

export function offerExpiresAt(
  offeredAt: string,
  timeoutSeconds: number = DEFAULT_OFFER_TIMEOUT_SECONDS,
): string {
  const base = new Date(offeredAt).getTime();
  const safeBase = Number.isFinite(base) ? base : Date.now();
  return new Date(safeBase + timeoutSeconds * 1000).toISOString();
}

export function isOfferExpired(
  offer: { status: OfferStatus; expires_at?: string | null },
  now: string | number,
): boolean {
  if (offer.status !== 'OFFERED' || !offer.expires_at) return false;
  const exp = new Date(offer.expires_at).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(exp) || !Number.isFinite(n)) return false;
  return exp <= n;
}

export function nextResponder(
  ranked: RankableResponder[],
  attemptedIds: string[],
): RankableResponder | null {
  const taken = new Set(attemptedIds || []);
  return (ranked || []).find((r) => !taken.has(r.responder_id)) || null;
}

/**
 * The single gate that decides whether another offer may go out.
 * Returns at most ONE responder — there is no shape of this function that can
 * produce a broadcast, which is how "never open the job to the whole pool"
 * is guaranteed structurally rather than by review.
 */
export function nextOfferAction(params: {
  ranked: RankableResponder[];
  attemptedIds: string[];
  attemptsMade: number;
  maxOffers: number;
}): { allowed: false; reason: 'max_offers_reached' | 'pool_exhausted' } | { allowed: true; responder: RankableResponder } {
  const maxOffers = params.maxOffers ?? DEFAULT_MAX_OFFERS;
  if (params.attemptsMade >= maxOffers) {
    return { allowed: false, reason: 'max_offers_reached' };
  }
  const responder = nextResponder(params.ranked, params.attemptedIds);
  if (!responder) {
    return { allowed: false, reason: 'pool_exhausted' };
  }
  return { allowed: true, responder };
}

/**
 * Invariant check used by the engine before every offer write and asserted in
 * tests: an incident may never hold more than one live offer at a time.
 */
export function countLiveOffers(offers: { status: OfferStatus }[]): number {
  return (offers || []).filter((o) => o.status === 'OFFERED').length;
}

// ── Fanout ────────────────────────────────────────────────────────────────────

export type FanoutChannel = 'push' | 'sms' | 'email' | 'call' | 'emergency_number' | 'app';
export type FanoutRole =
  | 'patient'
  | 'guardian'
  | 'doctor'
  | 'companion'
  | 'care_team'
  | 'emergency_services'
  | 'responder';

export interface FanoutTarget {
  role: FanoutRole;
  channel: FanoutChannel;
  recipient_name?: string | null;
  recipient_ref?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Builds the complete set of notifications that must fire at t=0, all at once.
 * Deliberately returns a flat list with no sequencing: the caller fires them
 * with Promise.allSettled, and one channel failing can never delay another.
 *
 * NOTE the absence of the dispatch responder here. Responder contact is
 * dispatch, which is sequential — it must not be part of the fanout.
 */
export function buildFanoutTargets(params: {
  policy: {
    notify_roles?: string[] | null;
    requires_emergency_call?: boolean | null;
    emergency_number?: string | null;
  } | null;
  contacts: {
    patient?: { name?: string | null; phone?: string | null; email?: string | null } | null;
    guardian?: { name?: string | null; phone?: string | null; email?: string | null } | null;
    doctor?: { name?: string | null; phone?: string | null; email?: string | null } | null;
    companion?: { name?: string | null; phone?: string | null; email?: string | null } | null;
    careTeam?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  };
}): FanoutTarget[] {
  const policy = params.policy || {};
  const desired = Array.isArray(policy.notify_roles) && policy.notify_roles.length > 0
    ? policy.notify_roles
    : ['patient', 'guardian', 'doctor', 'companion', 'care_team'];

  const c = params.contacts || {};
  const targets: FanoutTarget[] = [];
  const push = (t: FanoutTarget) => targets.push(t);

  for (const role of desired) {
    const contact = c[role as keyof typeof c];
    if (!contact) continue;
    if (contact.phone) {
      push({ role: role as FanoutRole, channel: 'sms', recipient_name: contact.name, phone: contact.phone });
    }
    if (contact.email) {
      push({ role: role as FanoutRole, channel: 'email', recipient_name: contact.name, email: contact.email });
    }
    if (!contact.phone && !contact.email) {
      // Still record it as queued-and-unreachable rather than silently
      // dropping a party — an empty fanout row is a visible gap, a missing
      // row looks like nobody was supposed to be told.
      push({ role: role as FanoutRole, channel: 'app', recipient_name: contact.name });
    }
  }

  // The country emergency number is a policy decision, never automatic.
  if (policy.requires_emergency_call && policy.emergency_number) {
    push({
      role: 'emergency_services',
      channel: 'emergency_number',
      recipient_name: 'Local emergency services',
      phone: policy.emergency_number,
    });
  }

  return targets;
}

// ── Offline queue ─────────────────────────────────────────────────────────────

export interface QueuedAction {
  incident_id: string;
  offer_id?: string | null;
  action: 'accept' | 'decline' | 'acknowledge';
  occurred_at: string;
  local_seq?: number | null;
}

/**
 * Preserves the order the user actually acted in — not the order the network
 * happened to flush. Sorted by the recorded moment, then by a local sequence
 * for actions sharing a timestamp.
 */
export function orderQueuedActions(actions: QueuedAction[]): QueuedAction[] {
  return [...(actions || [])].sort((a, b) => {
    const at = new Date(a.occurred_at).getTime();
    const bt = new Date(b.occurred_at).getTime();
    const safeA = Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
    const safeB = Number.isFinite(bt) ? bt : Number.POSITIVE_INFINITY;
    if (safeA !== safeB) return safeA - safeB;
    return (a.local_seq ?? 0) - (b.local_seq ?? 0);
  });
}

/**
 * A queued action keeps the timestamp of the moment it happened. `received_at`
 * is recorded separately by the server for audit, but it never replaces the
 * occurred time — otherwise an offer accepted offline at 09:14 would look
 * like it was accepted after it had already expired at 09:15.
 */
export function resolveOccurredAt(
  action: { occurred_at?: string | null },
  receivedAt: string | number,
): { occurred_at: string; occurred_at_source: 'client' | 'server_fallback' } {
  const t = action?.occurred_at ? new Date(action.occurred_at).getTime() : NaN;
  if (Number.isFinite(t)) {
    return { occurred_at: new Date(t).toISOString(), occurred_at_source: 'client' };
  }
  return { occurred_at: new Date(receivedAt).toISOString(), occurred_at_source: 'server_fallback' };
}