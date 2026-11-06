import { describe, it, expect } from 'vitest';
import { serverTimeMs } from '../src/lib/serverTime.js';

// Every expectation below is an absolute instant (Date.UTC), so these pass the same in any timezone; reading the
// backend's strings with new Date() directly would only pass on a machine set to UTC.
describe('serverTimeMs', () => {
  it('reads the backend\'s timezone-less time as UTC (the real format, six-digit fraction)', () => {
    expect(serverTimeMs('2026-06-03T01:20:52.204000')).toBe(Date.UTC(2026, 5, 3, 1, 20, 52, 204));
    expect(serverTimeMs('2026-06-03T01:20:52')).toBe(Date.UTC(2026, 5, 3, 1, 20, 52));
    expect(serverTimeMs('2026-06-03T01:20')).toBe(Date.UTC(2026, 5, 3, 1, 20));
  });

  it('leaves a time that already says its timezone alone', () => {
    expect(serverTimeMs('2026-11-01T22:16:05.123Z')).toBe(Date.UTC(2026, 10, 1, 22, 16, 5, 123));
    expect(serverTimeMs('2026-11-01T18:16:05-04:00')).toBe(Date.UTC(2026, 10, 1, 22, 16, 5));
    expect(serverTimeMs('2026-11-01T18:16:05.123456-0400')).toBe(Date.UTC(2026, 10, 1, 22, 16, 5, 123));
    expect(serverTimeMs('2026-11-02T01:16:05+03:00')).toBe(Date.UTC(2026, 10, 1, 22, 16, 5));
  });

  it('puts a backend time and a browser time for the same moment at the same instant', () => {
    const browserMade = new Date(Date.UTC(2026, 10, 1, 22, 16, 5, 204)).toISOString();
    expect(serverTimeMs('2026-11-01T22:16:05.204000')).toBe(serverTimeMs(browserMade));
  });

  it('accepts a Date, a number, and a date on its own', () => {
    expect(serverTimeMs(new Date(Date.UTC(2026, 0, 2)))).toBe(Date.UTC(2026, 0, 2));
    expect(serverTimeMs(1767312000000)).toBe(1767312000000);
    expect(serverTimeMs('2026-06-03')).toBe(Date.UTC(2026, 5, 3));
  });

  it('returns NaN for anything that is not a time', () => {
    for (const bad of [undefined, null, '', '   ', 'not a date', NaN, {}, []]) expect(serverTimeMs(bad)).toBeNaN();
  });
});
