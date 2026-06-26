/**
 * Babel Engine — Morales Universal Auto-Translation
 *
 * Detection order:
 *   1. localStorage 'morales_lang' (user has manually selected or was persisted)
 *   2. navigator.languages / navigator.language (browser preference)
 *   3. Fallback → English
 *
 * Admin dashboard always stays in English (handled via LanguageSwitcher
 * which skips translation on /admin routes).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', label: 'Español',    flag: '🇻🇪', dir: 'ltr' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪', dir: 'ltr' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷', dir: 'ltr' },
  { code: 'th', label: 'ภาษาไทย',   flag: '🇹🇭', dir: 'ltr' },
  { code: 'zh', label: '中文',       flag: '🇨🇳', dir: 'ltr' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
];

export const LANG_KEY = 'morales_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, es, pt, fr, de, it, tr, th, zh, ar },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    ns: ['translation'],
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

// Apply RTL for Arabic
i18n.on('languageChanged', (lng) => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === lng);
  document.documentElement.dir  = lang?.dir  || 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
