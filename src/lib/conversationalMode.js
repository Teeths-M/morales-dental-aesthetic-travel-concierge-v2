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
      // 'no-speech' and 'aborted' are routine — the browser stops on
      // silence; the same onend auto-restart handles them. Anything else
      // (permission revoked, mic unavailable) is unrecoverable.
      if (event?.error === 'no-speech' || event?.error === 'aborted') return;
      stopped = true;
      onListeningChange?.(false);
      onUnrecoverableError?.(event?.error || 'unknown-error');
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
      restartTimer = setTimeout(() => {
        if (!stopped) attach();
      }, RESTART_BACKOFF_MS);
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
