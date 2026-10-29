import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GOLD, WHITE, MUTED, HAIRLINE, RED } from './theme';

/**
 * JoinPilotForm — the only thing on this page that actually writes anything.
 *
 * One field. It submits to the joinPilot function, which validates and
 * de-duplicates server-side; nothing here reports success unless the server
 * confirmed the record was stored, so the confirmation can be trusted.
 */
export default function JoinPilotForm({ source = 'pilot_page', onDone, autoFocus = false }) {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (phase === 'sending' || phase === 'done') return;

    const value = email.trim();
    if (!value) {
      setError('Please enter your email address.');
      return;
    }

    setPhase('sending');
    setError('');

    try {
      const res = await base44.functions.invoke('joinPilot', { email: value, source });
      if (res?.data?.ok) {
        setPhase('done');
        onDone?.(res.data);
      } else {
        setPhase('idle');
        setError('That did not save. Please try again.');
      }
    } catch (err) {
      setPhase('idle');
      setError(
        err?.response?.data?.error
        || 'We could not save that just now. Please try again in a moment.',
      );
    }
  };

  if (phase === 'done') {
    return (
      <div role="status" aria-live="polite" style={{ textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: WHITE, lineHeight: 1.5 }}>
          You're on the list.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: MUTED, lineHeight: 1.65 }}>
          We'll write to {email.trim()} when the next pilot places open. No newsletter, no drip campaign —
          one email when there is something real to tell you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <label htmlFor={`pilot-email-${source}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          Your email address
        </label>
        <input
          id={`pilot-email-${source}`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="your@email.com"
          value={email}
          autoFocus={autoFocus}
          disabled={phase === 'sending'}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
          aria-invalid={!!error}
          aria-describedby={error ? `pilot-error-${source}` : undefined}
          style={{
            flex: '1 1 220px',
            minWidth: 0,
            padding: '15px 16px',
            borderRadius: 10,
            border: `1px solid ${error ? RED : HAIRLINE}`,
            background: 'rgba(255,255,255,0.06)',
            color: WHITE,
            fontSize: 16,
            outlineOffset: 2,
          }}
        />
        <button
          type="submit"
          disabled={phase === 'sending'}
          style={{
            flex: '0 0 auto',
            padding: '15px 26px',
            borderRadius: 10,
            border: 'none',
            background: GOLD,
            color: '#060B16',
            fontSize: 15,
            fontWeight: 700,
            cursor: phase === 'sending' ? 'default' : 'pointer',
            opacity: phase === 'sending' ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {phase === 'sending' ? 'Saving…' : 'Join the pilot'}
        </button>
      </div>

      {error && (
        <p id={`pilot-error-${source}`} role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: RED }}>
          {error}
        </p>
      )}
    </form>
  );
}