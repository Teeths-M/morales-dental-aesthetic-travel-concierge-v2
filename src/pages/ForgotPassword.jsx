import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const BORDER = '#2A3F4A';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success — never reveal whether an account exists
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
          <img src="/morales-m-mark.png" alt="Morales" style={{ width: 32, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Morales</p>
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>MEDICAL TRAVEL SAFETY</p>
          </div>
        </Link>

        {sent ? (
          /* ── Success state ── */
          <div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: '#34d399' }} />
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Check your inbox</h1>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: '#fff' }}>{email}</strong>, you'll receive a reset link within a few minutes.
            </p>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Check your spam folder if you don't see it.</p>
            <Link
              to="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: GOLD, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} /> Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form ── */
          <div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(212,175,55,0.1)`, border: `1px solid rgba(212,175,55,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Mail style={{ width: 20, height: 20, color: GOLD }} />
            </div>

            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Reset password</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                    color: '#fff', fontSize: 15, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = `${GOLD}80`}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? 'rgba(212,175,55,0.4)' : `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                  border: 'none', color: DARK, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                  boxShadow: loading ? 'none' : `0 8px 24px rgba(212,175,55,0.35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading
                  ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Sending...</>
                  : <>Send reset link <ArrowRight style={{ width: 15, height: 15 }} /></>
                }
              </button>
            </form>

            <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              Remember it?{' '}
              <Link to="/login" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
