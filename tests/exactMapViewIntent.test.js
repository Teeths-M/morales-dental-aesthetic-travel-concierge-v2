import { describe, it, expect } from 'vitest';
import { detectExactMapViewIntent } from '../src/lib/exactMapViewIntent.js';

describe('exactMapViewIntent.detectExactMapViewIntent', () => {
  it('returns false for empty/whitespace input', () => {
    expect(detectExactMapViewIntent('')).toBe(false);
    expect(detectExactMapViewIntent('   ')).toBe(false);
    expect(detectExactMapViewIntent(null)).toBe(false);
    expect(detectExactMapViewIntent(undefined)).toBe(false);
  });

  it('matches the reported target phrase', () => {
    expect(detectExactMapViewIntent('Map my exact location and show me on Google Maps.')).toBe(true);
    expect(detectExactMapViewIntent('Show my exact location on Google Maps.')).toBe(true);
  });

  it('matches other phrasings combining exact-location intent with Google Maps/satellite', () => {
    expect(detectExactMapViewIntent('pin my exact location on google maps')).toBe(true);
    expect(detectExactMapViewIntent('can you show my precise location as a satellite view')).toBe(true);
    expect(detectExactMapViewIntent('open google maps satellite basemap with my GPS')).toBe(true);
  });

  it('does NOT match a bare exact-location request with no Google Maps/satellite mention', () => {
    // Must keep falling through to the existing, broader
    // detectLocationConsentIntent flow unchanged.
    expect(detectExactMapViewIntent('pin my exact location')).toBe(false);
    expect(detectExactMapViewIntent('what are my exact GPS coordinates')).toBe(false);
    expect(detectExactMapViewIntent('where am I exactly')).toBe(false);
  });

  it('does NOT match a bare Google Maps mention with no exact-location intent', () => {
    expect(detectExactMapViewIntent('how do I get to the airport on google maps')).toBe(false);
    expect(detectExactMapViewIntent('open google maps for the clinic address')).toBe(false);
  });

  it('does NOT match ordinary conversation containing neither signal', () => {
    expect(detectExactMapViewIntent('what is the weather like today')).toBe(false);
    expect(detectExactMapViewIntent('I need dental implants in Cancun')).toBe(false);
  });
});
