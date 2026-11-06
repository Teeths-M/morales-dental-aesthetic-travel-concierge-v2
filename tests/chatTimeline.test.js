import { describe, it, expect } from 'vitest';
import { mergeTimeline } from '../src/lib/chatTimeline.js';

const at = (min) => new Date(Date.UTC(2026, 10, 1, 18, min)).toISOString();
const date = (x) => x.created_date;
const ids = (items) => items.map((x) => x.id);

describe('mergeTimeline', () => {
  it('puts a QR scan greeting first and the conversation after it, newest at the bottom', () => {
    const conversation = [
      { id: 'you: pilot', created_date: at(16) },
      { id: 'M-Care: which pilot?', created_date: at(16) },
      { id: 'you: M-Care pilot program', created_date: at(17) },
      { id: 'M-Care: reply', created_date: at(18) },
    ];
    const scan = [{ id: 'scan greeting', created_date: at(14) }];
    expect(ids(mergeTimeline([conversation, scan], date))).toEqual([
      'scan greeting', 'you: pilot', 'M-Care: which pilot?', 'you: M-Care pilot program', 'M-Care: reply',
    ]);
  });

  it('slots a sign-up given mid-conversation, and journey updates, in where they happened', () => {
    const conversation = [{ id: 'q1', created_date: at(1) }, { id: 'a1', created_date: at(2) }, { id: 'q2', created_date: at(6) }];
    const scan = [{ id: 'greeting', created_date: at(0) }, { id: 'email', created_date: at(4) }, { id: 'saved', created_date: at(4) }];
    const updates = [{ id: 'update', created_date: at(3) }];
    expect(ids(mergeTimeline([conversation, scan, updates], date))).toEqual(['greeting', 'q1', 'a1', 'update', 'email', 'saved', 'q2']);
  });

  it('never reorders a list internally, even if its times run backwards', () => {
    const conversation = [{ id: 'a', created_date: at(5) }, { id: 'b', created_date: at(3) }];
    const scan = [{ id: 'p', created_date: at(4) }];
    const out = ids(mergeTimeline([conversation, scan], date));
    expect(out.indexOf('a')).toBeLessThan(out.indexOf('b'));
    expect(out).toHaveLength(3);
  });

  it('keeps something with no time yet (a message just sent) at the bottom', () => {
    const conversation = [{ id: 'old', created_date: at(1) }, { id: 'just sent' }];
    const scan = [{ id: 'greeting', created_date: at(0) }, { id: 'later', created_date: at(9) }];
    expect(ids(mergeTimeline([conversation, scan], date))).toEqual(['greeting', 'old', 'later', 'just sent']);
  });

  it('orders the backend\'s timezone-less times against browser-made ones correctly, in any timezone', () => {
    // Real formats: the backend sends "…T22:13:00.000000" (UTC, no zone); the scan greeting is made in the browser.
    const conversation = [
      { id: 'earlier reply', created_date: '2026-11-01T22:13:00.000000' },
      { id: 'later reply', created_date: '2026-11-01T22:15:00.000000' },
    ];
    const scan = [{ id: 'greeting', created_date: new Date(Date.UTC(2026, 10, 1, 22, 14, 30)).toISOString() }];
    // Read directly, Trinidad would push both replies four hours late (greeting first) and Istanbul three hours early
    // (greeting last); only reading them as UTC gives the real order.
    expect(ids(mergeTimeline([conversation, scan], date))).toEqual(['earlier reply', 'greeting', 'later reply']);
  });

  it('breaks a tie in favour of the earlier list, and copes with empty or missing lists', () => {
    expect(ids(mergeTimeline([[{ id: 'a', created_date: at(2) }], [{ id: 'b', created_date: at(2) }]], date))).toEqual(['a', 'b']);
    expect(mergeTimeline([[], undefined, null], date)).toEqual([]);
  });
});
