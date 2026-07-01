import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Mail, Lock, ArrowRight, ChevronLeft, Globe, Shield, BadgeCheck, Heart } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// 6-box OTP input matching Login.jsx style
function OtpInput({ value, onChange, onComplete }) {
  const inputs = React.useRef([]);
  const digits = (value || '').split('').slice(0, 6);
  while (digits.length < 6) digits.push('');

  const update = (idx, char) => {
    const next = [...digits];
    next[idx] = char.slice(-1);
    const joined = next.join('');
    onChange(joined);
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
    if (joined.length === 6) onComplete(joined);
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { onChange(pasted); onComplete(pasted); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={i === 0}
          onChange={e => update(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          style={{
            width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 800,
            borderRadius: 12, border: `2px solid ${d ? GOLD : BORDER}`,
            background: d ? `${GOLD}12` : 'rgba(255,255,255,0.04)',
            color: '#fff', outline: 'none', transition: 'border-color 0.15s, background 0.15s',
            caretColor: GOLD,
          }}
          onFocus={e => e.target.style.borderColor = GOLD}
          onBlur={e => e.target.style.borderColor = digits[i] ? GOLD : BORDER}
        />
      ))}
    </div>
  );
}

export default function Register() {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [googleLoading,   setGoogleLoading]   = useState(false);
  const [showOtp,         setShowOtp]         = useState(false);
  const [otpCode,         setOtpCode]         = useState('');
  const [resending,       setResending]       = useState(false);
  const [resendCooldown,  setResendCooldown]  = useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    setError('');
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: code || otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      window.location.href = '/booking';
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await base44.auth.resendOtp(email);
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    base44.auth.loginWithProvider('google', '/booking');
  };

  const fieldStyle = {
    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12,
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: 15, outline: 'none',
  };
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
    marginBottom: 6, letterSpacing: '0.04em',
  };

  // ── OTP verification screen ──
  if (showOtp) {
    return (
      <div style={{ minHeight: '100vh', background: DARK, display: 'flex', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <button
              onClick={() => { setShowOtp(false); setOtpCode(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0, marginBottom: 32 }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} /> Back
            </button>

            <img src="/morales-m-mark.png" alt="Morales" style={{ width: 36, filter: `drop-shadow(0 0 8px ${GOLD})`, marginBottom: 32 }} />

            <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Check your email</h1>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>We sent a 6-digit code to</p>
            <p style={{ margin: '0 0 32px', fontSize: 15, fontWeight: 700, color: '#fff' }}>{email}</p>

            {error && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <OtpInput value={otpCode} onChange={setOtpCode} onComplete={handleVerify} />

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <Loader2 style={{ width: 20, height: 20, color: GOLD, animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            <button
              onClick={() => handleVerify(otpCode)}
              disabled={otpCode.length < 6 || loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 24,
                cursor: otpCode.length < 6 || loading ? 'not-allowed' : 'pointer',
                background: otpCode.length < 6 ? 'rgba(212,175,55,0.2)' : `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                border: 'none', color: otpCode.length < 6 ? 'rgba(255,255,255,0.3)' : DARK,
                fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: otpCode.length < 6 ? 'none' : `0 8px 24px rgba(212,175,55,0.35)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                : <>Verify &amp; continue <ArrowRight style={{ width: 15, height: 15 }} /></>
              }
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              {resendCooldown > 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  Resend in <span style={{ color: GOLD, fontWeight: 700 }}>{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{ background: 'none', border: 'none', color: GOLD, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <RightPanel />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Left: form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/morales-m-mark.png" alt="Morales" style={{ width: 36, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Morales</p>
                <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>MEDICAL TRAVEL SAFETY</p>
              </div>
            </Link>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Start your safe journey
          </h1>
          <p style={{ margin: '0 0 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            Create your account to begin
          </p>

          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Google — primary CTA */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '13px 0', borderRadius: 14, cursor: googleLoading ? 'wait' : 'pointer',
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
              color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 20,
            }}
          >
            {googleLoading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>EMAIL ADDRESS</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}80`}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}80`}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = `${GOLD}80`}
                  onBlur={e => e.target.style.borderColor = BORDER}
                />
              </div>
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
                ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Creating account...</>
                : <>Create my account <ArrowRight style={{ width: 15, height: 15 }} /></>
              }
            </button>
          </form>

          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>

          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* ── Right: brand panel ── */}
      <RightPanel />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RightPanel() {
  return (
    <div
      style={{
        width: 480, flexShrink: 0,
        background: 'linear-gradient(135deg, #080F1C 0%, #0A1424 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, position: 'relative', overflow: 'hidden',
      }}
      className="hidden lg:flex"
    >
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <img src="/morales-m-mark.png" alt="M" style={{ width: 72, filter: `drop-shadow(0 0 28px ${GOLD}80)`, marginBottom: 24 }} />

      <h2 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
        Your safety starts<br />
        <span style={{ color: GOLD, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontWeight: 400 }}>the moment you sign up.</span>
      </h2>
      <p style={{ margin: '0 0 36px', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, maxWidth: 300 }}>
        Join thousands of patients who've traveled safely with Morales. Your account unlocks the full protection stack.
      </p>

      {[
        { icon: '🛡️', name: 'SAFE-T 4Life™',   desc: 'AI-powered safety monitoring',    color: '#22c55e' },
        { icon: '🔐', name: 'Passport Vault™',  desc: 'Encrypted emergency documents',   color: '#60a5fa' },
        { icon: '🧠', name: 'MedGuard™',         desc: 'Behavioural pattern intelligence', color: '#a855f7' },
        { icon: '✈️', name: 'Journey Tracking',  desc: 'Live handshake checkpoints',      color: GOLD },
      ].map(s => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', width: '100%', maxWidth: 300, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 18 }}>{s.icon}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.name}</span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Globe style={{ width: 12, height: 12, color: GOLD }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>195 countries · Free to join · Cancel anytime</span>
      </div>
    </div>
  );
}
