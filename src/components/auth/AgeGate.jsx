import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { evaluateDob, rememberAgeGate, isAgeGateBlocked } from '@/lib/ageGate';

// Matches the light form side of Login.jsx.
const TEAL = '#0E8A7D';
const TEXT = '#17302C';
const TEXT_SOFT = '#566B66';
const TEXT_FAINT = '#8A9B96';
const BORDER = '#E2E9E6';
const SURFACE_SOFT = '#EEF3F1';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** @type {React.CSSProperties} */
const field = {
  width: '100%', padding: '13px 12px', borderRadius: 12, border: `1.5px solid ${BORDER}`,
  background: SURFACE_SOFT, color: TEXT, fontSize: 16, outline: 'none', boxSizing: 'border-box',
};

/**
 * The neutral date-of-birth question shown before sign-in (see
 * src/lib/ageGate.js). It never mentions an age, a cutoff, or why it asks
 * beyond "we ask everyone": the FTC's COPPA guidance is that a screen hinting
 * at the cutoff invites a child to give a false date.
 */
export default function AgeGate({ onPass = () => {} }) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(() => isAgeGateBlocked());

  if (blocked) {
    return (
      <div role="status" style={{ padding: '18px 18px', borderRadius: 14, background: SURFACE_SOFT, border: `1px solid ${BORDER}` }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>
          Sorry, we can&apos;t create an account for you right now.
        </p>
      </div>
    );
  }

  const ready = month !== '' && day !== '' && year.length === 4;

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const result = evaluateDob({ year: Number(year), month: Number(month), day: Number(day) });
    if (result === 'invalid') {
      setError('Please enter a real date of birth.');
      return;
    }
    setError('');
    rememberAgeGate(result === 'pass' ? 'passed' : 'blocked');
    if (result === 'pass') onPass();
    else setBlocked(true);
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
        <legend style={{ fontSize: 12, fontWeight: 600, color: TEXT_SOFT, marginBottom: 6, letterSpacing: '0.04em', padding: 0 }}>
          DATE OF BIRTH
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr', gap: 8 }}>
          <select
            id="age-gate-month"
            aria-label="Month"
            autoComplete="bday-month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setError(''); }}
            style={{ ...field, color: month ? TEXT : TEXT_FAINT }}
          >
            <option value="">Month</option>
            {MONTHS.map((name, i) => <option key={name} value={String(i + 1)}>{name}</option>)}
          </select>
          <input
            id="age-gate-day"
            aria-label="Day"
            autoComplete="bday-day"
            inputMode="numeric"
            placeholder="Day"
            maxLength={2}
            value={day}
            onChange={(e) => { setDay(e.target.value.replace(/\D/g, '')); setError(''); }}
            style={field}
          />
          <input
            id="age-gate-year"
            aria-label="Year"
            autoComplete="bday-year"
            inputMode="numeric"
            placeholder="Year"
            maxLength={4}
            value={year}
            onChange={(e) => { setYear(e.target.value.replace(/\D/g, '')); setError(''); }}
            style={field}
          />
        </div>
      </fieldset>

      <p style={{ margin: '6px 0 0', fontSize: 11, color: TEXT_FAINT }}>
        We ask everyone this before creating an account.
      </p>

      {error && (
        <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: '#b91c1c' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!ready}
        style={{
          width: '100%', marginTop: 20, padding: '14px 0', borderRadius: 14, border: 'none',
          cursor: ready ? 'pointer' : 'not-allowed',
          background: ready ? TEAL : 'rgba(14,138,125,0.35)', color: '#fff',
          fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        Continue <ArrowRight style={{ width: 15, height: 15 }} />
      </button>
    </form>
  );
}
