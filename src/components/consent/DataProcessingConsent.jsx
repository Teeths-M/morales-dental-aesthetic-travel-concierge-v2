import React from 'react';

/**
 * DataProcessingConsent — the one-screen, plain-language consent + subprocessor
 * notice shown before a client hands over medical/identity information.
 *
 * Why this exists: M shares limited information with third-party services to
 * coordinate care (payments, messaging, AI matching, doctors/partners). None of
 * those vendors currently sit under a health-data (BAA) agreement, so informed,
 * affirmative consent — naming who receives what, in words a patient actually
 * understands — is the honest baseline. This is a compliance control, not
 * decoration: the checked state is recorded on the Consultation
 * (data_processing_consent + timestamp + version) so consent is auditable.
 *
 * Keep SUBPROCESSORS in sync with the compliance audit's subprocessor map.
 * Bump DATA_CONSENT_VERSION whenever the list or wording materially changes,
 * so we can tell which version a given patient agreed to.
 */
export const DATA_CONSENT_VERSION = '1.0';

// Plain-language, patient-facing — deliberately not the raw vendor names. The
// intent is that a non-technical reader understands who touches their data and
// why, per the M "Grandmother Test".
export const SUBPROCESSORS = [
  { name: 'Our secure app platform', purpose: 'stores your information and runs the service' },
  { name: 'Payment processor', purpose: 'takes payment securely — never your medical details' },
  { name: 'Email & SMS', purpose: 'sends your confirmations and safety check-ins' },
  { name: 'AI assistants', purpose: 'help match you to the right doctors and destinations' },
  { name: 'Verified doctors & travel partners', purpose: 'deliver the care and logistics you book' },
];

const THEMES = {
  dark: {
    cardBg: 'rgba(212,175,55,0.05)',
    border: '#2A3F4A',
    heading: '#ffffff',
    body: 'rgba(255,255,255,0.62)',
    subtle: 'rgba(255,255,255,0.42)',
    link: '#D4AF37',
    accent: '#D4AF37',
  },
  light: {
    cardBg: '#F8FAFC',
    border: '#E2E8F0',
    heading: '#0F172A',
    body: '#475569',
    subtle: '#64748B',
    link: '#047857',
    accent: '#047857',
  },
};

export default function DataProcessingConsent({ checked, onChange, theme = 'dark' }) {
  const t = THEMES[theme] || THEMES.dark;

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        textAlign: 'left',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 12.5,
          fontWeight: 700,
          color: t.heading,
          letterSpacing: '0.01em',
        }}
      >
        Your privacy comes first
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6, color: t.body }}>
        To coordinate your care, M shares only the information each trusted service needs —
        and <strong style={{ color: t.heading }}>never sells your data</strong>.
      </p>

      <details style={{ margin: '0 0 12px' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            color: t.link,
            listStyle: 'none',
          }}
        >
          What we share, and with whom
        </summary>
        <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
          {SUBPROCESSORS.map((s) => (
            <li
              key={s.name}
              style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 12, lineHeight: 1.5, color: t.body }}
            >
              <span aria-hidden="true" style={{ color: t.accent, flexShrink: 0 }}>•</span>
              <span>
                <strong style={{ color: t.heading, fontWeight: 600 }}>{s.name}</strong> — {s.purpose}
              </span>
            </li>
          ))}
        </ul>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 4, fontSize: 12, color: t.link, textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Read our full Privacy Policy
        </a>
      </details>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            marginTop: 1,
            accentColor: t.accent,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: t.body }}>
          I understand and agree to M processing my information to coordinate my care.
        </span>
      </label>
    </div>
  );
}
