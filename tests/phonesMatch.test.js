import { describe, it, expect } from 'vitest';
import { phonesMatch } from '../base44/shared/verifyTwilioSignature.ts';

describe('phonesMatch', () => {
  it('matches two E.164 numbers that are identical', () => {
    expect(phonesMatch('+18095551234', '+18095551234')).toBe(true);
  });

  it('matches when formatting differs but the last 10 digits agree', () => {
    expect(phonesMatch('+1 (809) 555-1234', '18095551234')).toBe(true);
    expect(phonesMatch('809-555-1234', '+18095551234')).toBe(true);
  });

  it('does not match two genuinely different numbers', () => {
    expect(phonesMatch('+18095551234', '+18095559999')).toBe(false);
  });

  it('never matches when either input is empty/null/undefined', () => {
    expect(phonesMatch('', '+18095551234')).toBe(false);
    expect(phonesMatch(null, '+18095551234')).toBe(false);
    expect(phonesMatch(undefined, undefined)).toBe(false);
    expect(phonesMatch('+18095551234', '')).toBe(false);
  });

  it('refuses to match on too few digits (avoids a false-positive on short/malformed input)', () => {
    expect(phonesMatch('12345', '12345')).toBe(false);
  });
});
