import { describe, it, expect } from 'vitest';
import {
  buildDedupeKey,
  pickSurvivingIncident,
  rankResponders,
  nextOfferAction,
  isOfferExpired,
  countLiveOffers,
  canTransitionIncident,
  notificationDisplayStatus,
  canAdvanceNotification,
  orderQueuedActions,
  resolveOccurredAt,
} from '../base44/shared/incidentDispatch.ts';
import {
  buildQueuedAction,
  nextLocalSeq,
} from '../src/lib/incidentOfflineQueue.js';
import * as client from '../src/lib/incidentDispatchClient.js';

const responder = (overrides = {}) => ({
  responder_id: 'r1',
  responder_type: 'security_agency',
  display_name: 'Responder',
  verification_tier: 3,
  eta_seconds: 300,
  eta_source: 'declared',
  last_accepted_at: null,
  ...overrides,
});

// ── 1. Expiry, then the next offer ───────────────────────────────────────────
describe('offer expiry advances to the next responder', () => {
  const pool = [
    responder({ responder_id: 'a', verification_tier: 3, eta_seconds: 300 }),
    responder({ responder_id: 'b', verification_tier: 3, eta_seconds: 600 }),
    responder({ responder_id: 'c', verification_tier: 3, eta_seconds: 900 }),
  ];
  const ranked = rankResponders(pool);

  it('offers the top-ranked responder first', () => {
    const decision = nextOfferAction({ ranked, attemptedIds: [], attemptsMade: 0, maxOffers: 5 });
    expect(decision.allowed).toBe(true);
    expect(decision.responder.responder_id).toBe('a');
  });

  it('treats an offer past expires_at as expired, and one inside the window as live', () => {
    const offer = { status: 'OFFERED', expires_at: '2026-10-29T09:01:30.000Z' };
    expect(isOfferExpired(offer, '2026-10-29T09:01:29.000Z')).toBe(false);
    expect(isOfferExpired(offer, '2026-10-29T09:01:30.000Z')).toBe(true);
    expect(isOfferExpired(offer, '2026-10-29T09:05:00.000Z')).toBe(true);
  });

  it('offers the SECOND responder after the first has been attempted', () => {
    const decision = nextOfferAction({ ranked, attemptedIds: ['a'], attemptsMade: 1, maxOffers: 5 });
    expect(decision.allowed).toBe(true);
    expect(decision.responder.responder_id).toBe('b');
  });

  it('never re-offers a responder who already expired, declined or accepted', () => {
    const decision = nextOfferAction({ ranked, attemptedIds: ['a', 'b', 'c'], attemptsMade: 3, maxOffers: 5 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('pool_exhausted');
  });

  it('holds the one-live-offer invariant', () => {
    expect(countLiveOffers([
      { status: 'EXPIRED' }, { status: 'OFFERED' }, { status: 'DECLINED' },
    ])).toBe(1);
  });
});

// ── 2. Pool exhaustion ───────────────────────────────────────────────────────
describe('pool exhaustion ends UNRESOLVED without inventing a responder', () => {
  const ranked = rankResponders([
    responder({ responder_id: 'a' }),
    responder({ responder_id: 'b' }),
  ]);

  it('stops when every responder has been tried', () => {
    const decision = nextOfferAction({ ranked, attemptedIds: ['a', 'b'], attemptsMade: 2, maxOffers: 5 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('pool_exhausted');
  });

  it('stops at max_offers even when the pool is larger', () => {
    const decision = nextOfferAction({ ranked, attemptedIds: ['a'], attemptsMade: 2, maxOffers: 2 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('max_offers_reached');
  });

  it('never offers a denied or suspended responder', () => {
    const withDenied = rankResponders([
      responder({ responder_id: 'denied', verification_tier: -1 }),
      responder({ responder_id: 'ok' }),
    ]);
    expect(withDenied.map((r) => r.responder_id)).toEqual(['ok']);
  });

  it('declares pool_exhausted when the pool itself is empty', () => {
    const decision = nextOfferAction({ ranked: [], attemptedIds: [], attemptsMade: 0, maxOffers: 5 });
    expect(decision.allowed).toBe(false);
  });
});

// ── 3. Duplicate trigger ─────────────────────────────────────────────────────
describe('a duplicate trigger does not open a second dispatch', () => {
  const at = '2026-10-29T09:14:22.000Z';

  it('produces the same dedupe key for two triggers inside one window', () => {
    const a = buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'medical', at });
    const b = buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'medical', at: '2026-10-29T09:18:40.000Z' });
    expect(a).toBe(b);
  });

  it('produces a different key once the window has passed', () => {
    const a = buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'medical', at });
    const b = buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'medical', at: '2026-10-29T09:41:00.000Z' });
    expect(a).not.toBe(b);
  });

  it('separates two different patients and two different incident types', () => {
    const base = buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'medical', at });
    expect(buildDedupeKey({ patientId: 'p2', tripId: 't1', type: 'medical', at })).not.toBe(base);
    expect(buildDedupeKey({ patientId: 'p1', tripId: 't1', type: 'security', at })).not.toBe(base);
  });

  it('picks the same survivor every time, regardless of row order', () => {
    const rows = [{ id: 'zzz' }, { id: 'aaa' }, { id: 'mmm' }];
    expect(pickSurvivingIncident(rows).id).toBe('aaa');
    expect(pickSurvivingIncident([...rows].reverse()).id).toBe('aaa');
    expect(pickSurvivingIncident([])).toBeNull();
  });
});

// ── 4. Offline flush ordering ────────────────────────────────────────────────
describe('offline actions flush in the order they happened', () => {
  it('orders by the original timestamp, not by insertion order', () => {
    const queue = [
      { incident_id: 'i1', action: 'decline', occurred_at: '2026-10-29T09:20:00.000Z', local_seq: 3 },
      { incident_id: 'i1', action: 'accept', occurred_at: '2026-10-29T09:14:00.000Z', local_seq: 1 },
      { incident_id: 'i1', action: 'acknowledge', occurred_at: '2026-10-29T09:17:00.000Z', local_seq: 2 },
    ];
    expect(orderQueuedActions(queue).map((a) => a.action)).toEqual(['accept', 'acknowledge', 'decline']);
  });

  it('breaks ties within one timestamp by local sequence', () => {
    const queue = [
      { incident_id: 'i1', action: 'second', occurred_at: '2026-10-29T09:14:00.000Z', local_seq: 2 },
      { incident_id: 'i1', action: 'first', occurred_at: '2026-10-29T09:14:00.000Z', local_seq: 1 },
    ];
    expect(orderQueuedActions(queue).map((a) => a.action)).toEqual(['first', 'second']);
  });

  it('keeps the original timestamp and never rewrites it to send time', () => {
    const resolved = resolveOccurredAt(
      { occurred_at: '2026-10-29T09:14:00.000Z' },
      '2026-10-29T09:20:00.000Z',
    );
    expect(resolved.occurred_at).toBe('2026-10-29T09:14:00.000Z');
    expect(resolved.occurred_at_source).toBe('client');
  });

  it('falls back to server time only when the client supplied none, and says so', () => {
    const resolved = resolveOccurredAt({}, '2026-10-29T09:20:00.000Z');
    expect(resolved.occurred_at).toBe('2026-10-29T09:20:00.000Z');
    expect(resolved.occurred_at_source).toBe('server_fallback');
  });

  it('assigns a monotonic local sequence as actions are queued', () => {
    let queue = [];
    const first = buildQueuedAction(queue, { incident_id: 'i1', offer_token: 'tk', action: 'accept' }, '2026-10-29T09:14:00.000Z');
    queue = [first];
    const second = buildQueuedAction(queue, { incident_id: 'i1', offer_token: 'tk', action: 'acknowledge' }, '2026-10-29T09:15:00.000Z');
    expect(first.local_seq).toBe(1);
    expect(second.local_seq).toBe(2);
    expect(nextLocalSeq([first, second])).toBe(3);
  });
});

// ── 5. SENT never renders as DELIVERED ───────────────────────────────────────
describe('SENT is never rendered or stored as DELIVERED', () => {
  it('labels SENT without ever claiming delivery', () => {
    const sent = notificationDisplayStatus('SENT');
    expect(sent.label).not.toBe('Delivered');
    expect(sent.delivered).toBe(false);
  });

  it('reports QUEUED as not delivered', () => {
    expect(notificationDisplayStatus('QUEUED').delivered).toBe(false);
  });

  it('reports DELIVERED only for a real delivery', () => {
    expect(notificationDisplayStatus('DELIVERED').delivered).toBe(true);
    expect(notificationDisplayStatus('ACKNOWLEDGED').delivered).toBe(true);
  });

  it('refuses to advance QUEUED straight to DELIVERED without passing through SENT', () => {
    expect(canAdvanceNotification('QUEUED', 'DELIVERED')).toBe(false);
  });

  it('refuses to advance SENT to ACKNOWLEDGED while skipping DELIVERED', () => {
    expect(canAdvanceNotification('SENT', 'ACKNOWLEDGED')).toBe(false);
  });

  it('allows QUEUED → SENT → DELIVERED → ACKNOWLEDGED', () => {
    expect(canAdvanceNotification('QUEUED', 'SENT')).toBe(true);
    expect(canAdvanceNotification('SENT', 'DELIVERED')).toBe(true);
    expect(canAdvanceNotification('DELIVERED', 'ACKNOWLEDGED')).toBe(true);
  });

  it('never walks a notification backwards out of ACKNOWLEDGED', () => {
    expect(canAdvanceNotification('ACKNOWLEDGED', 'DELIVERED')).toBe(false);
    expect(canAdvanceNotification('ACKNOWLEDGED', 'FAILED')).toBe(false);
  });
});

// ── Frontend copy stays identical to the server copy ────────────────────────
describe('the frontend dispatch helpers match the server module', () => {
  // The UI cannot import from base44/, so src/lib/incidentDispatchClient.js is a
  // deliberate copy. These assertions are what stop the two drifting apart.
  const statuses = ['QUEUED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED'];

  it('renders every notification status the same way on both sides', () => {
    for (const status of statuses) {
      expect(client.notificationDisplayStatus(status)).toEqual(notificationDisplayStatus(status));
    }
  });

  it('orders an offline queue identically on both sides', () => {
    const queue = [
      { occurred_at: '2026-10-29T09:20:00.000Z', local_seq: 3, action: 'c' },
      { occurred_at: '2026-10-29T09:14:00.000Z', local_seq: 1, action: 'a' },
      { occurred_at: '2026-10-29T09:17:00.000Z', local_seq: 2, action: 'b' },
    ];
    expect(client.orderQueuedActions(queue)).toEqual(orderQueuedActions(queue));
  });

  it('resolves an offline timestamp identically on both sides', () => {
    expect(client.resolveOccurredAt({ occurred_at: '2026-10-29T09:14:00.000Z' }, '2026-10-29T09:20:00.000Z'))
      .toEqual(resolveOccurredAt({ occurred_at: '2026-10-29T09:14:00.000Z' }, '2026-10-29T09:20:00.000Z'));
    expect(client.resolveOccurredAt({}, '2026-10-29T09:20:00.000Z'))
      .toEqual(resolveOccurredAt({}, '2026-10-29T09:20:00.000Z'));
  });
});

// ── State machine guards ─────────────────────────────────────────────────────
describe('incident transitions are constrained', () => {
  it('allows the forward path', () => {
    expect(canTransitionIncident('OPEN', 'DISPATCHING')).toBe(true);
    expect(canTransitionIncident('DISPATCHING', 'ASSIGNED')).toBe(true);
    expect(canTransitionIncident('ASSIGNED', 'EN_ROUTE')).toBe(true);
    expect(canTransitionIncident('EN_ROUTE', 'ARRIVED')).toBe(true);
    expect(canTransitionIncident('ARRIVED', 'RESOLVED')).toBe(true);
  });

  it('refuses to reopen a resolved or suppressed incident', () => {
    expect(canTransitionIncident('RESOLVED', 'DISPATCHING')).toBe(false);
    expect(canTransitionIncident('DUPLICATE_SUPPRESSED', 'OPEN')).toBe(false);
  });

  it('allows a discovered responder on an unresolved incident', () => {
    expect(canTransitionIncident('UNRESOLVED', 'ASSIGNED')).toBe(true);
  });
});

// ── Ranking order ───────────────────────────────────────────────────────────
describe('ranking follows policy: verification, then ETA, then last accepted', () => {
  it('puts a higher verification tier first even when it is slower', () => {
    const ranked = rankResponders([
      responder({ responder_id: 'fast-low', verification_tier: 1, eta_seconds: 60 }),
      responder({ responder_id: 'slow-high', verification_tier: 3, eta_seconds: 900 }),
    ]);
    expect(ranked[0].responder_id).toBe('slow-high');
  });

  it('breaks a tier tie on ETA, then on most recent acceptance', () => {
    const ranked = rankResponders([
      responder({ responder_id: 'slow', verification_tier: 3, eta_seconds: 900, last_accepted_at: '2026-10-01T00:00:00.000Z' }),
      responder({ responder_id: 'fast', verification_tier: 3, eta_seconds: 300, last_accepted_at: null }),
      responder({ responder_id: 'fast-proven', verification_tier: 3, eta_seconds: 300, last_accepted_at: '2026-10-20T00:00:00.000Z' }),
    ]);
    expect(ranked.map((r) => r.responder_id)).toEqual(['fast-proven', 'fast', 'slow']);
  });
});