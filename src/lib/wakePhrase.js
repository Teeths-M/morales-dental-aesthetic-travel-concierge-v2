/**
 * wakePhrase — detects "Hey M-Care" (and a few natural variants) said as the
 * START of an utterance, so a background SpeechRecognition session can open
 * M-Care hands-free while the app is open and the screen is on.
 *
 * Anchored-prefix / exact match only — same discipline as every other phrase
 * matcher in this app (conversationalMode.js's CORRECTION_PREFIXES,
 * voiceCommands.js's exact-phrase sets) — so an ordinary sentence that
 * happens to mention "hey" or "care" separately is never misread as the
 * wake phrase. Deliberately not fuzzy: a false-positive open here interrupts
 * whatever the user was actually doing.
 *
 * Pure, no React, no DOM, no network — the impure continuous-recognition
 * session itself lives in MCareOrb.jsx, reusing conversationalMode.js's
 * startContinuousRecognition rather than a second implementation.
 */

const WAKE_PHRASES = [
  'hey m-care',
  'hey mcare',
  'hey m care',
  'ok m-care',
  'okay m-care',
  'ok mcare',
  'okay mcare',
  'hey morales care',
];

function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?,;:]+$/, '');
}

/**
 * Returns true if the utterance IS, or STARTS WITH, a real wake phrase —
 * "Hey M-Care" matches, and so does "Hey M-Care, what's my flight status",
 * but a sentence that merely mentions "hey" or "care" elsewhere does not.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function detectWakePhrase(text) {
  const normalized = normalize(text);
  if (!normalized) return false;
  return WAKE_PHRASES.some((p) => normalized === p || normalized.startsWith(`${p} `) || normalized.startsWith(`${p},`));
}

/** Convenience for tests / UI copy that wants the real phrase list. */
export const WAKE_PHRASE_EXAMPLES = [...WAKE_PHRASES];
