import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { MSAFE_THEME_VARS } from '../msafePlusConfig';

/**
 * MSafeWorkspace — the two-column M-Safe+ shell: a cream sidebar holding the
 * agent's identity, and a fluid white main area holding the session.
 *
 * Rendered as a fixed full-screen surface so it escapes any surrounding app
 * chrome. The theme values are CSS custom properties set once here, which is
 * what lets the header's moon control dim the whole workspace — every
 * component below reads `var(--ms-*)` rather than holding its own colours.
 */

const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useMSafeTheme = () => useContext(ThemeContext);

const THEME_KEY = 'msafe_theme';

export default function MSafeWorkspace({ left, right }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setDark((wasDark) => {
      const next = !wasDark;
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        /* private mode — the session keeps its choice, it just won't persist */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <div
        className="msafe-shell fixed inset-0 z-[60] flex flex-col md:flex-row overflow-hidden"
        style={{
          ...MSAFE_THEME_VARS[dark ? 'dark' : 'light'],
          background: 'var(--ms-main)',
          color: 'var(--ms-ink)',
        }}
      >
        {/* Sidebar — the agent's identity. On a phone it becomes a compact
            header strip so the conversation still owns the screen. */}
        <aside
          className="flex-shrink-0 md:w-[286px] lg:w-[300px] flex flex-col overflow-y-auto"
          style={{
            background: 'var(--ms-sidebar)',
            borderRight: '1px solid var(--ms-border)',
            borderBottom: '1px solid var(--ms-border)',
            maxHeight: '46vh',
          }}
        >
          {left}
        </aside>

        {/* Main — the live session */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: 'var(--ms-main)' }}>
          {right}
        </main>

        <style>{`
          @media (min-width: 768px) {
            .msafe-shell aside,
            .msafe-shell > aside { max-height: none !important; border-bottom: none !important; }
          }
        `}</style>
      </div>
    </ThemeContext.Provider>
  );
}