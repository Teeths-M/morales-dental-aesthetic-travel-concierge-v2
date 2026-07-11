import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Phone, ArrowRight, Globe, ChevronLeft } from 'lucide-react';

// Login splits: LEFT form uses the CALM decision palette (light + teal), the
// RIGHT brand panel keeps the dark dramatic showcase (Product Principle #5:
// dark = hero/showcase only).
const GOLD  = '#D4AF37';        // trust markers only
const TEAL  = '#0E8A7D';        // the only "proceed" action color
const DARK  = '#060B16';        // right brand panel + page container
const CARD  = '#0C1A1D';
const PAGE  = '#F1F5F4';        // left form surface
const SURFACE_SOFT = '#EEF3F1';
const BORDER = '#E2E9E6';       // left form borders (light)
const TEXT = '#17302C';
const TEXT_SOFT = '#566B66';
const TEXT_FAINT = '#8A9B96';

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

// 6 individual OTP digit boxes
function OtpInput({ value, onChange, onComplete }) {
  const inputs = useRef([]);
  const digits  = (value || '').split('').slice(0, 6);
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
            borderRadius: 12, border: `2px solid ${d ? TEAL : BORDER}`,
            background: d ? 'rgba(14,138,125,0.10)' : SURFACE_SOFT,
            color: TEXT, outline: 'none', transition: 'border-color 0.15s, background 0.15s',
            caretColor: TEAL,
          }}
          onFocus={e => e.target.style.borderColor = TEAL}
          onBlur={e => e.target.style.borderColor = digits[i] ? TEAL : BORDER}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [step,          setStep]          = useState('phone');   // 'phone' | 'otp'
  const [phone,         setPhone]         = useState('');
  const [otp,           setOtp]           = useState('');
  const [demoCode,      setDemoCode]      = useState(null);      // mock mode only
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [countdown,     setCountdown]     = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendCode = async (e) => {
    e?.preventDefault();
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('sendOtp', { phone: phone.trim() });
      if (res.data?.demo_code) setDemoCode(res.data.demo_code);  // mock mode
      setStep('otp');
      setCountdown(30);
    } catch (err) {
      setError(err.message || 'Could not send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyOtp', { phone: phone.trim(), code });
      if (res.data?.verified) {
        // OTP confirmed — proceed via Google to create/resume Base44 session
        setDemoCode(null);
        base44.auth.loginWithProvider('google', redirectTo);
      }
    } catch (err) {
      setError(err.message || 'Incorrect code. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    base44.auth.loginWithProvider('google', redirectTo);
  };

  // ── PHONE STEP ──
  const phoneScreen = (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/morales-m-mark.png" alt="Morales" style={{ width: 36, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>Morales</p>
            <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>MEDICAL TRAVEL SAFETY</p>
          </div>
        </Link>
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>Welcome</h1>
      <p style={{ margin: '0 0 32px', fontSize: 14, color: TEXT_SOFT }}>
        Enter your phone number to sign in
      </p>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSendCode}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_SOFT, marginBottom: 6, letterSpacing: '0.04em' }}>
            PHONE NUMBER
          </label>
          <div style={{ position: 'relative' }}>
            <Phone style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: TEXT_FAINT }} />
            <input
              type="tel"
              autoFocus
              placeholder="+1 868 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              style={{
                width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, boxSizing: 'border-box',
                background: SURFACE_SOFT, border: `1px solid ${BORDER}`,
                color: TEXT, fontSize: 15, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = `${TEAL}80`}
              onBlur={e => e.target.style.borderColor = BORDER}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: TEXT_FAINT }}>
            Include country code · SMS or WhatsApp
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(14,138,125,0.4)' : TEAL,
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
            boxShadow: loading ? 'none' : `0 8px 24px rgba(14,138,125,0.35)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading
            ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Sending code...</>
            : <>Send verification code <ArrowRight style={{ width: 15, height: 15 }} /></>
          }
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 11, color: TEXT_FAINT, letterSpacing: '0.08em' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '13px 0', borderRadius: 14, cursor: 'pointer',
          background: '#fff', border: `1px solid ${BORDER}`,
          color: TEXT, fontSize: 14, fontWeight: 600,
        }}
      >
        {googleLoading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
        Continue with Google
      </button>

      <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: TEXT_FAINT }}>
        New to Morales?{' '}
        <Link to="/signup" style={{ color: TEAL, textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
      </p>

      {/* Judges panel */}
      <div style={{ marginTop: 28, padding: '16px 18px', borderRadius: 14, background: `${GOLD}0A`, border: `1px solid ${GOLD}25` }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>JUDGES & INVESTORS</p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: TEXT_SOFT, lineHeight: 1.6 }}>
          The full demo is available without login.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/demo/evn" style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: '#9a7d1f', fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em' }}>
            🌍 EVN-iQ400 Demo
          </Link>
          <Link to="/demo" style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, background: SURFACE_SOFT, border: `1px solid ${BORDER}`, color: TEXT_SOFT, fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em' }}>
            🛡️ Full Platform
          </Link>
        </div>
      </div>
    </div>
  );

  // ── OTP STEP ──
  const otpScreen = (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {/* Back */}
      <button
        onClick={() => { setStep('phone'); setOtp(''); setError(''); setDemoCode(null); }}
        style={{ background: 'none', border: 'none', color: TEXT_FAINT, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, padding: 0, marginBottom: 32 }}
      >
        <ChevronLeft style={{ width: 16, height: 16 }} /> Back
      </button>

      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <img src="/morales-m-mark.png" alt="Morales" style={{ width: 36, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>Check your phone</h1>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: TEXT_SOFT }}>
        We sent a 6-digit code to
      </p>
      <p style={{ margin: '0 0 32px', fontSize: 15, fontWeight: 700, color: TEXT }}>{phone}</p>

      {/* Demo mode banner */}
      {demoCode && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: SURFACE_SOFT, border: `1px solid ${BORDER}`, marginBottom: 24, textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, color: TEXT_FAINT, letterSpacing: '0.1em' }}>DEMO MODE — NO SMS CREDITS</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '0.3em' }}>{demoCode}</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: TEXT_FAINT }}>This code will be hidden when Twilio is live</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <OtpInput value={otp} onChange={setOtp} onComplete={handleVerify} />

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Loader2 style={{ width: 20, height: 20, color: TEAL, animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      <button
        onClick={() => handleVerify(otp)}
        disabled={otp.length < 6 || loading}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 24, cursor: otp.length < 6 || loading ? 'not-allowed' : 'pointer',
          background: otp.length < 6 ? 'rgba(14,138,125,0.2)' : TEAL,
          border: 'none', color: otp.length < 6 ? '#ffffffaa' : '#fff',
          fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
          boxShadow: otp.length < 6 ? 'none' : `0 8px 24px rgba(14,138,125,0.35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <>Verify & sign in <ArrowRight style={{ width: 15, height: 15 }} /></>}
      </button>

      {/* Resend */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        {countdown > 0 ? (
          <p style={{ fontSize: 13, color: TEXT_FAINT, margin: 0 }}>
            Resend code in <span style={{ color: TEAL, fontWeight: 700 }}>{countdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleSendCode}
            style={{ background: 'none', border: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Left: form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: PAGE }}>
        {step === 'phone' ? phoneScreen : otpScreen}
      </div>

      {/* ── Right: brand panel (desktop) ── */}
      <div
        style={{
          width: 480, flexShrink: 0,
          background: 'linear-gradient(135deg, #080F1C 0%, #0A1424 100%)',
          borderLeft: `1px solid rgba(255,255,255,0.06)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 48, position: 'relative', overflow: 'hidden',
        }}
        className="hidden lg:flex"
      >
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <img src="/morales-m-mark.png" alt="M" style={{ width: 80, filter: `drop-shadow(0 0 32px ${GOLD}80)`, marginBottom: 24 }} />

        <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          The World's First<br />
          <span style={{ color: GOLD, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontWeight: 400 }}>Complete Protection Stack</span>
        </h2>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, maxWidth: 320 }}>
          Environmental intelligence, behavioral AI, and GPS handshakes — protecting patients across 195 countries.
        </p>

        {[
          { emoji: '🌍', name: 'Global Intelligence', desc: 'Environmental Scanning',      color: '#60a5fa', badge: 'NEW' },
          { emoji: '🧠', name: 'Safety AI',          desc: 'Behavioural Pattern Analysis', color: '#a855f7' },
          { emoji: '🛡️', name: 'Safety System', desc: 'Check-In Protocol',           color: '#22c55e' },
          { emoji: '✈️', name: 'iQ200™',        desc: 'Journey Coordination',        color: GOLD },
        ].map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', width: '100%', maxWidth: 300, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.name}</span>
                {s.badge && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${s.color}25`, color: s.color }}>{s.badge}</span>}
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.desc}</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe style={{ width: 12, height: 12, color: GOLD }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>195 countries · Works offline · Airplane mode ready</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
