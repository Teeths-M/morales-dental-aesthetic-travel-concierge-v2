/**
 * minorReunificationClient — the browser-safe mirror of the shared state machine.
 *
 * The backend module lives in base44/shared and cannot be imported into the
 * bundle, so the parts the UI needs are mirrored here. This is the same
 * arrangement as incidentDispatchClient, and it carries the same hazard: a
 * mirror can drift. tests/minorReunification.test.js asserts the two agree on
 * states, transitions and the notification-state contract, so drift fails the
 * build rather than silently mis-rendering a child's case.
 *
 * This file decides NOTHING. It renders and it offers the user a list of moves
 * the server will re-validate anyway — the server is the only authority.
 */

export const REUNIFICATION_STATES = [
  'TRIGGERED', 'LOCATING', 'NOTIFIED', 'REUNITING', 'HANDED_OVER', 'CLOSED', 'ABORTED',
];

export const HAPPY_PATH = ['TRIGGERED', 'LOCATING', 'NOTIFIED', 'REUNITING', 'HANDED_OVER', 'CLOSED'];

export const TERMINAL_STATES = ['CLOSED', 'ABORTED'];

/** Must match TRANSITIONS in shared/minorReunification.ts exactly. */
export const TRANSITIONS = {
  TRIGGERED: ['LOCATING', 'ABORTED'],
  LOCATING: ['NOTIFIED', 'ABORTED'],
  NOTIFIED: ['REUNITING', 'ABORTED'],
  REUNITING: ['HANDED_OVER', 'ABORTED'],
  HANDED_OVER: ['CLOSED', 'ABORTED'],
  CLOSED: [],
  ABORTED: [],
};

export const ABORT_REASON_CODES = [
  'minor_found_safe_other_means',
  'false_alarm',
  'duplicate_case',
  'minor_withdrew_from_programme',
  'family_resolved_directly',
  'handed_to_local_authority',
  'test_case',
  'care_team_decision',
];

export const ABORT_REASON_LABELS = {
  minor_found_safe_other_means: 'Found safe by other means',
  false_alarm: 'False alarm',
  duplicate_case: 'Duplicate case',
  minor_withdrew_from_programme: 'Withdrew from the programme',
  family_resolved_directly: 'Family resolved it directly',
  handed_to_local_authority: 'Handed to a local authority',
  test_case: 'Test case',
  care_team_decision: 'Care-team decision',
};

/** Human labels for the forward steps, used on the action buttons. */
export const TRANSITION_LABELS = {
  'TRIGGERED->LOCATING': 'Start locating',
  'LOCATING->NOTIFIED': 'Mark parties notified',
  'NOTIFIED->REUNITING': 'Begin reunion',
  'REUNITING->HANDED_OVER': 'Record handover',
  'HANDED_OVER->CLOSED': 'Close case',
};

export function allowedNextStates(state) {
  return [...(TRANSITIONS[state] || [])];
}

export function canTransition(from, to) {
  if (from === to) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

export function isTerminalState(state) {
  return TERMINAL_STATES.includes(state);
}

export function stateLabel(state) {
  switch (state) {
    case 'TRIGGERED': return 'Triggered';
    case 'LOCATING': return 'Locating';
    case 'NOTIFIED': return 'Parties notified';
    case 'REUNITING': return 'Reuniting';
    case 'HANDED_OVER': return 'Handed over';
    case 'CLOSED': return 'Closed';
    case 'ABORTED': return 'Aborted';
    default: return String(state || 'Unknown');
  }
}

export function stateTone(state) {
  switch (state) {
    case 'CLOSED': return 'ok';
    case 'HANDED_OVER': return 'ok';
    case 'REUNITING': return 'active';
    case 'NOTIFIED': return 'active';
    case 'LOCATING': return 'urgent';
    case 'TRIGGERED': return 'urgent';
    case 'ABORTED': return 'muted';
    default: return 'muted';
  }
}

export function triggerSourceLabel(source) {
  switch (source) {
    case 'minor_help': return 'Minor pressed help';
    case 'qr_scan': return 'Printed card scanned';
    case 'missed_checkin': return 'Check-in missed';
    case 'authorised_adult': return 'Authorised adult opened';
    default: return String(source || '—');
  }
}

/**
 * The render contract for a notification row. Mirrors notificationStateCells in
 * the shared module: each of the four outcomes is read from its own timestamp,
 * so no screen can render "alerted" as if all four had happened.
 */
export function notificationStateCells(row) {
  const status = row?.status || 'QUEUED';
  const order = ['QUEUED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ANSWERED'];
  const reached = (from) => order.indexOf(status) >= from;

  return {
    queued: status === 'QUEUED',
    sent: reached(1) || !!row?.sent_at,
    delivered: reached(2) || !!row?.delivered_at,
    acknowledged: reached(3) || !!row?.acknowledged_at,
    answered: status === 'ANSWERED' || !!row?.answered_at,
    failed: status === 'FAILED' || !!row?.failed_at,
  };
}

export function minorNotificationLabel(status) {
  switch (status) {
    case 'SENT': return 'Sent — not yet confirmed delivered';
    case 'DELIVERED': return 'Delivered to the device';
    case 'ACKNOWLEDGED': return 'Acknowledged by a person';
    case 'ANSWERED': return 'Answered';
    case 'FAILED': return 'Failed to send';
    case 'QUEUED':
    default: return 'Queued';
  }
}

export function safeAnswerLabel(answer, method) {
  if (!answer || answer === 'unknown') {
    return method === 'voice' ? 'Answered by voice — not understood' : 'Not answered yet';
  }
  const text = answer === 'yes' ? 'Safe' : 'Not safe';
  return method === 'voice' ? `${text} — said aloud` : `${text} — tapped`;
}

export function formatAge(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}