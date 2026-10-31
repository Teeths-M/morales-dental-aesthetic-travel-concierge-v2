import { describe, it, expect } from 'vitest';
import {
  DAY_END_HOUR, DAY_START_HOUR, detectDeviceTimeZone, isDaytime, isValidTimeZone,
  minutesOfDay, nextBoundaryDelayMs, normalizeThemeMode, resolveResolvedTheme,
  resolveTimeZone, zoneClockLabel, zoneParts,
} from '../src/lib/mobileTheme';
import { timeZoneForCountry } from '../src/lib/countryTimeZones';

/**
 * These cover the rules the theme is actually judged on: the exact day/night
 * boundaries, time zone priority and fallback, DST correctness (delegated to
 * Intl), manual override, and the honest handling of an unavailable zone.
 */

const at = (iso) => new Date(iso);

describe('day/night boundaries', () => {
  it('is dark one minute before 06:00 and light from 06:00', () => {
    expect(isDaytime(at('2026-06-15T05:59:00Z'), 'UTC')).toBe(false);
    expect(isDaytime(at('2026-06-15T06:00:00Z'), 'UTC')).toBe(true);
  });

  it('is light through 17:59 and dark from 18:00', () => {
    expect(isDaytime(at('2026-06-15T17:59:59Z'), 'UTC')).toBe(true);
    expect(isDaytime(at('2026-06-15T18:00:00Z'), 'UTC')).toBe(false);
  });

  it('reads the wall clock in the requested zone, not in UTC', () => {
    // 22:00 UTC is 18:00 in Port of Spain (UTC-4) — night there, and the trip
    // zone is what must decide, not the device's own offset.
    expect(minutesOfDay(at('2026-06-15T22:00:00Z'), 'America/Port_of_Spain')).toBe(18 * 60);
    expect(isDaytime(at('2026-06-15T22:00:00Z'), 'America/Port_of_Spain')).toBe(false);
    expect(zoneClockLabel(at('2026-06-15T22:00:00Z'), 'America/Port_of_Spain')).toBe('18:00');
  });

  it('treats the documented window as inclusive start, exclusive end', () => {
    expect(DAY_START_HOUR).toBe(6);
    expect(DAY_END_HOUR).toBe(18);
  });
});

describe('daylight saving', () => {
  it('follows the zone through a spring-forward transition', () => {
    // 07:30 UTC on 2026-03-08 is 03:30 in New York (already on EDT, UTC-4).
    const parts = zoneParts(at('2026-03-08T07:30:00Z'), 'America/New_York');
    expect(parts.hour).toBe(3);
    expect(parts.minute).toBe(30);
    expect(isDaytime(at('2026-03-08T07:30:00Z'), 'America/New_York')).toBe(false);
  });

  it('follows the zone through a fall-back transition', () => {
    // 13:30 UTC on 2026-11-01 is 08:30 in New York (EST, UTC-5).
    const parts = zoneParts(at('2026-11-01T13:30:00Z'), 'America/New_York');
    expect(parts.hour).toBe(8);
    expect(minutesOfDay(at('2026-11-01T13:30:00Z'), 'America/New_York')).toBe(8 * 60 + 30);
  });
});

describe('next boundary', () => {
  it('lands on 06:00 when it is just before dawn', () => {
    const delay = nextBoundaryDelayMs(at('2026-06-15T05:30:00Z'), 'UTC');
    expect(delay).toBe(30 * 60 * 1000);
  });

  it('lands on 18:00 when it is mid-afternoon', () => {
    const delay = nextBoundaryDelayMs(at('2026-06-15T13:00:00Z'), 'UTC');
    expect(delay).toBe(5 * 60 * 60 * 1000);
  });

  it('never returns zero (a boundary that is "now" waits for the next one)', () => {
    expect(nextBoundaryDelayMs(at('2026-06-15T06:00:00Z'), 'UTC')).toBeGreaterThan(0);
  });
});

describe('time zone priority', () => {
  it('prefers the journey destination', () => {
    expect(resolveTimeZone({
      journeyTimeZone: 'America/Costa_Rica',
      travelerTimeZone: 'Europe/London',
      deviceTimeZone: 'Asia/Tokyo',
    })).toEqual({ timeZone: 'America/Costa_Rica', source: 'journey' });
  });

  it('falls to the traveller choice when the journey zone is missing', () => {
    expect(resolveTimeZone({
      journeyTimeZone: null,
      travelerTimeZone: 'Europe/London',
      deviceTimeZone: 'Asia/Tokyo',
    })).toEqual({ timeZone: 'Europe/London', source: 'traveler' });
  });

  it('falls to the device zone when neither is available', () => {
    expect(resolveTimeZone({ deviceTimeZone: 'Asia/Tokyo' }))
      .toEqual({ timeZone: 'Asia/Tokyo', source: 'device' });
  });

  it('uses an honest, labelled fallback when nothing usable exists', () => {
    expect(resolveTimeZone({ journeyTimeZone: 'Mars/Olympus_Mons', travelerTimeZone: '' }))
      .toEqual({ timeZone: 'UTC', source: 'fallback' });
  });

  it('rejects invalid zones instead of guessing', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('America/Port_of_Spain')).toBe(true);
    expect(isValidTimeZone(null)).toBe(false);
  });
});

describe('mode handling', () => {
  it('defaults unknown stored values away rather than trusting them', () => {
    expect(normalizeThemeMode('sepia')).toBeNull();
    expect(normalizeThemeMode('auto')).toBe('auto');
  });

  it('lets a manual choice override the local clock', () => {
    const daytime = at('2026-06-15T12:00:00Z');
    const night = at('2026-06-15T23:00:00Z');
    expect(resolveResolvedTheme('dark', daytime, 'UTC')).toBe('night');
    expect(resolveResolvedTheme('light', night, 'UTC')).toBe('day');
    expect(resolveResolvedTheme('auto', daytime, 'UTC')).toBe('day');
    expect(resolveResolvedTheme('auto', night, 'UTC')).toBe('night');
  });

  it('treats an unreadable zone as the labelled UTC fallback, never as a guess', () => {
    // Same substitution resolveTimeZone makes ('fallback' → UTC), so what the
    // settings card states ("no usable time zone … in UTC") is exactly what the
    // screen is doing.
    expect(isDaytime(at('2026-06-15T12:00:00Z'), 'Not/AZone')).toBe(true);
    expect(isDaytime(at('2026-06-15T23:00:00Z'), 'Not/AZone')).toBe(false);
    expect(resolveResolvedTheme('auto', at('2026-06-15T23:00:00Z'), 'Not/AZone')).toBe('night');
  });
});

describe('trip country mapping', () => {
  it('maps the app\'s own corridor', () => {
    expect(timeZoneForCountry('Trinidad and Tobago')).toBe('America/Port_of_Spain');
    expect(timeZoneForCountry('Costa Rica')).toBe('America/Costa_Rica');
    expect(timeZoneForCountry('tt')).toBe('America/Port_of_Spain');
  });

  it('folds case, accents and punctuation', () => {
    expect(timeZoneForCountry('  COSTA   RICA ')).toBe('America/Costa_Rica');
    expect(timeZoneForCountry('Türkiye')).toBe('Europe/Istanbul');
  });

  it('returns null for an unknown country — never a fabricated zone', () => {
    expect(timeZoneForCountry('Atlantis')).toBeNull();
    expect(timeZoneForCountry('')).toBeNull();
    expect(timeZoneForCountry(undefined)).toBeNull();
  });
});

describe('device zone', () => {
  it('returns a valid zone or null, never an invalid string', () => {
    const zone = detectDeviceTimeZone();
    expect(zone === null || isValidTimeZone(zone)).toBe(true);
  });
});