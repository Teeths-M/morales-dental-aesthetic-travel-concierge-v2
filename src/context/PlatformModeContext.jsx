import { createContext, useContext, useState } from 'react';

const PlatformModeContext = createContext(null);

const STORAGE_KEY = 'morales_platform_mode';

export function PlatformModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'medical';
  });

  const toggleMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  return (
    <PlatformModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </PlatformModeContext.Provider>
  );
}

export function usePlatformMode() {
  const ctx = useContext(PlatformModeContext);
  if (!ctx) {
    // Graceful fallback — never throw in production rendering paths
    return { mode: 'medical', toggleMode: () => {} };
  }
  return ctx;
}