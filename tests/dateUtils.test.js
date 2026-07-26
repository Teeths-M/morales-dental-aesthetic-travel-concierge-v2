import { describe, it, expect } from 'vitest';
import { daysUntil } from '../src/lib/dateUtils.js';

describe('dateUtils.daysUntil', () => {
  it('returns null when no date is given', () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
    expect(daysUntil('')).toBeNull();
  });

  it('returns null for an unparsable date string', () => {
    expect(daysUntil('not-a-date')).toBeNull();
  });

  it('returns 0 for today regardless of time-of-day', () => {
    const now = new Date();
    expect(daysUntil(now.toISOString())).toBe(0);
  });

  it('returns a positive count for a future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(daysUntil(future.toISOString())).toBe(5);
  });

  it('returns a negative count for a past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(daysUntil(past.toISOString())).toBe(-3);
  });
});
