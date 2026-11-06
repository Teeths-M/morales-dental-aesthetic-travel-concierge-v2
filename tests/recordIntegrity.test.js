import { describe, it, expect } from 'vitest';
import { caseStatusAfterWaiver, WAIVER_PAUSED_STATUS } from '../base44/shared/waiverCaseStatus.ts';
import { cleanPushSubscription } from '../base44/shared/pushSubscription.ts';
import { BOOKING } from '../base44/shared/bookingState.ts';

describe('a waiver never moves a trip out of a safety hold', () => {
  it('leaves an Admin-Review hold exactly as it is, whatever the waiver action', () => {
    for (const action of ['sign', 'refuse', 'reissue']) {
      expect(caseStatusAfterWaiver(BOOKING.ADMIN_REVIEW, action)).toBeNull();
    }
  });

  it('never reopens a completed or cancelled trip', () => {
    for (const status of [BOOKING.COMPLETED, BOOKING.CANCELLED]) {
      for (const action of ['sign', 'refuse', 'reissue']) {
        expect(caseStatusAfterWaiver(status, action)).toBeNull();
      }
    }
  });

  it('closes the two-step route a refusal and a signature used to open', () => {
    // Before: refuse wrote waiver_refused over the hold, then sign wrote Submitted.
    const afterRefuse = caseStatusAfterWaiver(BOOKING.ADMIN_REVIEW, 'refuse');
    expect(afterRefuse).toBeNull();
    expect(caseStatusAfterWaiver(BOOKING.ADMIN_REVIEW, 'sign')).toBeNull();
  });

  it('a refusal pauses an active trip, as before', () => {
    expect(caseStatusAfterWaiver(BOOKING.SUBMITTED, 'refuse')).toBe(WAIVER_PAUSED_STATUS);
    expect(caseStatusAfterWaiver(BOOKING.DOCTOR_PENDING, 'refuse')).toBe(WAIVER_PAUSED_STATUS);
    expect(caseStatusAfterWaiver(WAIVER_PAUSED_STATUS, 'refuse')).toBeNull();
  });

  it('a signature or reissue resumes only a trip the refusal paused', () => {
    expect(caseStatusAfterWaiver(WAIVER_PAUSED_STATUS, 'sign')).toBe(BOOKING.SUBMITTED);
    expect(caseStatusAfterWaiver(WAIVER_PAUSED_STATUS, 'reissue')).toBe(BOOKING.SUBMITTED);
  });

  it('never sends a trip that is further along back to the start', () => {
    for (const status of [BOOKING.DOCTOR_PENDING, BOOKING.PROPOSAL_SENT, BOOKING.DEPOSIT_PAID, BOOKING.RECOVERY]) {
      expect(caseStatusAfterWaiver(status, 'sign')).toBeNull();
      expect(caseStatusAfterWaiver(status, 'reissue')).toBeNull();
    }
  });

  it('does nothing without a known status', () => {
    expect(caseStatusAfterWaiver(undefined, 'sign')).toBeNull();
    expect(caseStatusAfterWaiver('', 'refuse')).toBeNull();
  });
});

describe('push subscriptions the server will store', () => {
  // The shape a browser gives: JSON.stringify(pushSubscription).
  const real = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123:APA91bExample',
    expirationTime: null,
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  it('keeps a real subscription, and only the fields web-push needs', () => {
    const cleaned = cleanPushSubscription(JSON.stringify({ ...real, extra: 'dropped', keys: { ...real.keys, other: 'x' } }));
    expect(cleaned).toEqual(real);
  });

  it('accepts the subscription as an object too', () => {
    expect(cleanPushSubscription(real)).toEqual(real);
  });

  it('keeps a numeric expiry and drops anything else there', () => {
    expect(cleanPushSubscription({ ...real, expirationTime: 1893456000000 }).expirationTime).toBe(1893456000000);
    expect(cleanPushSubscription({ ...real, expirationTime: 'soon' }).expirationTime).toBeNull();
  });

  it('refuses an address that is not https', () => {
    expect(cleanPushSubscription({ ...real, endpoint: 'http://fcm.googleapis.com/fcm/send/abc' })).toBeNull();
    expect(cleanPushSubscription({ ...real, endpoint: 'javascript:alert(1)' })).toBeNull();
    expect(cleanPushSubscription({ ...real, endpoint: 'not a url' })).toBeNull();
    expect(cleanPushSubscription({ ...real, endpoint: `https://example.com/${'a'.repeat(1100)}` })).toBeNull();
  });

  it('refuses missing or malformed keys', () => {
    expect(cleanPushSubscription({ ...real, keys: undefined })).toBeNull();
    expect(cleanPushSubscription({ ...real, keys: { p256dh: real.keys.p256dh } })).toBeNull();
    expect(cleanPushSubscription({ ...real, keys: { ...real.keys, auth: 'short' } })).toBeNull();
    expect(cleanPushSubscription({ ...real, keys: { ...real.keys, p256dh: 'not base64url!' } })).toBeNull();
  });

  it('refuses things that are not a subscription at all', () => {
    for (const bad of ['', 'null', '[]', '{not json', 42, null, undefined, []]) {
      expect(cleanPushSubscription(bad)).toBeNull();
    }
  });
});
