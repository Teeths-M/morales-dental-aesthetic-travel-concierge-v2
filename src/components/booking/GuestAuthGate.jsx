import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function GuestAuthGate({ isOpen, form, step, onCancel }) {
  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    // Preserve the entire form in localStorage before OAuth redirect
    try {
      const serializable = {
        ...form,
        acknowledged_statements: form.acknowledged_statements instanceof Set
          ? Array.from(form.acknowledged_statements)
          : (form.acknowledged_statements || []),
      };
      localStorage.setItem('morales_guest_booking_draft', JSON.stringify(serializable));
      localStorage.setItem('morales_guest_booking_step', String(step));
    } catch (_) {}
    base44.auth.loginWithProvider('google', '/booking');
  };

  const handlePhoneSignIn = () => {
    try {
      const serializable = {
        ...form,
        acknowledged_statements: form.acknowledged_statements instanceof Set
          ? Array.from(form.acknowledged_statements)
          : (form.acknowledged_statements || []),
      };
      localStorage.setItem('morales_guest_booking_draft', JSON.stringify(serializable));
      localStorage.setItem('morales_guest_booking_step', String(step));
    } catch (_) {}
    window.location.href = '/login?redirect=/booking';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, maxWidth: 400, width: '100%', padding: 28, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}
      >
        {/* Trophy icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            🏁
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 23, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            You're ready to submit!
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
            Sign in to complete your consultation request. Your form is saved — you'll be right back here.
          </p>
        </div>

        {/* Progress reminder */}
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#34d399' }}>Form saved automatically</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>12 steps complete — you won't need to re-enter anything.</p>
            </div>
          </div>
        </div>

        {/* Google sign in — primary */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14, cursor: 'pointer', marginBottom: 10,
            background: '#fff', border: 'none',
            color: '#1a1a2e', fontSize: 14, fontWeight: 700, letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Phone sign in — secondary */}
        <button
          onClick={handlePhoneSignIn}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 14, cursor: 'pointer', marginBottom: 18,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
            color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          📱 Continue with Phone
        </button>

        <button
          onClick={onCancel}
          style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '4px 0' }}
        >
          Go back and review my form
        </button>
      </motion.div>
    </div>
  );
}
