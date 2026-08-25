/**
 * conversationalMode — "Conversational Mode" for M-Care: an always-listening,
 * barge-in-capable voice layer built on top of Talk Mode (talkMode.js).
 * Talk Mode gave M-Care spoken replies; this adds continuous listening so a
 * user can interrupt it mid-reply, the way a phone call works.
 *
 * Deliberately built on the browser's SpeechRecognition API (unlike
 * VoiceInputButton.jsx's push-to-talk, which avoids it for Firefox/Safari
 * reasons — see that file's header) because always-listening genuinely needs
 * a live, continuous stream of recognized speech, not a record-then-upload
 * round trip. isConversationalModeSupported() gates the whole feature behind
 * both SpeechRecognition (input) and speechSynthesis (output) being present,
 * so it never renders on browsers that can't do it (Firefox has zero
 * SpeechRecognition support; this is an accepted gap, not a bug).
 *
 * By the time any text exists to speak, the agent has already finished
 * generating the full reply (Base44's agent SDK delivers whole messages over
 * a socket, not a token stream) — so "barge-in" here only ever means
 * stopping playback of an already-finished reply, never interrupting the AI
 * mid-thought. That's a real platform constraint, not a shortcut.
 *
 * Pure/testable functions only, except startContinuousRecognition, which is
 * an isolated, impure lifecycle wrapper (same split as talkMode.js's
 * speakText) — it owns real SpeechRecognition instances and browser event
 * callbacks, so it isn't unit-tested beyond feature detection.
 */

import { isSpeechSupported } from './talkMode';
import { fuzzyScore } from './fuzzyMatch';

export function isRecognitionSupported() {
  return typeof window !== 'undefined'
    && !!(/** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition);
}

/** Conversational Mode needs both input (recognition) and output (synthesis). */
export function isConversationalModeSupported() {
  return isSpeechSupported() && isRecognitionSupported();
}

// ── Interruption classification ─────────────────────────────────────────
// Exact-set / anchored-prefix matching only, same discipline as talkMode's
// detectTalkModeCommand — deliberately not fuzzy, so an ordinary sentence
// that happens to contain "I mean" mid-thought is never misread as a
// correction.

const NEVER_MIND_PHRASES = new Set([
  'never mind',
  'nevermind',
  'forget it',
  'forget that',
  'cancel that',
  'skip it',
]);

// Anchored to the START of the utterance only — "I mean" is common filler
// mid-sentence ("I mean, is that safe?") and must not trigger a correction.
const CORRECTION_PREFIXES = [
  'no wait i meant',
  'no i meant',
  'actually i meant',
  'sorry i meant',
  'wait i meant',
  'scratch that i meant',
  'i meant',
];

function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?,]+$/, '');
}

/**
 * Classifies the utterance a user speaks right after interrupting M-Care.
 * Returns 'never_mind' (drop everything pending), 'correction' (replace only
 * the most recent pending topic), or 'new_topic' (the default — stack it).
 */
export function classifyInterruptionUtterance(text) {
  const normalized = normalize(text);
  if (!normalized) return 'new_topic';
  if (NEVER_MIND_PHRASES.has(normalized)) return 'never_mind';
  if (CORRECTION_PREFIXES.some((p) => normalized.startsWith(p))) return 'correction';
  return 'new_topic';
}

// ── Interrupted-intent stack ────────────────────────────────────────────
// Tracks what M-Care was cut off saying, client-side only — never sent back
// to the agent. Capped so a string of rapid interruptions can't grow this
// unboundedly; oldest entries are evicted first.

export const MAX_INTERRUPTED_INTENTS = 3;

export function pushInterruptedIntent(stack, intent, max = MAX_INTERRUPTED_INTENTS) {
  const next = [...(stack || []), intent];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Replaces only the most recent pending intent — used for a "no wait, I meant X" correction. */
export function replaceLastInterruptedIntent(stack, intent) {
  if (!stack || stack.length === 0) return [intent];
  return [...stack.slice(0, -1), intent];
}

export function clearInterruptedIntents() {
  return [];
}

/** Honest truncation for the "want me to finish that?" chip — never a claimed AI summary. */
export function shortTopicLabel(text, maxWords = 8) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

// ── Named task tracking ─────────────────────────────────────────────────
// A named task is the same interrupted-intent shape pushInterruptedIntent
// already produces, with one additive field: status. Callers (MCareOrb.jsx)
// decide when a task is paused/active/completed; this file only provides
// the shared vocabulary and the pure matching logic below, so a typo can't
// silently desync "what was pushed" from "what's filtered for."
export const TASK_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
});

// A bare "yes"/"no" only ever maps onto a real yes/no-shaped choice set —
// one option's own label literally starts with "yes", another with "no" —
// never guessed onto an unrelated pair of options that just happens to
// have two items (e.g. "Send my current location" / "Share my live
// location", neither of which is a yes/no answer).
const AFFIRM_WORDS = new Set([
  'yes', 'yeah', 'yep', 'yup', 'confirm', 'confirmed', 'correct', 'sure',
  'okay', 'ok', "that's right", 'do it', "let's do it", 'go ahead',
]);
const NEGATE_WORDS = new Set([
  'no', 'nope', 'nah', 'cancel', 'stop', "don't", 'negative', 'not now',
]);

/**
 * Deterministic mapping from a spoken utterance onto one of the real,
 * currently-offered {{choices:...}} labels on the last assistant message —
 * so a spoken "yes" during an active booking/payment/consent prompt does
 * exactly what tapping the chip does, nothing more. Tries a direct fuzzy
 * match against the real labels first (so "pay in full" matches "Pay in
 * Full" directly); only falls back to bare yes/no recognition for an
 * actual yes/no-shaped pair. Returns the matched label's exact text, or
 * null if nothing matches.
 *
 * @param {string} spokenText
 * @param {string[]} choiceLabels
 * @returns {string | null}
 */
export function matchSpokenChoice(spokenText, choiceLabels) {
  const text = normalize(spokenText);
  if (!text || !Array.isArray(choiceLabels) || choiceLabels.length === 0) return null;
  // A bare, exact yes/no-shaped word is checked FIRST against a real
  // yes/no-labeled option — before general fuzzy scoring, which can
  // otherwise be thrown off by an unrelated label that happens to contain
  // "no" as a substring (e.g. fuzzyScore treats "no" as a substring hit
  // inside "...send help now").
  const yesLabel = choiceLabels.find((l) => /^yes\b/i.test((l || '').trim()));
  const noLabel = choiceLabels.find((l) => /^no\b/i.test((l || '').trim()));
  if (yesLabel && AFFIRM_WORDS.has(text)) return yesLabel;
  if (noLabel && NEGATE_WORDS.has(text)) return noLabel;
  const best = choiceLabels
    .map((label) => ({ label, score: fuzzyScore(text, label) }))
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 70) return best.label;
  return null;
}

// Specific, anchored phrasings only — deliberately not a loose keyword
// match, so an ordinary sentence that happens to mention "back" or "last"
// is never mistaken for a resume request.
const RESUME_LAST_PHRASES = [
  /\bcontinue (?:with )?(?:the )?last (?:task|thing|topic)\b/i,
  /\bwhat was i (?:working on|doing|asking about)\b/i,
  /\bback to what i was (?:doing|saying|asking)\b/i,
  /\bwhere were we\b/i,
  /\bpick (?:back )?up where (?:we|i) left off\b/i,
];
const RESUME_NAMED_PATTERN = /\b(?:go back to|back to|return to|resume) (?:the )?(.+?)(?:\s+(?:task|thing|topic))?[.!?]*$/i;

/**
 * Detects a resume request in a finalized utterance — "go back to the
 * flight thing" / "continue the last task" / "what was I working on".
 * Returns { type: 'named', target } for a named request (target is the raw
 * phrase to fuzzy-match against paused task labels), { type: 'last' } for a
 * generic "the last/previous thing" request, or null if this isn't a
 * resume request at all.
 *
 * @param {string} text
 * @returns {{ type: 'named', target: string } | { type: 'last' } | null}
 */
export function detectResumeIntent(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  if (RESUME_LAST_PHRASES.some((re) => re.test(trimmed))) return { type: 'last' };
  const named = trimmed.match(RESUME_NAMED_PATTERN);
  if (named && named[1] && named[1].trim()) return { type: 'named', target: named[1].trim() };
  return null;
}

/**
 * Resolves a detected resume intent against the real paused-task stack.
 * 'last' pops the most recently paused task (tasks is expected in push
 * order, oldest first, matching pushInterruptedIntent's own append
 * convention); 'named' fuzzy-matches the target phrase against each paused
 * task's own real label (fullText) via the shared fuzzyMatch.js scorer —
 * never a second, local scorer. Returns the matched task object, or null.
 *
 * @param {Array<{status?: string, fullText?: string, label?: string}>} tasks
 * @param {{ type: 'named', target: string } | { type: 'last' } | null} resumeIntent
 */
export function resumeTaskFromLabel(tasks, resumeIntent) {
  if (!resumeIntent) return null;
  const paused = (tasks || []).filter((t) => t.status === TASK_STATUS.PAUSED);
  if (paused.length === 0) return null;
  if (resumeIntent.type === 'last') return paused[paused.length - 1];
  if (resumeIntent.type === 'named') {
    const best = paused
      .map((t) => ({ t, score: fuzzyScore(resumeIntent.target, t.fullText || t.label || '') }))
      .sort((a, b) => b.score - a.score)[0];
    return best && best.score >= 45 ? best.t : null;
  }
  return null;
}

// ── Barge-in debounce ────────────────────────────────────────────────────
// Standard SpeechRecognition gives no volume/energy signal, only recognized
// text — so a single stray syllable picked up from M-Care's own voice
// (imperfect echo cancellation is a real risk without headphones) could
// otherwise look identical to a real interruption. These defaults are a
// first guess Portia will need to retune after testing on real hardware —
// deliberately named/exported rather than buried, so that's easy to find.
export const BARGE_IN_MIN_EVENTS = 2;
export const BARGE_IN_MIN_CHARS = 4;

/**
 * Requires MIN_EVENTS consecutive, non-shrinking interim results before
 * confirming a barge-in — a single isolated blip doesn't count; sustained
 * recognized speech does. observe() returns true once the threshold is hit
 * (only ever once per reset — call reset() after acting on it).
 */
export function createBargeInDetector({ minEvents = BARGE_IN_MIN_EVENTS, minChars = BARGE_IN_MIN_CHARS } = {}) {
  let events = 0;
  let lastLength = 0;
  let confirmed = false;

  return {
    observe(text) {
      if (confirmed) return true;
      const trimmed = (text || '').trim();
      if (trimmed.length < minChars) {
        events = 0;
        lastLength = 0;
        return false;
      }
      events = trimmed.length >= lastLength ? events + 1 : 1;
      lastLength = trimmed.length;
      if (events >= minEvents) confirmed = true;
      return confirmed;
    },
    reset() {
      events = 0;
      lastLength = 0;
      confirmed = false;
    },
  };
}

// ── Turn-taking silence nudge ────────────────────────────────────────────
// A starting guess — real continuous-recognition silence-timeout behavior
// varies by browser/OS and can't be confirmed from a checkout with no live
// Base44 session; Portia will need to tune this after a real test.
export const SILENCE_NUDGE_MS = 4000;
export const MAX_SILENCE_NUDGES = 2;
export const SILENCE_NUDGE_TEXT = "I'm still here — what would you like to know?";

// ── Continuous recognition lifecycle (impure, not unit-tested) ─────────

// A 'network' SpeechRecognition error (the cloud-backed engine losing its
// connection to the recognition service) fires on any brief connectivity
// blip — a WiFi hiccup, a cellular handoff — not just a genuine, sustained
// outage. Treating it as instantly unrecoverable killed Conversational Mode
// on the very first blip. These give it the same silent-retry treatment
// 'no-speech'/'aborted' already get, with a longer backoff (a real WiFi drop
// commonly takes a few seconds to resolve) and a bounded retry count so a
// genuinely sustained outage still gives up and surfaces the honest
// "you're offline" message. Starting guesses, same as this file's other
// tuning constants (SILENCE_NUDGE_MS, BARGE_IN_MIN_EVENTS) — need live-device
// tuning.
export const NETWORK_ERROR_MAX_RETRIES = 6;
export const NETWORK_RETRY_BACKOFF_MS = 1500;

/**
 * Tracks consecutive 'network' recognition errors so a brief blip can retry
 * silently while a sustained outage still gives up after maxRetries. Any
 * non-'network' error code resets the streak (a routine no-speech/aborted
 * shouldn't count against the network retry budget). onSuccess() — called on
 * an actual recognized result — proves the connection is genuinely healthy
 * again and resets the streak, the same "only a real signal clears it" shape
 * as createBargeInDetector above.
 */
export function createNetworkErrorTracker(maxRetries = NETWORK_ERROR_MAX_RETRIES) {
  let streak = 0;
  return {
    // Returns true while this error should be treated as transient (retry),
    // false once the retry budget for consecutive network errors is spent.
    onError(code) {
      if (code !== 'network') { streak = 0; return true; }
      streak += 1;
      return streak <= maxRetries;
    },
    onSuccess() { streak = 0; },
  };
}

const MAX_AUTO_RESTARTS = 20;
const RESTART_BACKOFF_MS = 400;

/**
 * Wraps SpeechRecognition with continuous:true + interimResults:true and an
 * auto-restart loop (browsers stop continuous recognition on their own
 * silence/timeout despite the flag — it has to be manually restarted to stay
 * "always listening"). Capped restarts + backoff so a revoked mic permission
 * can't spin forever. Returns a stop() function.
 *
 * @param {{ lang?: string, onInterim?: (text: string) => void, onFinal?: (text: string) => void, onListeningChange?: (listening: boolean) => void, onUnrecoverableError?: (reason: string) => void }} [opts]
 */
export function startContinuousRecognition(opts) {
  const { lang = 'en-US', onInterim, onFinal, onListeningChange, onUnrecoverableError } = opts || {};

  if (!isRecognitionSupported()) {
    onUnrecoverableError?.('unsupported');
    return () => {};
  }

  const SpeechRecognitionCtor = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;
  let recognition = null;
  let stopped = false;
  let restartCount = 0;
  let restartTimer = null;
  const networkErrorTracker = createNetworkErrorTracker();
  let lastErrorWasNetwork = false;

  const clearRestartTimer = () => {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  };

  const attach = () => {
    recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      restartCount = 0;
      onListeningChange?.(true);
    };

    recognition.onresult = (event) => {
      // Any recognized result — even interim — proves the connection to the
      // recognition service is genuinely alive right now.
      networkErrorTracker.onSuccess();
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || '';
        if (result.isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) onInterim?.(interim);
      if (final.trim()) onFinal?.(final.trim());
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      // 'no-speech' and 'aborted' are routine — the browser stops on
      // silence; the same onend auto-restart handles them.
      if (code === 'no-speech' || code === 'aborted') { lastErrorWasNetwork = false; return; }
      if (code === 'network') {
        lastErrorWasNetwork = true;
        // Transient blip — let onend's restart loop retry it (with a longer
        // backoff, below) instead of tearing the session down immediately.
        if (networkErrorTracker.onError('network')) return;
      } else {
        lastErrorWasNetwork = false;
      }
      // Permission revoked / mic unavailable / any other real error — or a
      // network error whose retry budget is now spent — is unrecoverable.
      stopped = true;
      onListeningChange?.(false);
      onUnrecoverableError?.(code || 'unknown-error');
    };

    recognition.onend = () => {
      onListeningChange?.(false);
      if (stopped) return;
      if (restartCount >= MAX_AUTO_RESTARTS) {
        onUnrecoverableError?.('too-many-restarts');
        return;
      }
      restartCount += 1;
      clearRestartTimer();
      const delay = lastErrorWasNetwork ? NETWORK_RETRY_BACKOFF_MS : RESTART_BACKOFF_MS;
      restartTimer = setTimeout(() => {
        if (!stopped) attach();
      }, delay);
    };

    try {
      recognition.start();
    } catch {
      // start() throws if called while a session is already active — the
      // existing session's own onend will still fire and drive the restart.
    }
  };

  attach();

  return () => {
    stopped = true;
    clearRestartTimer();
    try { recognition?.stop(); } catch { /* no-op */ }
  };
}
