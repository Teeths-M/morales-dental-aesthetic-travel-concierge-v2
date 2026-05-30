import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useLanguage() {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('appLanguage');
    if (!saved) {
      // Auto-detect from browser locale on first visit
      const browserLang = navigator.language?.split('-')[0] || 'en';
      const supported = ['en', 'es', 'fr', 'pt', 'de', 'it'];
      const detected = supported.includes(browserLang) ? browserLang : 'en';
      localStorage.setItem('appLanguage', detected);
      return detected;
    }
    return saved;
  });

  const setLanguage = (lang) => {
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang } }));
  };

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguageState(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return { language, setLanguage };
}