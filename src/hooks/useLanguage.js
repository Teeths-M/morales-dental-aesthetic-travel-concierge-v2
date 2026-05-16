import { useState, useEffect } from 'react';

export function useLanguage() {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });

  const setLanguage = (lang) => {
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
    // Dispatch event for other components to listen
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