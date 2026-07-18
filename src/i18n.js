/**
 * Babel Engine — Morales Universal Auto-Translation
 * Zero-dependency mini-i18n. Identical API to react-i18next's useTranslation().
 *
 * Detection order:
 *   1. localStorage 'morales_lang'
 *   2. navigator.languages / navigator.language
 *   3. Fallback → English
 */
import { useState, useEffect } from 'react';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import pt from './locales/pt/translation.json';
import fr from './locales/fr/translation.json';
import de from './locales/de/translation.json';
import it from './locales/it/translation.json';
import tr from './locales/tr/translation.json';
import th from './locales/th/translation.json';
import zh from './locales/zh/translation.json';
import ar from './locales/ar/translation.json';

/**
 * Languages offered in the picker.
 *
 * Arabic is deliberately NOT here. The locale file exists and `applyDir()`
 * flips `document.documentElement.dir` — but that is the entire RTL
 * implementation. The UI uses ~578 physical-direction utilities (ml-*, pl-*,
 * left-*, text-left) and zero logical properties, so selecting العربية sets
 * the document RTL while every offset stays LTR: mirrored arrows, drawers
 * sliding the wrong way, a misplaced floating SOS button. Offering a language
 * that visibly breaks the page is worse than not offering it.
 *
 * To restore: migrate those utilities to logical equivalents (ms-/me-/ps-/pe-,
 * start-/end-, text-start/end), verify on a real RTL device, then re-add here
 * with dir: 'rtl'. See ARABIC_RTL in the launch notes.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', label: 'Español',   flag: '🇻🇪', dir: 'ltr' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪', dir: 'ltr' },
  { code: 'it', label: 'Italiano',  flag: '🇮🇹', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',    flag: '🇹🇷', dir: 'ltr' },
  { code: 'th', label: 'ภาษาไทย',  flag: '🇹🇭', dir: 'ltr' },
  { code: 'zh', label: '中文',      flag: '🇨🇳', dir: 'ltr' },
];

export const LANG_KEY = 'morales_lang';

const RESOURCES = { en, es, pt, fr, de, it, tr, th, zh, ar };

/**
 * A language is usable only if we actually OFFER it. Checking RESOURCES alone
 * was not enough: ar/translation.json still ships, so a browser that had
 * previously stored `morales_lang=ar` (or whose OS locale is Arabic) would
 * resolve to Arabic text inside an LTR layout even after Arabic was pulled
 * from the picker. Gate on the offered list instead.
 */
function isOffered(code) {
  return !!code && !!RESOURCES[code] && SUPPORTED_LANGUAGES.some(l => l.code === code);
}

function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (isOffered(stored)) return stored;
    const nav = (navigator.languages?.[0] || navigator.language || 'en');
    const code = nav.split('-')[0].toLowerCase();
    return isOffered(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

// Module-level state — shared across all useTranslation() callers
let currentLang = detectLanguage();
const listeners = new Set();

function applyDir(lng) {
  if (typeof document === 'undefined') return;
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === lng);
  document.documentElement.dir  = lang?.dir || 'ltr';
  document.documentElement.lang = lng;
}

applyDir(currentLang);

export function changeLanguage(code) {
  if (!isOffered(code)) return;
  currentLang = code;
  try { localStorage.setItem(LANG_KEY, code); } catch {}
  // Bridge to the legacy wizard dictionary (lib/translations.js): the
  // signup/booking pages key off 'appLanguage' + this window event. Keeping
  // the bridge here makes this function the single language mutation point —
  // callers must not write appLanguage or dispatch languageChange themselves.
  try { localStorage.setItem('appLanguage', code); } catch {}
  try { window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: code } })); } catch {}
  applyDir(code);
  listeners.forEach(fn => fn(code));
}

// Dot-notation key lookup with {{param}} interpolation
function resolve(dict, key, params) {
  const value = key.split('.').reduce((o, k) => o?.[k], dict);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
}

// Drop-in replacement for react-i18next's useTranslation()
export function useTranslation() {
  const [lang, setLang] = useState(currentLang);

  useEffect(() => {
    listeners.add(setLang);
    return () => { listeners.delete(setLang); };
  }, []);

  function t(key, params) {
    const dict = RESOURCES[lang] || RESOURCES['en'];
    const value = resolve(dict, key, params);
    // Missing key in the active language → fall back to English rather than
    // showing a raw dotted key. Lets locale files be filled progressively
    // (professionally translated content lands language by language).
    if (value === key && lang !== 'en') {
      return resolve(RESOURCES['en'], key, params);
    }
    return value;
  }

  return {
    t,
    i18n: { language: lang, changeLanguage },
  };
}

// Compat shim — code that calls i18n.changeLanguage() directly
const i18n = {
  get language() { return currentLang; },
  changeLanguage,
};

export default i18n;
