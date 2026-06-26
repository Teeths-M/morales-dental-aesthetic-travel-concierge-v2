/**
 * LanguageSwitcher — premium globe icon for manual language override.
 *
 * Auto-detection handles the default. This gives the user control.
 * Not shown on admin routes (admin stays in English).
 *
 * Placement: inject into Header.jsx or Footer.jsx.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LANG_KEY } from '@/i18n';

const GOLD = '#D4AF37';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);
  const current           = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function select(code) {
    i18n.changeLanguage(code);
    localStorage.setItem(LANG_KEY, code);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={`Language: ${current.label}`}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         5,
          padding:     '6px 10px',
          borderRadius:999,
          background:  open ? `rgba(212,175,55,0.12)` : 'transparent',
          border:      `1px solid ${open ? GOLD + '40' : 'rgba(255,255,255,0.12)'}`,
          cursor:      'pointer',
          color:       open ? GOLD : 'rgba(255,255,255,0.6)',
          transition:  'all 0.18s',
        }}
      >
        <Globe style={{ width: 14, height: 14 }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{current.flag} {current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div style={{
          position:       'absolute',
          top:            'calc(100% + 8px)',
          right:          0,
          background:     'rgba(6,11,22,0.97)',
          backdropFilter: 'blur(20px)',
          border:         '1px solid rgba(255,255,255,0.08)',
          borderRadius:   14,
          padding:        '6px',
          zIndex:         9999,
          minWidth:       170,
          boxShadow:      '0 16px 48px rgba(0,0,0,0.6)',
          maxHeight:      320,
          overflowY:      'auto',
        }}>
          {SUPPORTED_LANGUAGES.map(lang => {
            const isActive = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          8,
                  width:        '100%',
                  padding:      '8px 10px',
                  borderRadius: 9,
                  border:       'none',
                  cursor:       'pointer',
                  background:   isActive ? `rgba(212,175,55,0.12)` : 'transparent',
                  textAlign:    'left',
                  transition:   'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{lang.flag}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? GOLD : '#fff' }}>
                    {lang.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{lang.code.toUpperCase()}</p>
                </div>
                {isActive && <span style={{ fontSize: 10, color: GOLD }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
