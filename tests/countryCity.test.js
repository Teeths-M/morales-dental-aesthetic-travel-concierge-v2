import { describe, it, expect } from 'vitest';
import {
  normalizeCountry,
  getCitiesForCountry,
  hasCityList,
  isCityInCountry,
  cityAfterCountryChange,
  ALL_COUNTRY_OPTIONS,
  SERVED_COUNTRY_OPTIONS,
} from '../src/lib/countryCity.js';

describe('country → city filtering', () => {
  it('returns only that country\'s cities', () => {
    const mx = getCitiesForCountry('Mexico');
    expect(mx.length).toBeGreaterThan(0);
    expect(mx).toContain('Cancun');
    // The whole point: no leakage from another country.
    expect(mx).not.toContain('London');
    expect(getCitiesForCountry('United Kingdom')).toContain('London');
  });

  it('gives no cities when no country is chosen', () => {
    expect(getCitiesForCountry('')).toEqual([]);
    expect(getCitiesForCountry(null)).toEqual([]);
    expect(getCitiesForCountry(undefined)).toEqual([]);
    expect(hasCityList('')).toBe(false);
  });

  it('resolves Czechia → Czech Republic (the two datasets disagreed)', () => {
    // countries.js offers "Czechia"; cityData.json is keyed "Czech Republic".
    // Without the alias this silently returned zero cities.
    expect(normalizeCountry('Czechia')).toBe('Czech Republic');
    expect(getCitiesForCountry('Czechia').length).toBeGreaterThan(0);
    expect(hasCityList('Czechia')).toBe(true);
  });

  it('resolves common aliases and casing users actually type', () => {
    expect(normalizeCountry('USA')).toBe('United States');
    expect(normalizeCountry('uk')).toBe('United Kingdom');
    expect(normalizeCountry('UAE')).toBe('United Arab Emirates');
    expect(normalizeCountry('mexico')).toBe('Mexico');
    expect(getCitiesForCountry('USA')).toContain('New York');
  });

  it('covers every one of the 195 countries after the data expansion', () => {
    // cityData started at 29 countries; travellers come from anywhere, so it
    // now carries major cities for all 195.
    for (const opt of ALL_COUNTRY_OPTIONS) {
      expect(getCitiesForCountry(opt.value).length, `${opt.value} has no cities`).toBeGreaterThan(0);
    }
  });

  it('returns [] for a string that is not a country at all', () => {
    expect(getCitiesForCountry('Atlantis')).toEqual([]);
    expect(hasCityList('Atlantis')).toBe(false);
    expect(normalizeCountry('Atlantis')).toBe('');
  });
});

describe('city survives or resets on country change', () => {
  it('clears a city that belongs to the previous country', () => {
    expect(cityAfterCountryChange('Mexico', 'London')).toBe('');
    expect(cityAfterCountryChange('United Kingdom', 'Cancun')).toBe('');
  });

  it('keeps a city that is still valid for the new country', () => {
    expect(cityAfterCountryChange('Mexico', 'Cancun')).toBe('Cancun');
  });

  it('keeps a typed city when the new country has no list', () => {
    // Data loss guard: when a country has no curated list the user
    // typed the city themselves — resetting it would delete their input.
    expect(cityAfterCountryChange('Atlantis', 'Somewhere')).toBe('Somewhere');
  });

  it('treats an empty city as always valid', () => {
    expect(isCityInCountry('Mexico', '')).toBe(true);
    expect(cityAfterCountryChange('Mexico', '')).toBe('');
  });

  it('matches city case-insensitively', () => {
    expect(isCityInCountry('Mexico', 'cancun')).toBe(true);
    expect(cityAfterCountryChange('Mexico', 'cancun')).toBe('cancun');
  });
});

describe('bugs this module was written to fix', () => {
  it('Trinidad & Tobago (ampersand) resolves — M\'s home market', () => {
    // translations.js writes "Trinidad & Tobago"; cityData.json says "and".
    // Doctor signup therefore offered zero cities for Trinidad.
    expect(getCitiesForCountry('Trinidad & Tobago').length).toBeGreaterThan(0);
    expect(getCitiesForCountry('Trinidad & Tobago')).toContain('Port of Spain');
  });

  it('localised country names resolve to their city lists', () => {
    // The signup wizards render country names in the user's language while
    // cityData.json is keyed in English, so Spanish/French/Portuguese/German
    // users got an empty city list for almost every country.
    expect(getCitiesForCountry('México')).toContain('Cancun');
    expect(getCitiesForCountry('Estados Unidos')).toContain('New York');
    expect(getCitiesForCountry('Royaume-Uni')).toContain('London');
    expect(getCitiesForCountry('Deutschland').length).toBeGreaterThan(0);
    expect(getCitiesForCountry('Trinidad y Tobago')).toContain('Port of Spain');
  });

  it('nationality adjectives resolve (booking stores these, not countries)', () => {
    expect(getCitiesForCountry('Venezuelan')).toContain('Caracas');
    expect(getCitiesForCountry('British')).toContain('London');
    expect(normalizeCountry('Czech')).toBe('Czech Republic');
  });

  it('an unresolvable country yields NO cities, never a merged world list', () => {
    // CityOriginSelect used to fall back to Object.values(cityData).flat(),
    // showing every city from every country at once — the opposite of
    // filtering. Nothing here may ever return a cross-country list.
    const nowhere = getCitiesForCountry('Atlantis');
    expect(nowhere).toEqual([]);
    const mx = getCitiesForCountry('Mexico');
    expect(mx.length).toBeLessThan(60); // one country's worth, not all 609
  });
});

describe('option lists', () => {
  it('offers all 195 countries, and served countries are a subset', () => {
    expect(ALL_COUNTRY_OPTIONS).toHaveLength(195);
    expect(SERVED_COUNTRY_OPTIONS.length).toBeGreaterThan(0);
    expect(SERVED_COUNTRY_OPTIONS.length).toBeLessThan(ALL_COUNTRY_OPTIONS.length);
    expect(ALL_COUNTRY_OPTIONS.every((o) => o.value && o.label)).toBe(true);
  });

  it('served markets stay a business list, not "everywhere we have cities"', () => {
    // SERVED_COUNTRY_OPTIONS used to be Object.keys(cityData). That was fine
    // while both were the same 29 countries, but once cityData was expanded to
    // all 195 it would have advertised M as operating in every country on
    // earth. Destination/market pickers read this list, so it must stay small
    // and explicit.
    expect(SERVED_COUNTRY_OPTIONS.length).toBeLessThan(60);
    const served = SERVED_COUNTRY_OPTIONS.map((o) => o.value);
    expect(served).toContain('Trinidad and Tobago');
    expect(served).toContain('Mexico');
    // We hold cities for these, but M does not operate there.
    expect(served).not.toContain('North Korea');
    expect(served).not.toContain('Afghanistan');
  });

  it('every served country actually resolves to cities', () => {
    // Guards against a future rename desynchronising the two datasets again,
    // the way Czechia/Czech Republic did.
    for (const opt of SERVED_COUNTRY_OPTIONS) {
      expect(getCitiesForCountry(opt.value).length, `${opt.value} has no cities`).toBeGreaterThan(0);
    }
  });
});
