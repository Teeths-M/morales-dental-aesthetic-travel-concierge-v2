/**
 * neuralSpeech — human-sounding voice output for M-Care's Talk Mode /
 * Conversational Mode, via speakMcareText (Core.GenerateSpeech) — the same
 * proven primitive already powering the per-message "Listen" button
 * (MessageBubble.jsx's SpeakButton) and the live walkieTalkieTranslate
 * feature. talkMode.js's speakText (window.speechSynthesis) stays exactly
 * as it was — the zero-network, always-available fallback — and is what
 * this file falls back to on any network error, timeout, empty response, or
 * playback failure, so a flaky connection degrades to the familiar robotic
 * voice instead of going silent mid-demo.
 *
 * Deliberately NOT added to talkMode.js itself — that file is intentionally
 * pure/testable with no network or API-client dependency; this file owns
 * the network call and Audio() playback, so it's impure and isolated the
 * same way conversationalMode.js's startContinuousRecognition is.
 *
 * No native word-boundary event exists for an <audio> element (unlike
 * SpeechSynthesisUtterance's onboundary), so the word-reveal here is an
 * approximation: once the audio's real duration is known, words are paced
 * evenly across it. Close enough to feel synced, not a claim of exact timing.
 */
import { base44 } from '@/api/base44Client';
import { speakText, stopSpeaking } from './talkMode';

// 15s — neural TTS (Core.GenerateSpeech) generation for a full reply commonly
// takes 5–10s. The old 4s timer fired too early and dropped M-Care onto the
// Web Speech API fallback, which has Chrome's ~15s speechSynthesis
// truncation bug: the utterance cuts off mid-message AND onend never fires,
// wedging speechSynthesis so every subsequent reply plays with NO voice —
// the exact "voice cuts off, then M-care goes back to typing with no voice"
// failure a blind user hits. The neural path returns a real <audio> file
// that plays in full with no truncation bug, so giving it the time to finish
// is what keeps Talk Mode speaking aloud on every reply, not just the first.
const REQUEST_TIMEOUT_MS = 15000;

// Module-level, like talkMode.js's own speechSynthesis singleton — only one
// neural utterance can meaningfully be "active" at a time, and callers
// (MCareOrb.jsx) don't need to hold onto individual cancel functions to stop
// whatever's currently playing.
let activeCancel = null;

// Synchronous, module-level "M-Care is speaking right now" signal — independent
// of React state, so the always-on mic in Conversational Mode can read it the
// instant any neural utterance starts/stops, with no render-cycle gap. Set
// true the moment speakTextNeural begins (covers the auto-speak reply, the
// running-tool ack, the voice-message cue, the distress welfare check — every
// path that plays M-Care's voice), and false the moment it ends, errors, is
// cancelled, or falls back to the browser voice (which keeps it true until
// that utterance ends). This is what stops the mic from transcribing M-Care's
// own spoken reply back into the input field — the React `speaking` state the
// guard used to rely on is async (one render behind) and several speak paths
// never set it at all.
let neuralSpeaking = false;

export function isNeuralSpeaking() { return neuralSpeaking; }

export function stopNeuralSpeech() {
  if (activeCancel) {
    const cancel = activeCancel;
    activeCancel = null;
    cancel();
  }
}

/** Stops both the neural and browser-TTS paths — the one call MCareOrb needs at every interruption point. */
export function stopAllSpeech() {
  stopNeuralSpeech();
  stopSpeaking();
}

/**
 * Speaks `text` via M-Care's neural voice; falls back to talkMode.js's
 * speakText (browser TTS) on any network error, timeout, empty audio, or
 * playback failure. Same return contract as speakText — a cancel function.
 *
 * @param {string} text
 * @param {{ rate?: number, language?: string, onWordBoundary?: (revealedWordCount: number) => void, onEnd?: () => void, onError?: () => void }} [options]
 */
export function speakTextNeural(text, options) {
  stopNeuralSpeech();
  const { rate = 0.9, language = 'en', onWordBoundary, onEnd, onError } = options || {};
  if (!text?.trim()) { onError?.(); return () => {}; }

  let cancelled = false;
  let fallbackTriggered = false;
  let audio = null;
  let revealInterval = null;
  let fallbackCancelFn = null;
  let timeoutId = null;

  const clearReveal = () => {
    if (revealInterval) { clearInterval(revealInterval); revealInterval = null; }
  };

  // Wraps the caller's onEnd/onError so the speaking flag clears the moment
  // any utterance (neural or browser-fallback) actually finishes — not a
  // render later. Both the neural audio's onended and the fallback's onEnd
  // route through here.
  const wrapEnd = (cb) => () => { neuralSpeaking = false; cb?.(); };
  const wrapError = (cb) => () => { neuralSpeaking = false; cb?.(); };

  const cancelFn = () => {
    if (activeCancel === cancelFn) activeCancel = null;
    cancelled = true;
    neuralSpeaking = false;
    clearTimeout(timeoutId);
    clearReveal();
    if (audio) { try { audio.pause(); } catch { /* no-op */ } }
    if (fallbackCancelFn) fallbackCancelFn();
  };
  activeCancel = cancelFn;
  neuralSpeaking = true;

  const runFallback = () => {
    if (cancelled || fallbackTriggered) return;
    fallbackTriggered = true;
    clearTimeout(timeoutId);
    // talkMode.js's speakText now owns cancellation via stopSpeaking().
    if (activeCancel === cancelFn) activeCancel = null;
    // Keep neuralSpeaking true through the fallback — the browser voice is
    // still M-Care talking, so the mic must keep ignoring it.
    fallbackCancelFn = speakText(text, { rate, onWordBoundary, onEnd: wrapEnd(onEnd), onError: wrapError(onError) });
  };

  timeoutId = setTimeout(runFallback, REQUEST_TIMEOUT_MS);

  (async () => {
    let res;
    try {
      res = await base44.functions.invoke('speakMcareText', { text: text.trim(), language });
    } catch {
      runFallback();
      return;
    }
    if (cancelled || fallbackTriggered) return;
    clearTimeout(timeoutId);

    const audioUrl = res?.data?.audio_url;
    if (!audioUrl) { runFallback(); return; }

    try {
      audio = new Audio(audioUrl);
    } catch {
      runFallback();
      return;
    }
    audio.playbackRate = rate;

    const words = text.split(/\s+/).filter(Boolean);
    const totalWords = words.length;

    audio.onloadedmetadata = () => {
      if (cancelled) return;
      const durationMs = (audio.duration || 0) * 1000;
      if (Number.isFinite(durationMs) && durationMs > 0 && totalWords > 0) {
        const msPerWord = durationMs / totalWords;
        let revealed = 0;
        revealInterval = setInterval(() => {
          revealed += 1;
          onWordBoundary?.(Math.min(revealed, totalWords));
          if (revealed >= totalWords) clearReveal();
        }, msPerWord);
      }
    };
    audio.onended = () => {
      clearReveal();
      if (activeCancel === cancelFn) activeCancel = null;
      if (!cancelled) { neuralSpeaking = false; onEnd?.(); }
    };
    audio.onerror = () => { clearReveal(); runFallback(); };

    try {
      await audio.play();
    } catch {
      runFallback();
    }
  })();

  return cancelFn;
}