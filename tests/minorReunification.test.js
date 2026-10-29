import { describe, it, expect } from 'vitest';
import {
  REUNIFICATION_STATES,
  HAPPY_PATH,
  TERMINAL_STATES,
  ABORT_REASON_CODES,
  canTransitionReunification,
  allowedReunificationNext,
  isTerminalReunification,
  validateReunificationTransition,
  canAdvanceMinorNotification,
  notificationStateCells,
  classifySafeAnswer,
  buildReunificationIdempotencyKey,
  pickSurvivingReunificationCase,
  resolveMinorOccurredAt,
  orderMinorQueuedActions,
  isCheckInOverdue,
  nextCheckInDueAt,
} from '../base44/shared/minorReunification.ts';
import * as client from '../src/lib/minorReunificationClient.js';

/**
 * The reunification machine's guarantees, held as tests rather than as comments.
 *
 * These are the ones that would be catastrophic to regress: a skipped state, an
 * abort with no human behind it, a notification quietly upgraded to "answered",
 * or a duplicate trigger opening a second case for the same child.
 */

describe('state machine — order', () => {
  it('advances the happy path exactly one step at a time', () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      const from = HAPPY_PATH[i];
      const to = HAPPY_PATH[i + 1];
      expect(canTransitionReunification(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('never lets a state be skipped', () => {
    for (const from of HAPPY_PATH) {
      for (const to of HAPPY_PATH) {
        if (from === to) continue;
        const fromIdx = HAPPY_PATH.indexOf(from);
        const toIdx = HAPPY_PATH.indexOf(to);
        const allowed = canTransitionReunification(from, to);

        if (toIdx === fromIdx + 1) {
          expect(allowed, `${from} -> ${to} must be allowed`).toBe(true);
        } else {
          expect(allowed, `${from} -> ${to} must be refused (skip or backwards)`).toBe(false);
        }
      }
    }
  });

  it('allows ABORTED from every non-terminal state', () => {
    for (const from of HAPPY_PATH) {
      if (isTerminalReunification(from)) continue;
      expect(canTransitionReunification(from, 'ABORTED'), `${from} -> ABORTED`).toBe(true);
    }
  });

  it('never moves out of a terminal state', () => {
    for (const from of TERMINAL_STATES) {
      for (const to of REUNIFICATION_STATES) {
        expect(canTransitionReunification(from, to), `${from} -> ${to}`).toBe(false);
      }
    }
  });

  it('does not treat a no-op as a transition', () => {
    for (const state of REUNIFICATION_STATES) {
      expect(canTransitionReunification(state, state)).toBe(false);
    }
  });

  it('lists only legal next steps', () => {
    expect(allowedReunificationNext('TRIGGERED')).toEqual(['LOCATING', 'ABORTED']);
    expect(allowedReunificationNext('HANDED_OVER')).toEqual(['CLOSED', 'ABORTED']);
    expect(allowedReunificationNext('CLOSED')).toEqual([]);
    expect(allowedReunificationNext('ABORTED')).toEqual([]);
  });
});

describe('state machine — who may abort', () => {
  it('refuses an abort that is not from a human', () => {
    for (const actor of ['system', 'minor', 'third_party']) {
      const check = validateReunificationTransition({
        from: 'NOTIFIED',
        to: 'ABORTED',
        actor_type: actor,
        reason_code: 'false_alarm',
      });
      expect(check.allowed, actor).toBe(false);
      expect(check.code).toBe('actor_must_be_human');
    }
  });

  it('refuses a human abort with no reason code', () => {
    const check = validateReunificationTransition({
      from: 'NOTIFIED',
      to: 'ABORTED',
      actor_type: 'human',
      reason_code: null,
    });
    expect(check.allowed).toBe(false);
    expect(check.code).toBe('reason_code_required');
  });

  it('refuses a reason code that is not on the approved list', () => {
    const check = validateReunificationTransition({
      from: 'NOTIFIED',
      to: 'ABORTED',
      actor_type: 'human',
      reason_code: 'because_i_said_so',
    });
    expect(check.allowed).toBe(false);
    expect(check.code).toBe('reason_code_required');
  });

  it('allows a human abort with a real reason', () => {
    const check = validateReunificationTransition({
      from: 'REUNITING',
      to: 'ABORTED',
      actor_type: 'human',
      reason_code: 'minor_found_safe_other_means',
    });
    expect(check.allowed).toBe(true);
    expect(check.code).toBe('ok');
  });

  it('accepts every reason code on the list', () => {
    for (const code of ABORT_REASON_CODES) {
      const check = validateReunificationTransition({
        from: 'TRIGGERED',
        to: 'ABORTED',
        actor_type: 'human',
        reason_code: code,
      });
      expect(check.allowed, code).toBe(true);
    }
  });

  it('reports a terminal case rather than an illegal transition', () => {
    const check = validateReunificationTransition({
      from: 'CLOSED',
      to: 'ABORTED',
      actor_type: 'human',
      reason_code: 'false_alarm',
    });
    expect(check.allowed).toBe(false);
    expect(check.code).toBe('already_terminal');
  });

  it('refuses a skipped forward step', () => {
    const check = validateReunificationTransition({
      from: 'TRIGGERED',
      to: 'NOTIFIED',
      actor_type: 'human',
      reason_code: null,
    });
    expect(check.allowed).toBe(false);
    expect(check.code).toBe('illegal_transition');
  });
});

describe('notifications — four separate facts', () => {
  it('advances one real step at a time', () => {
    expect(canAdvanceMinorNotification('QUEUED', 'SENT')).toBe(true);
    expect(canAdvanceMinorNotification('SENT', 'DELIVERED')).toBe(true);
    expect(canAdvanceMinorNotification('DELIVERED', 'ACKNOWLEDGED')).toBe(true);
    expect(canAdvanceMinorNotification('ACKNOWLEDGED', 'ANSWERED')).toBe(true);
  });

  it('refuses to jump straight from queued to delivered or answered', () => {
    // The exact failure this module exists to prevent: a row that was never
    // sent claiming it was received.
    expect(canAdvanceMinorNotification('QUEUED', 'DELIVERED')).toBe(false);
    expect(canAdvanceMinorNotification('QUEUED', 'ACKNOWLEDGED')).toBe(false);
    expect(canAdvanceMinorNotification('QUEUED', 'ANSWERED')).toBe(false);
  });

  it('lets a live call be answered without a delivery step, and nothing else', () => {
    expect(canAdvanceMinorNotification('SENT', 'ANSWERED', 'call')).toBe(true);
    expect(canAdvanceMinorNotification('SENT', 'ANSWERED', 'sms')).toBe(false);
    expect(canAdvanceMinorNotification('SENT', 'ANSWERED', 'email')).toBe(false);
    expect(canAdvanceMinorNotification('SENT', 'ANSWERED', null)).toBe(false);
  });

  it('cannot un-answer a notification', () => {
    expect(canAdvanceMinorNotification('ANSWERED', 'ACKNOWLEDGED')).toBe(false);
    expect(canAdvanceMinorNotification('ANSWERED', 'SENT')).toBe(false);
  });

  it('renders SENT as sent only — never as delivered, acked or answered', () => {
    const cells = notificationStateCells({ status: 'SENT' });
    expect(cells.sent).toBe(true);
    expect(cells.delivered).toBe(false);
    expect(cells.acknowledged).toBe(false);
    expect(cells.answered).toBe(false);
    expect(cells.failed).toBe(false);
  });

  it('accumulates the four states in order', () => {
    expect(notificationStateCells({ status: 'QUEUED' })).toMatchObject({
      sent: false, delivered: false, acknowledged: false, answered: false,
    });
    expect(notificationStateCells({ status: 'DELIVERED' })).toMatchObject({
      sent: true, delivered: true, acknowledged: false, answered: false,
    });
    expect(notificationStateCells({ status: 'ACKNOWLEDGED' })).toMatchObject({
      sent: true, delivered: true, acknowledged: true, answered: false,
    });
    expect(notificationStateCells({ status: 'ANSWERED' })).toMatchObject({
      sent: true, delivered: true, acknowledged: true, answered: true,
    });
  });

  it('shows a failed row as failed without pretending it was sent', () => {
    const cells = notificationStateCells({ status: 'FAILED' });
    expect(cells.failed).toBe(true);
    expect(cells.sent).toBe(false);
    expect(cells.answered).toBe(false);
  });
});

describe('the single safety question', () => {
  it('records a tap as a tap', () => {
    expect(classifySafeAnswer({ answer: 'yes' })).toEqual({ answer: 'yes', method: 'tap', transcript: null });
    expect(classifySafeAnswer({ answer: 'no' })).toEqual({ answer: 'no', method: 'tap', transcript: null });
  });

  it('understands a spoken yes and a spoken no', () => {
    expect(classifySafeAnswer({ transcript: 'yes' }).answer).toBe('yes');
    expect(classifySafeAnswer({ transcript: 'yeah I am safe' }).answer).toBe('yes');
    expect(classifySafeAnswer({ transcript: 'no' }).answer).toBe('no');
    expect(classifySafeAnswer({ transcript: "I'm not safe" }).answer).toBe('no');
    expect(classifySafeAnswer({ transcript: 'please help me' }).answer).toBe('no');
  });

  it('marks the method as voice and keeps the transcript verbatim', () => {
    const result = classifySafeAnswer({ transcript: '  Yes, I am safe  ' });
    expect(result.method).toBe('voice');
    expect(result.transcript).toBe('Yes, I am safe');
  });

  it('never guesses an unrecognised answer into safety', () => {
    const result = classifySafeAnswer({ transcript: 'the blue door is locked' });
    expect(result.answer).toBe('unknown');
    expect(result.method).toBe('voice');
    expect(result.transcript).toBe('the blue door is locked');
  });

  it('treats silence as unknown, not as yes', () => {
    expect(classifySafeAnswer({})).toEqual({ answer: 'unknown', method: 'tap', transcript: null });
    expect(classifySafeAnswer({ answer: null, transcript: null }).answer).toBe('unknown');
  });
});

describe('idempotency', () => {
  it('gives the same key inside one window', () => {
    const a = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'minor_help', at: 1_000_000 });
    const b = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'minor_help', at: 1_000_001 });
    expect(a).toBe(b);
  });

  it('gives a different key in the next window', () => {
    const a = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'minor_help', at: 0 });
    const b = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'minor_help', at: 15 * 60 * 1000 });
    expect(a).not.toBe(b);
  });

  it('separates two different trigger sources', () => {
    const a = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'minor_help', at: 0 });
    const b = buildReunificationIdempotencyKey({ minorId: 'm1', triggerSource: 'qr_scan', at: 0 });
    expect(a).not.toBe(b);
  });

  it('picks the same surviving case regardless of input order', () => {
    const a = { id: 'aaa' };
    const b = { id: 'zzz' };
    expect(pickSurvivingReunificationCase([b, a]).id).toBe('aaa');
    expect(pickSurvivingReunificationCase([a, b]).id).toBe('aaa');
    expect(pickSurvivingReunificationCase([])).toBeNull();
  });
});

describe('offline queue', () => {
  it('keeps the moment the action happened, not the moment it flushed', () => {
    const resolved = resolveMinorOccurredAt(
      { occurred_at: '2026-03-01T09:14:00.000Z' },
      '2026-03-01T09:40:00.000Z',
    );
    expect(resolved.occurred_at).toBe('2026-03-01T09:14:00.000Z');
    expect(resolved.occurred_at_source).toBe('client');
  });

  it('falls back to server time only when the client gave none', () => {
    const resolved = resolveMinorOccurredAt({}, '2026-03-01T09:40:00.000Z');
    expect(resolved.occurred_at).toBe('2026-03-01T09:40:00.000Z');
    expect(resolved.occurred_at_source).toBe('server_fallback');
  });

  it('replays oldest first, breaking ties by local sequence', () => {
    const ordered = orderMinorQueuedActions([
      { occurred_at: '2026-03-01T09:20:00.000Z', local_seq: 1, tag: 'second' },
      { occurred_at: '2026-03-01T09:14:00.000Z', local_seq: 2, tag: 'first' },
      { occurred_at: '2026-03-01T09:14:00.000Z', local_seq: 1, tag: 'first-earlier' },
    ]);
    expect(ordered.map((a) => a.tag)).toEqual(['first-earlier', 'first', 'second']);
  });
});

describe('missed check-ins', () => {
  const now = '2026-03-01T12:00:00.000Z';

  it('ignores a minor whose check-in window is not running', () => {
    expect(isCheckInOverdue({ checkin_active: false, next_checkin_due_at: '2026-03-01T09:00:00.000Z' }, now)).toBe(false);
  });

  it('ignores a minor with no due time set', () => {
    expect(isCheckInOverdue({ checkin_active: true, next_checkin_due_at: null }, now)).toBe(false);
  });

  it('fires once the due time has passed', () => {
    expect(isCheckInOverdue({ checkin_active: true, next_checkin_due_at: '2026-03-01T11:59:00.000Z' }, now)).toBe(true);
    expect(isCheckInOverdue({ checkin_active: true, next_checkin_due_at: '2026-03-01T12:01:00.000Z' }, now)).toBe(false);
  });

  it('computes the next due time from the interval', () => {
    expect(nextCheckInDueAt('2026-03-01T12:00:00.000Z', 30)).toBe('2026-03-01T12:30:00.000Z');
    expect(nextCheckInDueAt('2026-03-01T12:00:00.000Z', 0)).toBe('2026-03-01T13:00:00.000Z');
  });
});

describe('the browser mirror matches the server', () => {
  it('agrees on the state list and happy path', () => {
    expect(client.REUNIFICATION_STATES).toEqual(REUNIFICATION_STATES);
    expect(client.HAPPY_PATH).toEqual(HAPPY_PATH);
    expect(client.TERMINAL_STATES).toEqual(TERMINAL_STATES);
    expect(client.ABORT_REASON_CODES).toEqual([...ABORT_REASON_CODES]);
  });

  it('agrees on every legal next step', () => {
    for (const state of REUNIFICATION_STATES) {
      expect(client.allowedNextStates(state), state).toEqual(allowedReunificationNext(state));
    }
  });

  it('agrees on every transition pair', () => {
    for (const from of REUNIFICATION_STATES) {
      for (const to of REUNIFICATION_STATES) {
        expect(client.canTransition(from, to), `${from}->${to}`)
          .toBe(canTransitionReunification(from, to));
      }
    }
  });

  it('agrees on the notification-state contract', () => {
    for (const status of ['QUEUED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ANSWERED', 'FAILED']) {
      expect(client.notificationStateCells({ status }), status)
        .toEqual(notificationStateCells({ status }));
    }
  });
});