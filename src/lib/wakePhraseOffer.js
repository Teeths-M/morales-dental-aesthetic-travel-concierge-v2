/**
 * wakePhraseOffer — decides whether the one-time "Hey M-Care" offer should be
 * shown, and holds the exact copy it shows.
 *
 * The wake phrase itself already exists (wakePhrase.js detects it, MCareOrb
 * arms the background listener, voice commands turn it on and off). What was
 * missing was a way to TELL a traveler the feature exists without a settings
 * page: the offer asks once, in the conversation, and whatever they answer is
 * saved so it is never asked again.
 *
 * Pure — no React, no DOM, no network — so the rule is testable on its own
 * and both the orb and the tests read the same single source of truth.
 */

/** Pref key on the user: true once the traveler has answered the offer. */
export const WAKE_OFFER_ANSWERED_KEY = 'wakePhraseOfferAnswered';

/**
 * Should the offer be shown right now?
 *
 * Fails closed on every input it does not positively know: no signed-in
 * traveler, a browser that cannot run continuous recognition (Firefox, for
 * one), prefs that haven't hydrated yet, an already-enabled wake phrase, or a
 * traveler who has already answered — all mean "don't ask".
 *
 * @param {object} args
 * @param {object|null} args.user            the signed-in user, or null
 * @param {object|null} args.prefs           hydrated prefs, or null if unknown
 * @param {boolean} args.supported           isConversationalModeSupported()
 * @returns {boolean}
 */
export function shouldOfferWakePhrase({ user, prefs, supported }) {
  if (!user || !prefs || !supported) return false;
  if (prefs.wakePhraseEnabled) return false;
  if (prefs[WAKE_OFFER_ANSWERED_KEY]) return false;
  return true;
}

/** The pref patch for either answer — always marks the offer answered. */
export function wakeOfferPatch(turnOn) {
  return {
    wakePhraseEnabled: !!turnOn,
    [WAKE_OFFER_ANSWERED_KEY]: true,
  };
}

/**
 * Honest, complete disclosure shown in the card itself. Written as plain
 * sentences rather than a link to a policy: the traveler is being asked to
 * let something listen, so the limits belong on the same screen as the
 * question. Mirrors what the code actually enforces (the listener only arms
 * while the tab is visible and online) and what it cannot promise (the
 * browser's own speech service receives the audio).
 */
export const WAKE_OFFER_COPY = {
  title: 'Want to talk to me hands-free?',
  body:
    'Say "Hey M-Care" and I open myself, no tapping. I only listen while this tab is open and your screen is on — close the tab or lock your phone and I stop. While I listen, your browser\u2019s speech service hears the audio. You can turn this off any time by saying "disable wake phrase."',
  turnOn: 'Turn on',
  notNow: 'Not now',
};