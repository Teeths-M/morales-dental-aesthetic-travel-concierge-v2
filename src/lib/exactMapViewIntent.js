/**
 * exactMapViewIntent — deterministic, client-side detection of "the
 * traveler wants their exact device location shown as a Google Maps
 * satellite display," not just "wants exact GPS" in general.
 *
 * detectLocationConsentIntent (locationConsentIntent.js) already matches
 * the broader "wants exact/precise location" intent — this deliberately
 * does not duplicate that phrase list (drift risk). Instead it ANDs the
 * existing detector against a narrow, additional "specifically wants it as
 * Google Maps / satellite" signal. Because this is a strict AND, anything
 * this matches, the existing detector also matches — so checking this one
 * FIRST (see MCareOrb.jsx's sendAgentMessage) is safe, mutually exclusive
 * routing: only the narrower case is intercepted for the deterministic
 * satellite-map flow, and every other "exact location" phrasing keeps its
 * existing, unchanged behavior exactly.
 *
 * Pure and unit-testable.
 */
import { detectLocationConsentIntent } from './locationConsentIntent';

const GOOGLE_MAPS_TERMS = /\b(google maps|satellite (?:view|map|basemap))\b/i;

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function detectExactMapViewIntent(rawText) {
  const text = (rawText || '').trim();
  if (!text) return false;
  return detectLocationConsentIntent(text) && GOOGLE_MAPS_TERMS.test(text);
}
