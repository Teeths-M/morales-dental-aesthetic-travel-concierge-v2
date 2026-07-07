import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import HumanHandoffCard from './HumanHandoffCard';

const BORDER = '#2A3F4A';

/**
 * Always-available escape hatch — "no hunting" per the M Ease Manifesto.
 * Reuses flagIntakeHandoff exactly as the automatic 3-strikes low-confidence
 * escalation does (base44/functions/flagIntakeHandoff/entry.ts) — that
 * function has no coupling to the strikes threshold, so a direct
 * user-triggered call behaves identically. Only renders once there's an
 * actual way to reach the user (their email, from the intake answers or
 * their authenticated session) — a button that can't dispatch anything
 * isn't a real escape hatch, so it's omitted rather than shown broken.
 */
export default function NeedHumanButton({ answers, sessionId }) {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);

  const email = answers?.email || user?.email;
  if (!email) return null;

  if (sent) return <HumanHandoffCard />;

  const handleClick = async () => {
    if (requesting) return;
    setRequesting(true);
    await base44.functions
      .invoke('flagIntakeHandoff', {
        session_id: sessionId,
        user_email: email,
        user_name: answers?.patient_name || user?.full_name,
        reason: 'The client asked to speak with a person directly.',
        answers,
      })
      .catch(() => {});
    setRequesting(false);
    setSent(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={requesting}
      style={{
        display: 'block',
        width: '100%',
        marginTop: 16,
        paddingTop: 18,
        background: 'none',
        border: 'none',
        borderTop: `1px solid ${BORDER}`,
        color: 'rgba(255,255,255,0.35)',
        fontSize: 12.5,
        fontWeight: 500,
        cursor: requesting ? 'default' : 'pointer',
        textAlign: 'center',
      }}
    >
      {requesting ? 'Connecting you...' : 'Need a human? Talk to our concierge'}
    </button>
  );
}
