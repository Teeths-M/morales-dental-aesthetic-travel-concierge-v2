import { describe, it, expect } from 'vitest';
import { buildLocationContextBlock } from '../src/lib/locationContext.js';

describe('locationContext.buildLocationContextBlock', () => {
  it('returns null for missing input', () => {
    expect(buildLocationContextBlock(null)).toBeNull();
    expect(buildLocationContextBlock(undefined)).toBeNull();
  });

  it('builds a precise block for GPS with real coordinates', () => {
    const block = buildLocationContextBlock({ source: 'gps', latitude: 10.65, longitude: -61.51 });
    expect(block).toBe('[[LOCATION_CONTEXT: lat=10.65, lng=-61.51, source=gps_precise]]');
  });

  it('returns null for GPS with a missing coordinate', () => {
    expect(buildLocationContextBlock({ source: 'gps', latitude: 10.65, longitude: null })).toBeNull();
    expect(buildLocationContextBlock({ source: 'gps' })).toBeNull();
  });

  it('includes accuracy_m when a GPS reading reports its accuracy', () => {
    const block = buildLocationContextBlock({ source: 'gps', latitude: 10.65, longitude: -61.51, accuracy_meters: 1834.6 });
    expect(block).toBe('[[LOCATION_CONTEXT: lat=10.65, lng=-61.51, source=gps_precise, accuracy_m=1835]]');
  });

  it('builds an approximate block for a real IP hit', () => {
    const block = buildLocationContextBlock({
      source: 'ip_geo', city: 'Port of Spain', country: 'Trinidad and Tobago',
      latitude: 10.65, longitude: -61.51,
    });
    expect(block).toBe(
      '[[LOCATION_CONTEXT: city=Port of Spain, country=Trinidad and Tobago, lat=10.65, lng=-61.51, source=ip_approximate]]'
    );
  });

  it('omits missing fields but still includes what is known', () => {
    const block = buildLocationContextBlock({ source: 'ip_geo', country: 'Trinidad and Tobago', city: null, latitude: null, longitude: null });
    expect(block).toBe('[[LOCATION_CONTEXT: country=Trinidad and Tobago, source=ip_approximate]]');
  });

  it('never presents the honest all-fields-null fallback as real signal', () => {
    // Mirrors getGeolocationAndCurrency's own DEFAULT_FALLBACK shape.
    expect(buildLocationContextBlock({
      source: 'ip_geo', country: 'Unknown', country_code: 'US',
      city: null, region: null, latitude: null, longitude: null,
    })).toBeNull();
  });

  it('returns null when there is no city, country, or coordinates at all', () => {
    expect(buildLocationContextBlock({ source: 'ip_geo', city: null, country: null, latitude: null, longitude: null })).toBeNull();
  });
});
