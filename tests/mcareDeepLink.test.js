import { describe, it, expect } from 'vitest';
import { mcareDeepLinkMode, isMcareQuietRoute } from '../src/lib/mcareDeepLink.js';

describe('mcareDeepLinkMode', () => {
  it('reads the three link types', () => {
    expect(mcareDeepLinkMode('?mcare=open')).toBe('open');
    expect(mcareDeepLinkMode('?mcare=pilot&src=ad31')).toBe('pilot');
    expect(mcareDeepLinkMode('?src=ad30&mcare=partner')).toBe('partner');
  });

  it('ignores anything else', () => {
    expect(mcareDeepLinkMode('')).toBeNull();
    expect(mcareDeepLinkMode(undefined)).toBeNull();
    expect(mcareDeepLinkMode('?mcare=')).toBeNull();
    expect(mcareDeepLinkMode('?mcare=close')).toBeNull();
    expect(mcareDeepLinkMode('?mcare=OPEN')).toBeNull();
    expect(mcareDeepLinkMode('?src=ad31')).toBeNull();
  });
});

describe('isMcareQuietRoute', () => {
  it('covers a booking, a payment and the emergency screens', () => {
    expect(isMcareQuietRoute('/booking')).toBe(true);
    expect(isMcareQuietRoute('/checkout/abc')).toBe(true);
    expect(isMcareQuietRoute('/emergency')).toBe(true);
    expect(isMcareQuietRoute('/passport-vault')).toBe(true);
  });

  it('leaves the home page, the pilot page and M-Care itself alone', () => {
    expect(isMcareQuietRoute('/')).toBe(false);
    expect(isMcareQuietRoute('/pilot')).toBe(false);
    expect(isMcareQuietRoute('/m-care')).toBe(false);
    expect(isMcareQuietRoute('')).toBe(false);
  });
});
