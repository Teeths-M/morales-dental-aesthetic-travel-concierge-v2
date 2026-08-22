import { describe, it, expect } from 'vitest';
import { buildDisplayPlace } from '../src/lib/reverseGeocode.js';

describe('reverseGeocode.buildDisplayPlace', () => {
  it('returns null for missing input', () => {
    expect(buildDisplayPlace(null)).toBeNull();
    expect(buildDisplayPlace(undefined)).toBeNull();
    expect(buildDisplayPlace({})).toBeNull();
  });

  it('prefers suburb over city when both are present', () => {
    expect(buildDisplayPlace({ suburb: 'Piarco', city: 'Port of Spain', country: 'Trinidad and Tobago' }))
      .toBe('Piarco (Trinidad and Tobago)');
  });

  it('falls back to neighbourhood then quarter when suburb is absent', () => {
    expect(buildDisplayPlace({ neighbourhood: 'Woodbrook', country: 'Trinidad and Tobago' }))
      .toBe('Woodbrook (Trinidad and Tobago)');
    expect(buildDisplayPlace({ quarter: 'Newtown', country: 'Trinidad and Tobago' }))
      .toBe('Newtown (Trinidad and Tobago)');
  });

  it('falls back to city/town/village when no finer area is present', () => {
    expect(buildDisplayPlace({ city: 'San Fernando', country: 'Trinidad and Tobago' }))
      .toBe('San Fernando (Trinidad and Tobago)');
    expect(buildDisplayPlace({ town: 'Chaguanas', country: 'Trinidad and Tobago' }))
      .toBe('Chaguanas (Trinidad and Tobago)');
    expect(buildDisplayPlace({ village: 'Blanchisseuse', country: 'Trinidad and Tobago' }))
      .toBe('Blanchisseuse (Trinidad and Tobago)');
  });

  it('falls back to county/state as a last resort area', () => {
    expect(buildDisplayPlace({ county: 'St. George', country: 'Trinidad and Tobago' }))
      .toBe('St. George (Trinidad and Tobago)');
    expect(buildDisplayPlace({ state: 'Tobago', country: 'Trinidad and Tobago' }))
      .toBe('Tobago (Trinidad and Tobago)');
  });

  it('returns just the area when country is missing', () => {
    expect(buildDisplayPlace({ suburb: 'Piarco' })).toBe('Piarco');
  });

  it('returns just the country when no area field is present at all', () => {
    expect(buildDisplayPlace({ country: 'Trinidad and Tobago' })).toBe('Trinidad and Tobago');
  });
});
