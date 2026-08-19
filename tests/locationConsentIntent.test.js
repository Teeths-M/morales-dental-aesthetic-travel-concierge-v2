import { describe, it, expect } from 'vitest';
import { detectLocationConsentIntent } from '../src/lib/locationConsentIntent.js';

describe('locationConsentIntent.detectLocationConsentIntent', () => {
  it('returns false for missing/empty input', () => {
    expect(detectLocationConsentIntent(null)).toBe(false);
    expect(detectLocationConsentIntent(undefined)).toBe(false);
    expect(detectLocationConsentIntent('')).toBe(false);
    expect(detectLocationConsentIntent('   ')).toBe(false);
  });

  it('matches the exact literal the client used to hardcode', () => {
    expect(detectLocationConsentIntent('Yes, use my exact location')).toBe(true);
  });

  it('matches a freely-worded GPS-share button label (the real live-session miss)', () => {
    expect(detectLocationConsentIntent("I'll share my GPS")).toBe(true);
  });

  it('matches a real typed sentence asking for precise location', () => {
    expect(detectLocationConsentIntent('can you pin my exact location on map')).toBe(true);
  });

  it('matches other reasonable phrasings', () => {
    expect(detectLocationConsentIntent('enable GPS please')).toBe(true);
    expect(detectLocationConsentIntent('use my precise location for this')).toBe(true);
    expect(detectLocationConsentIntent('please pinpoint my location')).toBe(true);
    expect(detectLocationConsentIntent('Turn on GPS tracking')).toBe(true);
  });

  it('does not match the other real, unrelated choices from the same live session', () => {
    expect(detectLocationConsentIntent('Let me type my address')).toBe(false);
    expect(detectLocationConsentIntent('Take me to Central Police Station')).toBe(false);
    expect(detectLocationConsentIntent("No, that's fine")).toBe(false);
  });

  it('does not match a generic privacy question that happens to mention location', () => {
    expect(detectLocationConsentIntent("what's the best way to protect my location privacy")).toBe(false);
    expect(detectLocationConsentIntent('is my location shared with anyone')).toBe(false);
  });

  it('does not collide with an unqualified guardian-location-share request', () => {
    expect(detectLocationConsentIntent('share my location with my guardian')).toBe(false);
    expect(detectLocationConsentIntent('use my location to notify my emergency contact')).toBe(false);
  });
});
