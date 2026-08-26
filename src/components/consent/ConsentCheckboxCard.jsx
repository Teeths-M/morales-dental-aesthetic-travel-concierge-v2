import React from 'react';

/**
 * ConsentCheckboxCard — shared small primitive behind the 4 new virtual-
 * consultation consent components (TelehealthConsent, AiNotesConsent,
 * TranslationCaptionsConsent, RecordingConsent), following the same
 * controlled checked/onChange, plain-language-copy pattern already
 * established by DataProcessingConsent.jsx — kept as one shared visual base
 * rather than 4 copies of the same card markup, since (unlike
 * DataProcessingConsent's own elaborate subprocessor list) these 4 consents
 * are each a single, focused yes/no.
 */
const THEMES = {
  dark: {
    cardBg: 'rgba(212,175,55,0.05)',
    border: '#2A3F4A',
    heading: '#ffffff',
    body: 'rgba(255,255,255,0.62)',
    accent: '#D4AF37',
  },
  danger: {
    cardBg: 'rgba(220,38,38,0.06)',
    border: 'rgba(220,38,38,0.35)',
    heading: '#ffffff',
    body: 'rgba(255,255,255,0.62)',
    accent: '#DC2626',
  },
};

export default function ConsentCheckboxCard({ title, description, checked, onChange, variant = 'dark', dataTestId }) {
  const t = THEMES[variant] || THEMES.dark;
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: '14px 16px',
        textAlign: 'left',
      }}
      data-testid={dataTestId}
    >
      <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 700, color: t.heading }}>{title}</p>
      <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, color: t.body }}>{description}</p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 1, accentColor: t.accent, flexShrink: 0, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: t.body }}>I understand and agree.</span>
      </label>
    </div>
  );
}
