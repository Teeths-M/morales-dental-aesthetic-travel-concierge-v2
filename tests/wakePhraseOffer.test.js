import { describe, it, expect, vi } from 'vitest';

// mcarePreferences.js imports the app's backend client, which reads window as soon as it loads; these tests only
// use its pure helpers, so an empty stand-in is enough.
vi.mock('@/api/base44Client', () => ({ base44: {} }));

import { shouldOfferWakePhrase, wakeOfferPatch, WAKE_OFFER_ANSWERED_KEY, WAKE_OFFER_COPY } from '@/lib/wakePhraseOffer';
import { DEFAULT_MCARE_PREFS, normalizePrefs } from '@/lib/mcarePreferences';

const user = { id: 'u1', email: 'traveller@example.com' };
const fresh = { wakePhraseEnabled: false, [WAKE_OFFER_ANSWERED_KEY]: false };

describe('shouldOfferWakePhrase', () => {
  it('offers to a signed-in traveller on a supported browser who has not answered yet', () => {
    expect(shouldOfferWakePhrase({ user, prefs: fresh, supported: true })).toBe(true);
  });

  it('never offers to a signed-out visitor, since the answer could not be saved', () => {
    expect(shouldOfferWakePhrase({ user: null, prefs: fresh, supported: true })).toBe(false);
  });

  it('never offers on a browser that cannot run the wake phrase', () => {
    expect(shouldOfferWakePhrase({ user, prefs: fresh, supported: false })).toBe(false);
  });

  it('does not offer when the wake phrase is already on', () => {
    expect(shouldOfferWakePhrase({ user, prefs: { ...fresh, wakePhraseEnabled: true }, supported: true })).toBe(false);
  });

  it('asks only once: no offer after either answer', () => {
    expect(shouldOfferWakePhrase({ user, prefs: { ...fresh, [WAKE_OFFER_ANSWERED_KEY]: true }, supported: true })).toBe(false);
  });

  it('fails closed when prefs are not known yet', () => {
    expect(shouldOfferWakePhrase({ user, prefs: null, supported: true })).toBe(false);
  });
});

describe('wakeOfferPatch', () => {
  it('"Turn on" switches the wake phrase on and records the answer', () => {
    expect(wakeOfferPatch(true)).toEqual({ wakePhraseEnabled: true, [WAKE_OFFER_ANSWERED_KEY]: true });
  });

  it('"Not now" leaves it off and still records the answer, so it is not asked again', () => {
    expect(wakeOfferPatch(false)).toEqual({ wakePhraseEnabled: false, [WAKE_OFFER_ANSWERED_KEY]: true });
  });
});

describe('the saved preferences', () => {
  it('keep the wake phrase off by default', () => {
    expect(DEFAULT_MCARE_PREFS.wakePhraseEnabled).toBe(false);
    expect(normalizePrefs(undefined).wakePhraseEnabled).toBe(false);
  });

  it('keep the answer when loading, so a reload does not ask again', () => {
    expect(normalizePrefs({ [WAKE_OFFER_ANSWERED_KEY]: true })[WAKE_OFFER_ANSWERED_KEY]).toBe(true);
  });
});

describe('the offer copy', () => {
  it('says when it listens and who hears the audio', () => {
    expect(WAKE_OFFER_COPY.body).toMatch(/only listen while this tab is open and your screen is on/);
    expect(WAKE_OFFER_COPY.body).toMatch(/speech service hears the audio/);
  });
});
