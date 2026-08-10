/**
 * distressDetection — lightweight, privacy-respecting distress-signal
 * detection for M-Care's always-on listening layer.
 *
 * When Conversational Mode is active, every final transcript is passed
 * through detectDistressSignal(). A hit triggers the Silent Guardian
 * protocol: an audit-trail entry is written and a gentle, non-alarming
 * welfare check is offered to the user — *not* an immediate emergency
 * dispatch, because ambient speech recognition produces false positives
 * (TV, conversation, song lyrics) and auto-dispatching security on a
 * misheard word would be dangerous. Real escalation still flows through
 * the existing runSilentSafetyEscalation ladder when a check-in is missed.
 *
 * Two-tier design so M-Care stays "never intrusive":
 *   1. EXACT_CRIES — short standalone shouts ("help", "help me",
 *      "emergency"). Matched only when the *whole* utterance is the cry,
 *      so "can you help me find a doctor" never fires.
 *   2. CONTAINS_PATTERNS — inherently-distress phrases specific enough to
 *      be safe as substrings ("i'm scared", "i can't breathe",
 *      "i'm being followed"). Word-boundary matched so "i helped myself"
 *      never matches "i'm hurt".
 *
 * Pure and unit-testable.
 */

// Whole-utterance shouts. The trimmed, punctuation-stripped transcript must
// equal one of these exactly (case-insensitive) to fire.
const EXACT_CRIES = new Set([
  'help', 'help me', 'help please', 'please help', 'please help me',
  'help me please', 'i need help', 'emergency', "it's an emergency",
  'call 911', 'call the police', 'call police', 'call an ambulance',
  'get help', 'somebody help', 'someone help', 'somebody help me',
  'someone help me',
]);

// Inherently-distress phrases, safe to match as substrings because they're
// specific enough that they won't appear in ordinary medical-travel chat.
// Ordered by severity; the first match wins.
const CONTAINS_PATTERNS = [
  {
    category: 'immediate_danger',
    phrases: [
      'being attacked', "i'm being attacked", 'i am being attacked',
      'being followed', "i'm being followed", 'i am being followed',
      'being robbed', "i'm being robbed", 'i am being robbed',
      'hurting me', "he's hurting me", 'he is hurting me',
      "she's hurting me", 'she is hurting me',
      "they're hurting me", 'they are hurting me',
      "i'm in danger", 'i am in danger',
      "don't let them", 'do not let them',
      'i am being attacked', "i'm being attacked",
    ],
  },
  {
    category: 'fear',
    phrases: [
      "i'm scared", 'i am scared', "i'm afraid", 'i am afraid',
      "i don't feel safe", 'i do not feel safe', 'i feel unsafe',
      'i am not safe', "i'm not safe",
      'something is wrong', "something's wrong", 'something feels wrong',
      'i need to get out of here',
    ],
  },
  {
    category: 'medical',
    phrases: [
      "i'm hurt", 'i am hurt', "i'm in pain", 'i am in pain',
      "i can't breathe", 'i cannot breathe', 'i feel dizzy', 'i feel faint',
      "i'm bleeding", 'i am bleeding', 'chest pain',
      "i think i'm dying", "i'm going to pass out", 'i am going to pass out',
    ],
  },
];

function matchesPhrase(text, phrase) {
  // Leading lookbehind + trailing lookahead — both must be non-letters (or
  // string edge) so "i helped myself" never matches "i'm hurt" and "helped"
  // never matches "help".
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'iu');
  return re.test(text);
}

/**
 * @param {string} rawText
 * @returns {{ category: string, phrase: string } | null}
 */
export function detectDistressSignal(rawText) {
  const text = (rawText || '').trim().toLowerCase().replace(/[.!?,;:]+$/, '').trim();
  if (!text) return null;
  if (EXACT_CRIES.has(text)) return { category: 'immediate_danger', phrase: text };
  for (const { category, phrases } of CONTAINS_PATTERNS) {
    for (const phrase of phrases) {
      if (matchesPhrase(text, phrase)) return { category, phrase };
    }
  }
  return null;
}

// A calm, non-alarming check-in M-Care speaks/shows when a signal is heard —
// never "EMERGENCY DETECTED", always a soft confirmation that invites the
// user to confirm or wave it off.
export function distressWelfarePrompt(signal) {
  if (!signal) return null;
  if (signal.category === 'medical') return "I heard that — are you hurt? Tap here if you need me to get help to you right now.";
  if (signal.category === 'fear') return "I heard you — are you safe right now? Tap here and I'll start getting help to you.";
  return "I heard 'help' — do you need me to get help to you right now? Tap here if so.";
}