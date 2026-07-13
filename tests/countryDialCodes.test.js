import { describe, it, expect } from 'vitest';
import {
  COUNTRY_DIAL,
  dialToFlag,
  formatPhoneE164,
  parsePhoneValue,
} from '@/lib/countryDialCodes';

describe('formatPhoneE164', () => {
  it('strips formatting to clean E.164 digits', () => {
    expect(formatPhoneE164('1', '(555) 123-4567')).toBe('+15551234567');
    expect(formatPhoneE164('58', '212 555 0199')).toBe('+582125550199');
  });
  it('returns empty string when there is no national number (so empty-checks still fire)', () => {
    expect(formatPhoneE164('44', '')).toBe('');
    expect(formatPhoneE164('1', null)).toBe('');
    expect(formatPhoneE164('1', '   ')).toBe('');
  });
});

describe('parsePhoneValue', () => {
  it('splits a stored E.164 value into country + national number', () => {
    expect(parsePhoneValue('+15551234567')).toEqual({ iso2: 'US', dial: '1', national: '5551234567' });
    expect(parsePhoneValue('+441234567890')).toEqual({ iso2: 'GB', dial: '44', national: '1234567890' });
  });
  it('matches the LONGEST dial prefix, not the shortest', () => {
    // 353 (Ireland) must win over any shorter prefix
    expect(parsePhoneValue('+3531234567').iso2).toBe('IE');
    // 351 (Portugal) distinct from 353
    expect(parsePhoneValue('+351912345678').iso2).toBe('PT');
  });
  it('tolerates spaces, dashes and parens in the input', () => {
    expect(parsePhoneValue('+1 (305) 555-0145')).toEqual({ iso2: 'US', dial: '1', national: '3055550145' });
  });
  it('keeps the digits as national when no country code is present', () => {
    expect(parsePhoneValue('5551234')).toEqual({ iso2: null, dial: null, national: '5551234' });
  });
  it('handles empty / nullish input', () => {
    expect(parsePhoneValue('')).toEqual({ iso2: null, dial: null, national: '' });
    expect(parsePhoneValue(null)).toEqual({ iso2: null, dial: null, national: '' });
  });
  it('round-trips: parse → format reconstructs the E.164 value', () => {
    const v = '+525551234567';
    const p = parsePhoneValue(v);
    expect(formatPhoneE164(p.dial, p.national)).toBe(v);
  });
});

describe('dialToFlag', () => {
  it('maps ISO-2 to a regional-indicator emoji', () => {
    expect(dialToFlag('US')).toBe('🇺🇸');
    expect(dialToFlag('VE')).toBe('🇻🇪');
  });
  it('falls back to a globe for bad input', () => {
    expect(dialToFlag('')).toBe('🌍');
    expect(dialToFlag('XYZ')).toBe('🌍');
  });
});

describe('COUNTRY_DIAL data integrity', () => {
  it('every entry has iso2, name and a numeric dial', () => {
    for (const c of COUNTRY_DIAL) {
      expect(c.iso2).toMatch(/^[A-Z]{2}$/);
      expect(c.name).toBeTruthy();
      expect(c.dial).toMatch(/^\d+$/);
    }
  });
});
