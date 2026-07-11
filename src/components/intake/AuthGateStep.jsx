import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ROUTES } from '@/lib/constants';
import { CALM } from '@/lib/brandTokens';

const GOLD = '#D4AF37';        // trust marker (the lock seal)
const CARD = CALM.surface;
const BORDER = CALM.border;

const DEFAULT_GUEST_DRAFT_KEY = 'morales_intake_guest_draft';

/**
 * Shown the moment a conversation reaches the point where answers need to
 * be saved to a real account. Everything asked before this point stays in a
 * local guest draft. `reason`/`redirectPath`/`guestDraftKey` let other flows
 * (e.g. the travel-only intake) reuse this without medical-specific copy or
 * colliding with the medical flow's own guest draft.
 */
export default function AuthGateStep({
  answers,
  reason = "From here we'll be discussing your medical history, so I want your answers protected behind your own account first. Nothing you've shared so far will be lost.",
  redirectPath = ROUTES.CONCIERGE_INTAKE,
  guestDraftKey = DEFAULT_GUEST_DRAFT_KEY,
}) {
  const preserveDraft = () => {
    try {
      localStorage.setItem(guestDraftKey, JSON.stringify(answers));
    } catch (_) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        padding: '32px 28px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))',
          border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          fontSize: 22,
        }}
      >
        🔒
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: CALM.text }}>
        Let's create your secure account
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: CALM.textSoft }}>
        {reason}
      </p>

      <button
        type="button"
        onClick={() => {
          preserveDraft();
          base44.auth.loginWithProvider('google', redirectPath);
        }}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: 14,
          cursor: 'pointer',
          marginBottom: 10,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          color: CALM.text,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => {
          preserveDraft();
          window.location.href = `/login?redirect=${redirectPath}`;
        }}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: 14,
          cursor: 'pointer',
          background: CALM.action,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Continue with Phone
      </button>
      <p style={{ marginTop: 18, fontSize: 11, color: CALM.textFaint }}>
        <span style={{ color: GOLD }}>●</span> Your account keeps your journey private and lets you pick up exactly where you left off.
      </p>
    </motion.div>
  );
}
