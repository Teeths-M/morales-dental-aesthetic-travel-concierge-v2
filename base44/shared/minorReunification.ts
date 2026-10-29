/**
 * minorReunification — the deterministic core of the minor reunification module.
 *
 * EVERY decision here is a pure function of its arguments. No model call, no
 * randomness, no network, no ambient clock (any moment in time is passed in).
 * The reason is the same as for the dispatch machine: whether a missing child
 * is being looked for must never depend on a language model's judgment, and a
 * case must replay identically every time it is examined.
 *
 * The invariants that matter most:
 *   1. States advance strictly in order — no state may be skipped.
 *   2. ABORTED requires a human actor AND a reason code. Both, always.
 *   3. A notification's four outcomes (sent / delivered / acknowledged /
 *      answered) are separate facts with separate timestamps, never one
 *      "alerted" boolean.
 *   4. Duplicate triggers attach to the open case; they never open a second one.
 */

// ── States ────────────────────────────────────────────────────────────────────

export type ReunificationState =
  | 'TRIGGERED'
  | 'LOCATING'
  | 'NOTIFIED'
  | 'REUNITING'
  | 'HANDED_OVER'
  | 'CLOSED'
  | 'ABORTED';

export type CaseActorType = 'system' | 'human' | 'minor' | 'third_party';

export type MinorTriggerSource =
  | 'minor_help'
  | 'qr_scan'
  | 'missed_checkin'
  | 'authorised_adult';

export type MinorChannel = 'sms' | 'email' | 'call' | 'push' | 'app';

export type MinorRecipientRole =
  | 'guardian'
  | 'group_leader'
  | 'care_team'
  | 'authorised_adult'
  | 'minor';

export type MinorNotificationStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'ANSWERED'
  | 'FAILED';

export const REUNIFICATION_STATES: ReunificationState[] = [
  'TRIGGERED', 'LOCATING', 'NOTIFIED', 'REUNITING', 'HANDED_OVER', 'CLOSED', 'ABORTED',
];

/** The happy path, in order. Used by the console to show progress, not to decide anything. */
export const HAPPY_PATH: ReunificationState[] = [
  'TRIGGERED', 'LOCATING', 'NOTIFIED', 'REUNITING', 'HANDED_OVER', 'CLOSED',
];

export const TERMINAL_STATES: ReunificationState[] = ['CLOSED', 'ABORTED'];

/**
 * Legal transitions. The forward chain is strictly one step at a time —
 * TRIGGERED cannot reach NOTIFIED directly, which is what makes "no state may
 * be skipped" structurally true rather than a rule someone remembers.
 *
 * ABORTED is reachable from every non-terminal state, and from nowhere else.
 */
const TRANSITIONS: Record<ReunificationState, ReunificationState[]> = {
  TRIGGERED: ['LOCATING', 'ABORTED'],
  LOCATING: ['NOTIFIED', 'ABORTED'],
  NOTIFIED: ['REUNITING', 'ABORTED'],
  REUNITING: ['HANDED_OVER', 'ABORTED'],
  HANDED_OVER: ['CLOSED', 'ABORTED'],
  CLOSED: [],
  ABORTED: [],
};

export function canTransitionReunification(
  from: ReunificationState,
  to: ReunificationState,
): boolean {
  if (from === to) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

export function allowedReunificationNext(from: ReunificationState): ReunificationState[] {
  return [...(TRANSITIONS[from] || [])];
}

export function isTerminalReunification(state: ReunificationState): boolean {
  return TERMINAL_STATES.includes(state);
}

// ── Reason codes ──────────────────────────────────────────────────────────────

/**
 * Aborting a missing-child case is a human judgment. These are the only
 * sanctioned grounds, so an abort can never be a shrug — and every one of them
 * is a fact a reviewer can check afterwards.
 */
export const ABORT_REASON_CODES = [
  'minor_found_safe_other_means',
  'false_alarm',
  'duplicate_case',
  'minor_withdrew_from_programme',
  'family_resolved_directly',
  'handed_to_local_authority',
  'test_case',
  'care_team_decision',
] as const;

export type AbortReasonCode = typeof ABORT_REASON_CODES[number];

/** Grounds for each forward step. Optional, but recorded when supplied. */
export const TRANSITION_REASON_CODES: Record<string, string[]> = {
  'TRIGGERED->LOCATING': ['trigger_received'],
  'LOCATING->NOTIFIED': ['fanout_dispatched'],
  'NOTIFIED->REUNITING': [
    'guardian_confirmed_in_contact',
    'group_leader_confirmed_with_minor',
    'third_party_confirmed_with_minor',
    'minor_confirmed_location',
  ],
  'REUNITING->HANDED_OVER': [
    'handover_witnessed_by_adult',
    'handover_confirmed_by_guardian',
    'handover_at_designated_point',
  ],
  'HANDED_OVER->CLOSED': ['guardian_confirmed_safe', 'care_team_closed'],
};

// ── Transition validation ─────────────────────────────────────────────────────

export type TransitionRefusal =
  | 'ok'
  | 'already_terminal'
  | 'illegal_transition'
  | 'actor_must_be_human'
  | 'reason_code_required';

export interface TransitionCheck {
  allowed: boolean;
  code: TransitionRefusal;
  /** Human-readable reason, safe to show a care-team member. */
  message: string;
}

/**
 * The single gate every state change passes through. Called by the engine
 * before any write, and asserted directly in tests.
 *
 * A model cannot satisfy this: `actor_type` must be the literal 'human' for an
 * abort, and the caller that supplies 'human' is an authenticated care-team
 * session, not an agent. There is no code path that lets a model assert it.
 */
export function validateReunificationTransition(params: {
  from: ReunificationState;
  to: ReunificationState;
  actor_type: CaseActorType;
  reason_code?: string | null;
}): TransitionCheck {
  const { from, to, actor_type } = params;

  if (isTerminalReunification(from)) {
    return {
      allowed: false,
      code: 'already_terminal',
      message: `This case is already ${from.toLowerCase()} and cannot move again.`,
    };
  }

  if (!canTransitionReunification(from, to)) {
    return {
      allowed: false,
      code: 'illegal_transition',
      message: `${from} cannot go to ${to}. The next step is ${allowedReunificationNext(from).join(' or ') || 'none'}.`,
    };
  }

  if (to === 'ABORTED') {
    if (actor_type !== 'human') {
      return {
        allowed: false,
        code: 'actor_must_be_human',
        message: 'Only a care-team member can abort a case. Automation never closes one.',
      };
    }
    const code = String(params.reason_code || '').trim();
    if (!(ABORT_REASON_CODES as readonly string[]).includes(code)) {
      return {
        allowed: false,
        code: 'reason_code_required',
        message: 'Aborting needs a reason code from the approved list.',
      };
    }
  }

  return { allowed: true, code: 'ok', message: 'Allowed.' };
}

// ── Notification states ───────────────────────────────────────────────────────

/**
 * Explicit table, not a rank comparison. A rank comparison would let
 * QUEUED → ANSWERED through, which is exactly the "we marked it alerted and
 * nobody was ever contacted" failure this module exists to prevent.
 */
const NOTIFICATION_TRANSITIONS: Record<MinorNotificationStatus, MinorNotificationStatus[]> = {
  QUEUED: ['SENT', 'FAILED'],
  SENT: ['DELIVERED', 'ANSWERED', 'FAILED'],
  DELIVERED: ['ACKNOWLEDGED', 'FAILED'],
  ACKNOWLEDGED: ['ANSWERED'],
  ANSWERED: [],
  FAILED: ['QUEUED'],
};

/**
 * The one place a channel-specific exception is allowed, written out rather
 * than hidden: for a live call, "the call connected" is simultaneously delivery
 * and answer, so ANSWERED is reachable straight from SENT. For a message there
 * is no such shortcut — it must pass through DELIVERED.
 */
export function canAdvanceMinorNotification(
  from: MinorNotificationStatus,
  to: MinorNotificationStatus,
  channel?: MinorChannel | null,
): boolean {
  if (from === to) return false;
  if (!(NOTIFICATION_TRANSITIONS[from] || []).includes(to)) return false;
  if (to === 'ANSWERED' && from === 'SENT' && channel !== 'call') return false;
  return true;
}

export interface NotificationStateCells {
  queued: boolean;
  sent: boolean;
  delivered: boolean;
  acknowledged: boolean;
  answered: boolean;
  failed: boolean;
}

/**
 * The render contract. Each of the four outcomes is derived from its OWN
 * timestamp/status, so a surface physically cannot show "alerted" as if all
 * four had happened. Every UI reads a row through this.
 */
export function notificationStateCells(row: {
  status?: MinorNotificationStatus | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  acknowledged_at?: string | null;
  answered_at?: string | null;
  failed_at?: string | null;
}): NotificationStateCells {
  const status = row?.status || 'QUEUED';
  const reached = (order: MinorNotificationStatus[]) => order.includes(status);
  const order: MinorNotificationStatus[] = ['QUEUED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ANSWERED'];

  return {
    queued: status === 'QUEUED',
    sent: reached(order.slice(1)) || !!row?.sent_at,
    delivered: reached(order.slice(2)) || !!row?.delivered_at,
    acknowledged: reached(order.slice(3)) || !!row?.acknowledged_at,
    answered: status === 'ANSWERED' || !!row?.answered_at,
    failed: status === 'FAILED' || !!row?.failed_at,
  };
}

export function minorNotificationLabel(status: MinorNotificationStatus): string {
  switch (status) {
    case 'SENT':
      return 'Sent — not yet confirmed delivered';
    case 'DELIVERED':
      return 'Delivered to the device';
    case 'ACKNOWLEDGED':
      return 'Acknowledged by a person';
    case 'ANSWERED':
      return 'Answered';
    case 'FAILED':
      return 'Failed to send';
    case 'QUEUED':
    default:
      return 'Queued';
  }
}

// ── Idempotency ───────────────────────────────────────────────────────────────

export const ATTACH_WINDOW_MS = 15 * 60 * 1000;

/**
 * A key for one trigger occurrence. Unlike the dispatch machine this is NOT
 * what decides whether a second case opens — an open case always absorbs its
 * duplicates regardless of time. This key only identifies the individual
 * event, so a retried request can be recognised as the same event rather than
 * logged twice.
 */
export function buildReunificationIdempotencyKey(params: {
  minorId: string;
  triggerSource: MinorTriggerSource;
  at: string | number;
  windowMs?: number;
}): string {
  const windowMs = params.windowMs ?? ATTACH_WINDOW_MS;
  const ts = new Date(params.at).getTime();
  const safe = Number.isFinite(ts) ? ts : 0;
  return `${params.minorId}:${params.triggerSource}:${Math.floor(safe / windowMs)}`;
}

/**
 * Two simultaneous triggers can both pass the "is a case open?" read and both
 * insert. The winner is decided deterministically afterwards: the smallest id
 * keeps the case, the loser attaches to it. Same inputs, same winner, on replay.
 */
export function pickSurvivingReunificationCase<T extends { id: string }>(cases: T[]): T | null {
  if (!cases || cases.length === 0) return null;
  return [...cases].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
}

// ── Safety answer ─────────────────────────────────────────────────────────────

const NEGATIVE_PHRASES = [
  'not safe', 'unsafe', 'i am not', 'im not', "i'm not", 'am not safe',
  'no', 'nope', 'nah', 'negative', 'danger', 'dangerous', 'scared',
  'lost', 'help', 'help me', 'come get me', 'i need help',
];

const AFFIRMATIVE_PHRASES = [
  'i am safe', 'im safe', "i'm safe", 'safe',
  'yes', 'yeah', 'yep', 'yup', 'affirmative', 'ok', 'okay', 'fine', 'all good',
];

function normaliseSpeech(text: string): { phrase: string; words: Set<string> } {
  const phrase = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { phrase, words: new Set(phrase.split(' ').filter(Boolean)) };
}

function matchesAny(normalised: { phrase: string; words: Set<string> }, list: string[]): boolean {
  for (const candidate of list) {
    if (candidate.includes(' ')) {
      if (normalised.phrase.includes(candidate)) return true;
    } else if (normalised.words.has(candidate)) {
      return true;
    }
  }
  return false;
}

/**
 * The single question's answer, classified WITHOUT a model. A tap arrives as
 * 'yes' or 'no' and is recorded as a tap. A spoken answer is matched against
 * fixed phrase lists, recorded as voice, and its transcript stored verbatim.
 *
 * Anything not recognised is 'unknown' — never guessed into 'yes'. Silence
 * being read as safety is the precise failure mode this function refuses.
 */
export function classifySafeAnswer(input: {
  answer?: string | null;
  transcript?: string | null;
}): { answer: 'yes' | 'no' | 'unknown'; method: 'tap' | 'voice'; transcript: string | null } {
  const tapped = String(input?.answer || '').trim().toLowerCase();
  if (tapped === 'yes' || tapped === 'no') {
    return { answer: tapped, method: 'tap', transcript: null };
  }

  const spoken = String(input?.transcript || '').trim();
  if (spoken) {
    const normalised = normaliseSpeech(spoken);
    if (matchesAny(normalised, NEGATIVE_PHRASES)) {
      return { answer: 'no', method: 'voice', transcript: spoken };
    }
    if (matchesAny(normalised, AFFIRMATIVE_PHRASES)) {
      return { answer: 'yes', method: 'voice', transcript: spoken };
    }
    return { answer: 'unknown', method: 'voice', transcript: spoken };
  }

  return { answer: 'unknown', method: 'tap', transcript: null };
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

export function nextCheckInDueAt(from: string | number, intervalMinutes: number): string {
  const base = new Date(from).getTime();
  const safe = Number.isFinite(base) ? base : 0;
  const interval = Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : 60;
  return new Date(safe + interval * 60 * 1000).toISOString();
}

/**
 * A missed check-in is only a trigger when the window is actually running and
 * a due time was actually set. An inactive check-in has no due time and must
 * never fire — otherwise every enrolled minor would raise an alarm on the first
 * sweep after enrolment.
 */
export function isCheckInOverdue(
  minor: { checkin_active?: boolean | null; next_checkin_due_at?: string | null },
  now: string | number,
): boolean {
  if (!minor?.checkin_active) return false;
  if (!minor?.next_checkin_due_at) return false;
  const due = new Date(minor.next_checkin_due_at).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(n)) return false;
  return due <= n;
}

// ── Offline queue ─────────────────────────────────────────────────────────────

/**
 * A queued trigger keeps the timestamp of the moment it happened. `received_at`
 * is recorded separately, but it never replaces the occurred time — otherwise
 * a child who pressed help at 09:14 on a dead connection would appear to have
 * been reported at 09:40, and the response time would be a lie.
 */
export function resolveMinorOccurredAt(
  action: { occurred_at?: string | null },
  receivedAt: string | number,
): { occurred_at: string; occurred_at_source: 'client' | 'server_fallback' } {
  const t = action?.occurred_at ? new Date(action.occurred_at).getTime() : NaN;
  if (Number.isFinite(t)) {
    return { occurred_at: new Date(t).toISOString(), occurred_at_source: 'client' };
  }
  return {
    occurred_at: new Date(receivedAt).toISOString(),
    occurred_at_source: 'server_fallback',
  };
}

/** Replay order: the moment each action happened, then a local tiebreak. */
export function orderMinorQueuedActions<
  T extends { occurred_at: string; local_seq?: number | null },
>(actions: T[]): T[] {
  return [...(actions || [])].sort((a, b) => {
    const at = new Date(a.occurred_at).getTime();
    const bt = new Date(b.occurred_at).getTime();
    const safeA = Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
    const safeB = Number.isFinite(bt) ? bt : Number.POSITIVE_INFINITY;
    if (safeA !== safeB) return safeA - safeB;
    return (a.local_seq ?? 0) - (b.local_seq ?? 0);
  });
}