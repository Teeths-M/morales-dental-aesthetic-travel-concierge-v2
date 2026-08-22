import { describe, it, expect } from 'vitest';
import { buildOfflineGeoUri } from '../src/lib/geoUri.js';

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
