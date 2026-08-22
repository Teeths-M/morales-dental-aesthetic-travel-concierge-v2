import { describe, it, expect } from 'vitest';
import { buildOfflineGeoUri, buildGoogleMapsLocationUrl, describeAccuracy } from '../src/lib/geoUri.js';

describe('geoUri.buildOfflineGeoUri', () => {
  it('returns null for missing input', () => {
    expect(buildOfflineGeoUri(null)).toBeNull();
    expect(buildOfflineGeoUri(undefined)).toBeNull();
    expect(buildOfflineGeoUri('')).toBeNull();
  });

  it('returns null for an address string (not resolvable offline)', () => {
    expect(buildOfflineGeoUri('Golden Grove Road, Piarco, Trinidad')).toBeNull();
  });

  it('builds a real geo: URI for real coordinates', () => {
    expect(buildOfflineGeoUri('10.65,-61.51')).toBe('geo:10.65,-61.51?q=10.65,-61.51');
  });

  it('includes an encoded, parenthesized label when provided', () => {
    expect(buildOfflineGeoUri('10.65,-61.51', 'Piarco Police Station'))
      .toBe('geo:10.65,-61.51?q=10.65,-61.51(Piarco%20Police%20Station)');
  });

  it('omits the label segment entirely when no label is given', () => {
    const withNoLabel = buildOfflineGeoUri('10.65,-61.51');
    expect(withNoLabel).not.toContain('(');
  });
});

describe('geoUri.buildGoogleMapsLocationUrl', () => {
  it('returns null without real coordinates', () => {
    expect(buildGoogleMapsLocationUrl({})).toBeNull();
    expect(buildGoogleMapsLocationUrl({ latitude: 10.65 })).toBeNull();
    expect(buildGoogleMapsLocationUrl(undefined)).toBeNull();
  });

  it('builds a real Google Maps DISPLAY-map URL, not a directions URL', () => {
    const url = buildGoogleMapsLocationUrl({ latitude: 10.65, longitude: -61.51 });
    expect(url).toContain('https://www.google.com/maps/@?');
    expect(url).toContain('api=1');
    expect(url).toContain('map_action=map');
    expect(url).not.toContain('destination='); // directions family, not this one
  });

  it('defaults to zoom=19 and basemap=satellite', () => {
    const url = buildGoogleMapsLocationUrl({ latitude: 10.65, longitude: -61.51 });
    expect(url).toContain('zoom=19');
    expect(url).toContain('basemap=satellite');
  });

  it('percent-encodes the comma in center, matching lat,lng', () => {
    const url = buildGoogleMapsLocationUrl({ latitude: 10.65, longitude: -61.51 });
    expect(url).toContain('center=10.65%2C-61.51');
  });

  it('honors an explicit zoom/basemap override', () => {
    const url = buildGoogleMapsLocationUrl({ latitude: 10.65, longitude: -61.51, zoom: 15, basemap: 'roadmap' });
    expect(url).toContain('zoom=15');
    expect(url).toContain('basemap=roadmap');
  });
});

describe('geoUri.describeAccuracy', () => {
  it('never calls a poor fix exact — honest low-confidence caveat above 100m', () => {
    const desc = describeAccuracy(1500);
    expect(desc).toContain('lower-confidence');
    // "not exact" is an honest negation, not an affirmative claim of
    // precision — the real check is that nothing here calls the fix
    // "exact"/"precise" without the disclaiming "not" right before it.
    expect(desc).toMatch(/not exact/i);
    expect(desc).not.toMatch(/\bis exact\b/i);
  });

  it('states a precise-sounding accuracy at or under 100m', () => {
    expect(describeAccuracy(12)).toBe('Accuracy: approximately 12 meters.');
    expect(describeAccuracy(68)).toBe('Accuracy: approximately 68 meters.');
    expect(describeAccuracy(100)).toBe('Accuracy: approximately 100 meters.');
  });

  it('rounds a fractional accuracy value', () => {
    expect(describeAccuracy(12.6)).toBe('Accuracy: approximately 13 meters.');
  });

  it('handles a missing or non-finite accuracy honestly, never fabricating a number', () => {
    expect(describeAccuracy(null)).toBe('Your device did not report an accuracy value.');
    expect(describeAccuracy(undefined)).toBe('Your device did not report an accuracy value.');
    expect(describeAccuracy(NaN)).toBe('Your device did not report an accuracy value.');
  });
});
