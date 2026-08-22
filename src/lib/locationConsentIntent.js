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
  // "exact" or "precise" + "location" with up to 3 words between (e.g. "exact my location")
  /\b(?:exact|precise)\s+(?:\w+\s+){0,3}location\b/i,
  /\bpinpoint (?:my|our) location\b/i,
  /\bpin (?:my|our) (?:exact|precise) location\b/i,
  // "map" + optional "out" + optional words + "location" (e.g. "map my location", "map out my location")
  /\bmap\s+(?:out\s+)?(?:\w+\s+){0,3}location\b/i,
  // "show me/my on ... map" (e.g. "show me on the map", "show me on google map", "show my on google map")
  /\bshow\s+(?:me|my)\s+on\s+(?:\w+\s+)*map\b/i,
  // "show my/our location" (e.g. "show my location")
  /\bshow\s+(?:my|our)\s+location\b/i,
  // "open my/our location" (e.g. "open my location on google map")
  /\bopen\s+(?:my|our)\s+location\b/i,
  // "where am i" / "what are my coordinates"
  /\bwhere am i\b/i,
  /\bwhat are my (?:exact )?coordinates\b/i,
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