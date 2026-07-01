import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, ArrowRight, AlertTriangle } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const BORDER = '#2A3F4A';

function FieldRow({ label, id, value, onChange, placeholder, autoFocus = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
        <input
          id={id}
          type="password"
          autoComplete="new-password"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          style={{
            width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${focused ? `${GOLD}80` : BORDER}`,
            color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = '/login';
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
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

        {!resetToken ? (
          /* ── Invalid link state ── */
          <div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <AlertTriangle style={{ width: 22, height: 22, color: '#f87171' }} />
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Invalid reset link</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              This password reset link is missing or has expired. Request a new one below.
            </p>
            <Link
              to="/forgot-password"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px 0', borderRadius: 14, textDecoration: 'none',
                background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                color: DARK, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: `0 8px 24px rgba(212,175,55,0.35)`,
              }}
            >
              Request new link <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
          </div>
        ) : (
          /* ── Reset form ── */
          <div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(212,175,55,0.1)`, border: `1px solid rgba(212,175,55,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Lock style={{ width: 20, height: 20, color: GOLD }} />
            </div>

            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>New password</h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              Choose a strong password — at least 8 characters.
            </p>

            {error && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <FieldRow
                label="NEW PASSWORD"
                id="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoFocus
              />
              <FieldRow
                label="CONFIRM PASSWORD"
                id="confirm"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
              />

              <div style={{ marginBottom: 0, marginTop: 8 }}>
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
                    ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Resetting...</>
                    : <>Set new password <ArrowRight style={{ width: 15, height: 15 }} /></>
                  }
                </button>
              </div>
            </form>

            <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              <Link to="/login" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Back to sign in</Link>
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
