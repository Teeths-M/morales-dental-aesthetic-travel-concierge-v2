import { describe, it, expect } from 'vitest';
import {
  MIN_ACCOUNT_AGE,
  AGE_GATE_STORAGE_KEY,
  BLOCK_REMEMBER_MS,
  isRealDate,
  ageOn,
  evaluateDob,
  readAgeGate,
  rememberAgeGate,
  hasPassedAgeGate,
  isAgeGateBlocked,
} from '@/lib/ageGate';

const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
};

const TODAY = new Date(2026, 9, 17); // 17 October 2026, local time
const at = { now: TODAY.getTime() };

describe('ageOn', () => {
  it('counts a birthday that falls today', () => {
    expect(ageOn({ year: 2000, month: 10, day: 17 }, TODAY)).toBe(26);
  });

  it("doesn't count one that hasn't happened yet this year", () => {
    expect(ageOn({ year: 2000, month: 10, day: 18 }, TODAY)).toBe(25);
  });

  it('treats a 29 February birthday as 1 March in other years', () => {
    expect(ageOn({ year: 2008, month: 2, day: 29 }, new Date(2027, 1, 28))).toBe(18);
    expect(ageOn({ year: 2008, month: 2, day: 29 }, new Date(2027, 2, 1))).toBe(19);
  });
});

describe('isRealDate', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(isRealDate({ year: 2024, month: 2, day: 29 })).toBe(true);
    expect(isRealDate({ year: 2025, month: 2, day: 29 })).toBe(false);
    expect(isRealDate({ year: 2001, month: 2, day: 30 })).toBe(false);
    expect(isRealDate({ year: 2001, month: 13, day: 1 })).toBe(false);
    expect(isRealDate({ year: NaN, month: 1, day: 1 })).toBe(false);
  });
});

describe('evaluateDob', () => {
  it('passes someone who reaches the minimum age today', () => {
    const dob = { year: TODAY.getFullYear() - MIN_ACCOUNT_AGE, month: TODAY.getMonth() + 1, day: TODAY.getDate() };
    expect(evaluateDob(dob, TODAY)).toBe('pass');
  });

  it('blocks someone who reaches it tomorrow', () => {
    const d = new Date(TODAY.getFullYear() - MIN_ACCOUNT_AGE, TODAY.getMonth(), TODAY.getDate() + 1);
    expect(evaluateDob({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }, TODAY)).toBe('block');
  });

  it('treats an impossible, future, or implausible date as invalid, never as a pass', () => {
    expect(evaluateDob({ year: 2001, month: 2, day: 30 }, TODAY)).toBe('invalid');
    expect(evaluateDob({ year: 2030, month: 1, day: 1 }, TODAY)).toBe('invalid');
    expect(evaluateDob({ year: 1850, month: 1, day: 1 }, TODAY)).toBe('invalid');
    expect(evaluateDob({ year: NaN, month: 1, day: 1 }, TODAY)).toBe('invalid');
  });
});

describe('the result saved on the device', () => {
  it('holds only the result, its time, and the minimum age, never the date of birth', () => {
    const storage = memory();
    rememberAgeGate('passed', { storage, ...at });
    const saved = JSON.parse(storage.getItem(AGE_GATE_STORAGE_KEY));
    expect(Object.keys(saved).sort()).toEqual(['at', 'min_age', 'status']);
    expect(saved.min_age).toBe(MIN_ACCOUNT_AGE);
  });

  it('a pass only counts against the current minimum age', () => {
    const storage = memory();
    storage.setItem(AGE_GATE_STORAGE_KEY, JSON.stringify({ status: 'passed', at: TODAY.toISOString(), min_age: MIN_ACCOUNT_AGE - 1 }));
    expect(hasPassedAgeGate({ storage, ...at })).toBe(false);
    rememberAgeGate('passed', { storage, ...at });
    expect(hasPassedAgeGate({ storage, ...at })).toBe(true);
  });

  it('a block lasts BLOCK_REMEMBER_MS, then the question is asked again', () => {
    const storage = memory();
    rememberAgeGate('blocked', { storage, ...at });
    expect(isAgeGateBlocked({ storage, now: TODAY.getTime() + BLOCK_REMEMBER_MS - 1000 })).toBe(true);
    expect(hasPassedAgeGate({ storage, ...at })).toBe(false);
    expect(isAgeGateBlocked({ storage, now: TODAY.getTime() + BLOCK_REMEMBER_MS + 1000 })).toBe(false);
  });

  it('reads nothing from missing, corrupt, or unknown saved data', () => {
    const storage = memory();
    expect(readAgeGate({ storage, ...at })).toBeNull();
    storage.setItem(AGE_GATE_STORAGE_KEY, '{not json');
    expect(readAgeGate({ storage, ...at })).toBeNull();
    storage.setItem(AGE_GATE_STORAGE_KEY, JSON.stringify({ status: 'maybe', at: TODAY.toISOString() }));
    expect(readAgeGate({ storage, ...at })).toBeNull();
    expect(readAgeGate({ storage: null, ...at })).toBeNull();
  });
});
