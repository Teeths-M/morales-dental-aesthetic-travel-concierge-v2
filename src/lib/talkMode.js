/**
 * talkMode — client-side, browser-native voice output for M-Care's demo Talk
 * Mode. Deliberately built on window.speechSynthesis (Web Speech API), not a
 * server call: zero network dependency, zero API keys, zero integration
 * credits, works instantly offline once the page has loaded — the reliable
 * choice for a live stage demo where a dropped network call would be
 * catastrophic. This is separate from, and does not replace, the existing
 * per-message "Listen" button (MessageBubble.jsx's SpeakButton), which still
 * uses the server-side Core.GenerateSpeech path.
 *
 * Pure/testable functions only — no React, no DOM assumptions beyond the
 * browser's own speechSynthesis global.
 */

export function isSpeechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';
}

export function stopSpeaking() {
  if (isSpeechSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* no-op */ }
  }
}

/**
 * Strips M-Care's chat tokens ({{choices:...}}, {{maps:...}}, {{qr:...}})
 * and markdown emphasis before speaking — otherwise the browser would read
 * the raw token syntax aloud. A deliberately separate, simplified copy of
 * MessageBubble.jsx's own token-stripping regexes (not imported from there)
 * so this file never touches that already-shipped, hot rendering path.
 */
export function extractSpeakableText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\{\{choices:[\s\S]*?\}\}/g, '')
    .replace(/\{\{maps:[^|]*\|[\s\S]*?\}\}/g, '')
    .replace(/\{\{qr:[^|]*\|[\s\S]*?\}\}/g, '')
    .replace(/```([\s\S]*?)```/g, (_, c) => c.replace(/^\n/, ''))
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .trim();
}

const TALK_MODE_ON_PHRASES = new Set([
  'toggle talk mode',
  'turn on talk mode',
  'enable voice mode',
  'speak to me',
  'talk to me',
]);
const TALK_MODE_OFF_PHRASES = new Set([
  'toggle talk mode off',
  'turn off talk mode',
  'disable voice mode',
  'stop talking',
  'silent mode',
]);

function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?]+$/, '');
}

/**
 * Exact-phrase match only — deliberately not fuzzy/substring matching, so a
 * real question that happens to contain one of these words never gets
 * mistaken for a mode-toggle command. Returns 'on' | 'off' | null.
 */
export function detectTalkModeCommand(rawText) {
  const normalized = normalize(rawText);
  if (!normalized) return null;
  if (TALK_MODE_OFF_PHRASES.has(normalized)) return 'off';
  if (TALK_MODE_ON_PHRASES.has(normalized)) return 'on';
  return null;
}

// ~170 words/minute is a natural speaking pace; the fallback timer paces
// reveals at this rate (adjusted by `rate`) when onboundary never fires.
const FALLBACK_WPM = 170;
const FALLBACK_ARM_DELAY_MS = 600;

/**
 * Speaks `text` aloud and reports word-reveal progress as it goes.
 *
 * Always cancels any in-progress utterance first, so overlapping speech from
 * a fast-arriving new message can never happen. Uses the browser's own
 * SpeechSynthesisUtterance `onboundary` word events when available; if none
 * fire within FALLBACK_ARM_DELAY_MS of starting (some browsers, notably
 * Safari, don't reliably fire them), falls back to a timed reveal so the
 * demo never gets stuck showing zero words while audio is clearly playing.
 *
 * @param {string} text
 * @param {{ rate?: number, onWordBoundary?: (revealedWordCount: number) => void, onEnd?: () => void, onError?: () => void }} [options]
 * @returns {() => void} a cancel function
 */
export function speakText(text, options) {
  const { rate = 0.9, onWordBoundary, onEnd, onError } = options || {};
  if (!isSpeechSupported() || !text?.trim()) {
    onError?.();
    return () => {};
  }
  stopSpeaking();

  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  let boundaryFired = false;
  let fallbackTimer = null;
  let fallbackInterval = null;

  const clearFallback = () => {
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
    if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
  };

  const armFallback = () => {
    fallbackTimer = setTimeout(() => {
      if (boundaryFired) return;
      const msPerWord = (60000 / FALLBACK_WPM) / rate;
      let revealed = 0;
      fallbackInterval = setInterval(() => {
        revealed += 1;
        onWordBoundary?.(revealed);
        if (revealed >= totalWords) clearFallback();
      }, msPerWord);
    }, FALLBACK_ARM_DELAY_MS);
  };

  let utterance;
  try {
    utterance = new window.SpeechSynthesisUtterance(text);
  } catch {
    onError?.();
    return () => {};
  }
  utterance.rate = rate;

  utterance.onboundary = (event) => {
    if (event.name && event.name !== 'word') return;
    boundaryFired = true;
    clearFallback();
    const spokenSoFar = text.slice(0, event.charIndex).split(/\s+/).filter(Boolean).length;
    onWordBoundary?.(Math.min(spokenSoFar + 1, totalWords));
  };
  utterance.onend = () => { clearFallback(); onEnd?.(); };
  utterance.onerror = () => { clearFallback(); onError?.(); };

  armFallback();
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    clearFallback();
    onError?.();
    return () => {};
  }

  return () => { clearFallback(); stopSpeaking(); };
}
