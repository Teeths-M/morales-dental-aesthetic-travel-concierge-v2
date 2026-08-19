/**
 * locationConsentIntent — deterministic, client-side detection of "the
 * traveler wants M-Care to use their device's exact/precise GPS location
 * right now."
 *
 * Covers both a typed free-text request ("can you pin my exact location on
 * map") and a tapped {{choices:...}} button whose label the agent phrased
 * freely — RULE 11 (OFFER CHOICES) only gives the model a style template,
 * not a fixed enum, and a live session proved it does not reliably
 * reproduce one exact literal every time ("Yes, use my exact location" one
 * turn, "I'll share my GPS" the next, for the identical underlying intent).
 * A client-side check that only recognizes one hardcoded string silently
 * misses every rephrasing, which is exactly the bug this file fixes.
 *
 * Modeled on distressDetection.js's CONTAINS_PATTERNS: a curated,
 * word-boundary-anchored phrase list, safe as substrings because the
 * phrases are specific enough not to appear in ordinary conversation —
 * looser than voiceCommands.js's exact-whole-utterance Set (too rigid for
 * naturally varied real sentences and free LLM-generated button text),
 * tighter than a bare keyword match.
 *
 * Deliberately does NOT match an unqualified "share/use my location" —
 * that phrasing is also how a *guardian*-location-share request reads (a
 * real, separate M-Care flow), and firing a real browser GPS permission
 * prompt for the wrong intent is a disruptive false positive, not a
 * harmless no-op.
 *
 * Pure and unit-testable.
 */

const PATTERNS = [
  /\bgps\b/i,
  /\bexact location\b/i,
  /\bprecise location\b/i,
  /\bpinpoint (?:my|our) location\b/i,
  /\bpin (?:my|our) (?:exact|precise) location\b/i,
];

function matchesPattern(text, re) {
  return re.test(text);
}

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function detectLocationConsentIntent(rawText) {
  const text = (rawText || '').trim();
  if (!text) return false;
  return PATTERNS.some((re) => matchesPattern(text, re));
}
