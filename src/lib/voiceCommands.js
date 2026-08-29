/**
 * voiceCommands — the natural-language command layer for M-Care's Voice &
 * Privacy Ecosystem.
 *
 * The user controls M-Care's modality, privacy, and language by *speaking*
 * (or typing) short phrases — "M, switch to private", "M, respond in
 * Spanish", "M, always listen" — with zero menus or settings pages. This
 * module parses those utterances deterministically, client-side, and maps
 * them to a typed action the orb executes immediately. It never sends the
 * command to the real agent conversation — like talkMode's
 * detectTalkModeCommand, a genuine question that happens to contain a
 * command word must never be misread as a command, so matching is
 * exact-phrase / anchored-prefix only, never fuzzy substring.
 *
 * Pure and unit-testable — no React, no DOM, no network.
 */

import { detectTalkModeCommand } from './talkMode';

// ── Normalization ───────────────────────────────────────────────────────────
// Strips an optional wake word ("M", "M,", "hey M", "Morales") and trailing
// punctuation, lowercases. Kept separate from talkMode's own normalize so
// the wake-word strip is the only behavioral addition here.
const WAKE_PREFIXES = [
  'morales',
  'hey m',
  'hey morales',
  'm',
];

function stripWakeWord(text) {
  let s = (text || '').trim().toLowerCase();
  // Remove a leading wake word optionally followed by a comma/colon/space.
  for (const w of WAKE_PREFIXES) {
    const re = new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s,:]+`);
    if (re.test(s)) { s = s.replace(re, ''); break; }
  }
  return s.replace(/[.!?,;:]+$/, '').trim();
}

// ── Private Mode ────────────────────────────────────────────────────────────
const PRIVATE_ON_PHRASES = new Set([
  'switch to private',
  'go private',
  'private mode',
  'activate private mode',
  'pause monitoring',
  'pause check-ins',
  'pause check ins',
  'stop monitoring',
  'go dark',
]);
const PRIVATE_OFF_PHRASES = new Set([
  'resume monitoring',
  'resume check-ins',
  'resume check ins',
  'exit private',
  'exit private mode',
  'stop private mode',
  'turn off private mode',
  'disable private mode',
  'resume',
  'i am back',
  "i'm back",
]);

// ── Modality (voice-only / voice+text / text-only) ──────────────────────────
// Mapped onto Talk Mode states: "voice message only" and "voice and text" both
// want spoken replies (Talk Mode on); "text only" wants silence (Talk Mode
// off). The distinction between "voice only" (no on-screen text) and "voice +
// text" is a rendering concern owned by MessageBubble — here we only decide
// whether the voice loop is on or off.
const MODALITY_VOICE_ON = new Set([
  'voice message only',
  'voice only',
  'voice mode',
  'switch to voice',
  'switch to voice message',
  'voice and text',
  'voice plus text',
]);
const MODALITY_TEXT_ONLY = new Set([
  'text only',
  'text mode',
  'switch to text',
  'stop voice',
  'turn off voice',
]);

// ── Always-on listening ─────────────────────────────────────────────────────
const LISTEN_ON_PHRASES = new Set([
  'always listen',
  'always listening',
  'keep listening',
  'start listening',
  'listen to me',
]);
const LISTEN_OFF_PHRASES = new Set([
  'stop listening',
  'stop always listening',
  'stop the mic',
  'mute the mic',
]);

// ── "Hey M-Care" background wake phrase ─────────────────────────────────────
// Distinct from LISTEN_ON/OFF_PHRASES above: "always listen" turns on
// Conversational Mode WHILE the panel is already open. This instead opts
// into a background SpeechRecognition session (MCareOrb.jsx, wakePhrase.js)
// that runs even while the panel is closed, listening only for "Hey
// M-Care" itself — a materially different, longer-lived capability that
// deserves its own honest confirm text (see CONFIRM below) rather than
// reusing listen_on/off's shorter copy.
const WAKE_PHRASE_ON_PHRASES = new Set([
  'enable wake phrase',
  'turn on wake phrase',
  'wake phrase on',
  'wake word on',
  'enable hey m-care',
  'enable wake word',
  'listen for hey m-care',
  'always listen for my wake word',
]);
const WAKE_PHRASE_OFF_PHRASES = new Set([
  'disable wake phrase',
  'turn off wake phrase',
  'wake phrase off',
  'wake word off',
  'disable hey m-care',
  'disable wake word',
  'stop listening for hey m-care',
]);

// ── Surrounding Awareness ────────────────────────────────────────────────────
// An explicit ask ("watch my surroundings") is already clear consent — arm
// immediately, same as Private Mode, no separate tap-confirm needed. A
// *passive* mention ("I'm walking around an unfamiliar city") is handled
// separately, agent-side, with a narrated {{choices:...}} offer before
// anything arms — see RULE (SURROUNDING AWARENESS) in m_care.jsonc.
const SURROUNDING_ON_PHRASES = new Set([
  'watch my surroundings',
  'keep an eye on my surroundings',
  'keep watch on my surroundings',
  'surrounding awareness on',
  'turn on surrounding awareness',
  'enable surrounding awareness',
]);
const SURROUNDING_OFF_PHRASES = new Set([
  'stop watching my surroundings',
  'turn off surrounding awareness',
  'disable surrounding awareness',
  'stop surroundings alerts',
  'stop surrounding awareness',
]);

// ── Language selection ─────────────────────────────────────────────────────
// "M, respond in Spanish" / "M, speak in French" / "M, switch to Portuguese".
// Maps a human language name to the i18n locale code used elsewhere in the app
// (src/i18n.js SUPPORTED_LANGUAGES). Keep this list in sync with that file.
const LANGUAGE_NAMES = {
  english: 'en', eng: 'en',
  spanish: 'es', espanol: 'es', español: 'es',
  french: 'fr', francais: 'fr', français: 'fr',
  german: 'de', deutsch: 'de',
  italian: 'it', italiano: 'it',
  portuguese: 'pt', portugues: 'pt', português: 'pt',
  arabic: 'ar', عربي: 'ar', العربية: 'ar',
  chinese: 'zh', mandarin: 'zh', 中文: 'zh',
  turkish: 'tr', türkçe: 'tr', turkce: 'tr',
  thai: 'th', ไทย: 'th',
  korean: 'ko', 한국어: 'ko',
};
const LANGUAGE_PREFIXES = [
  'respond in',
  'speak in',
  'reply in',
  'answer in',
  'switch to',
  'talk to me in',
  'switch language to',
  'set language to',
  'change language to',
];

function matchLanguage(normalized) {
  for (const pre of LANGUAGE_PREFIXES) {
    if (normalized.startsWith(pre + ' ')) {
      const rest = normalized.slice(pre.length + 1).trim();
      // Direct name match first.
      if (LANGUAGE_NAMES[rest]) return LANGUAGE_NAMES[rest];
      // "spanish please" / "spanish." already stripped — try first word.
      const firstWord = rest.split(/\s+/)[0];
      if (LANGUAGE_NAMES[firstWord]) return LANGUAGE_NAMES[firstWord];
      return null; // a language command whose language we don't recognize
    }
  }
  return undefined; // not a language command at all
}

// ── Confirm text (double-quoted to allow apostrophes) ────────────────────────
const CONFIRM = {
  talk_on: "Talk mode activated. I'll respond in voice.",
  talk_off: "Talk mode disabled. I'll respond in text only.",
  private_on: "Private mode activated. I won't monitor your journey until you resume.",
  private_off: "Monitoring resumed. I have your back again.",
  modality_voice: "Voice mode on. I'll speak my replies aloud.",
  modality_text: "Text mode on. I'll keep my replies on screen only.",
  listen_on: "Always listening on. I'll keep an ear out for you.",
  listen_off: "Listening stopped. I'll wait for you to tap the mic.",
  wake_phrase_on: "Wake phrase on. While this tab is open and your screen is on, I'll listen for \"Hey M-Care\" and open myself the moment you say it — same as tapping me, just hands-free. It stops the instant you close this tab or lock your screen, and you can turn it off any time by saying \"disable wake phrase.\"",
  wake_phrase_off: "Wake phrase off. I'll wait for you to open me yourself.",
  surrounding_on: "Done — I'll keep an eye on your surroundings and let you know if I spot something useful nearby.",
  surrounding_off: "Surrounding awareness is off. I'll stop watching for nearby places.",
};

/**
 * Parses a user utterance into a typed command, or null if it isn't one.
 *
 * Returns one of:
 *   { type: 'talk_mode',    value: 'on'|'off', confirmText }
 *   { type: 'private_mode', value: 'on'|'off', confirmText }
 *   { type: 'modality',     value: 'voice'|'text', confirmText }
 *   { type: 'always_listen',value: 'on'|'off', confirmText }
 *   { type: 'surrounding_awareness', value: 'on'|'off', confirmText }
 *   { type: 'language',     value: <locale>|null, confirmText }
 *
 * @param {string} rawText
 * @returns {{type: string, value: any, confirmText: string} | null}
 */
export function parseMcareCommand(rawText) {
  const normalized = stripWakeWord(rawText);
  if (!normalized) return null;

  // ── Talk Mode (delegate to the proven exact-phrase detector, then the
  // wake-word-stripped variant of the same phrases) ──
  const talk = detectTalkModeCommand(normalized) || detectTalkModeCommand(rawText);
  if (talk === 'on') return { type: 'talk_mode', value: 'on', confirmText: CONFIRM.talk_on };
  if (talk === 'off') return { type: 'talk_mode', value: 'off', confirmText: CONFIRM.talk_off };

  // ── Private Mode ──
  if (PRIVATE_ON_PHRASES.has(normalized)) return { type: 'private_mode', value: 'on', confirmText: CONFIRM.private_on };
  if (PRIVATE_OFF_PHRASES.has(normalized)) return { type: 'private_mode', value: 'off', confirmText: CONFIRM.private_off };

  // ── Modality ──
  if (MODALITY_VOICE_ON.has(normalized)) return { type: 'modality', value: 'voice', confirmText: CONFIRM.modality_voice };
  if (MODALITY_TEXT_ONLY.has(normalized)) return { type: 'modality', value: 'text', confirmText: CONFIRM.modality_text };

  // ── Always-on listening ──
  if (LISTEN_ON_PHRASES.has(normalized)) return { type: 'always_listen', value: 'on', confirmText: CONFIRM.listen_on };
  if (LISTEN_OFF_PHRASES.has(normalized)) return { type: 'always_listen', value: 'off', confirmText: CONFIRM.listen_off };

  // ── "Hey M-Care" background wake phrase ──
  if (WAKE_PHRASE_ON_PHRASES.has(normalized)) return { type: 'wake_phrase', value: 'on', confirmText: CONFIRM.wake_phrase_on };
  if (WAKE_PHRASE_OFF_PHRASES.has(normalized)) return { type: 'wake_phrase', value: 'off', confirmText: CONFIRM.wake_phrase_off };

  // ── Surrounding Awareness ──
  if (SURROUNDING_ON_PHRASES.has(normalized)) return { type: 'surrounding_awareness', value: 'on', confirmText: CONFIRM.surrounding_on };
  if (SURROUNDING_OFF_PHRASES.has(normalized)) return { type: 'surrounding_awareness', value: 'off', confirmText: CONFIRM.surrounding_off };

  // ── Language ──
  const lang = matchLanguage(normalized);
  if (lang !== undefined) {
    if (lang) {
      const name = Object.keys(LANGUAGE_NAMES).find((k) => LANGUAGE_NAMES[k] === lang);
      return { type: 'language', value: lang, confirmText: `Done. I'll respond in ${name || lang}.` };
    }
    return { type: 'language', value: null, confirmText: "I didn't catch which language — could you say it again, like \"respond in Spanish\"?" };
  }

  return null;
}

// Convenience for tests / callers that want every phrase set.
export const COMMAND_PHRASES = {
  privateOn: [...PRIVATE_ON_PHRASES],
  privateOff: [...PRIVATE_OFF_PHRASES],
  modalityVoiceOn: [...MODALITY_VOICE_ON],
  modalityTextOnly: [...MODALITY_TEXT_ONLY],
  listenOn: [...LISTEN_ON_PHRASES],
  listenOff: [...LISTEN_OFF_PHRASES],
  wakePhraseOn: [...WAKE_PHRASE_ON_PHRASES],
  wakePhraseOff: [...WAKE_PHRASE_OFF_PHRASES],
  surroundingOn: [...SURROUNDING_ON_PHRASES],
  surroundingOff: [...SURROUNDING_OFF_PHRASES],
  languagePrefixes: [...LANGUAGE_PREFIXES],
  languageNames: { ...LANGUAGE_NAMES },
};