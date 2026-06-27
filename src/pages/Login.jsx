import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Mail, Lock, ArrowRight, Globe } from 'lucide-react';

const GOLD = '#D4AF37';
const DARK = '#060B16';

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

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    base44.auth.loginWithProvider('google', '/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>

      {/* ── Left: Login form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <img src="/morales-m-mark.png" alt="Morales" style={{ width: 36, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Morales</p>
                <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.2em', fontWeight: 700 }}>CONCIERGE</p>
              </div>
            </Link>
          </div>

          {/* Heading */}
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ margin: '0 0 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            Sign in to your Morales account
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '13px 0', borderRadius: 14, marginBottom: 20, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 14, fontWeight: 600, transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            {googleLoading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em' }}>
                EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = `${GOLD}60`}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>PASSWORD</label>
                <Link to="/forgot-password" style={{ fontSize: 11, color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Forgot?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = `${GOLD}60`}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, marginTop: 20, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(212,175,55,0.4)' : `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
                border: 'none', color: DARK, fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: loading ? 'none' : `0 8px 24px rgba(212,175,55,0.35)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight style={{ width: 15, height: 15 }} /></>
              )}
            </button>
          </form>

          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            New to Morales?{' '}
            <Link to="/register" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
          </p>

          {/* Judge / Demo access section */}
          <div style={{ marginTop: 32, padding: '16px 18px', borderRadius: 14, background: `${GOLD}0A`, border: `1px solid ${GOLD}25` }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>JUDGES & INVESTORS</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              The full demo is available without login. See every feature live.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/demo/evn"
                style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em' }}>
                🌍 EVN-iQ400 Demo
              </Link>
              <Link to="/demo"
                style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em' }}>
                🛡️ Full Platform
              </Link>
            </div>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* ── Right: Brand panel (desktop only) ── */}
      <div style={{
        width: 480, flexShrink: 0,
        background: 'linear-gradient(135deg, #080F1C 0%, #0A1424 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, position: 'relative', overflow: 'hidden',
      }}
        className="hidden lg:flex"
      >
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* M mark large */}
        <img src="/morales-m-mark.png" alt="M" style={{ width: 80, filter: `drop-shadow(0 0 32px ${GOLD}80)`, marginBottom: 24 }} />

        <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          The World's First<br />
          <span style={{ color: GOLD, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontWeight: 400 }}>Complete Protection Stack</span>
        </h2>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.7, maxWidth: 320 }}>
          Environmental intelligence, behavioral AI, and GPS handshakes — protecting patients across 195 countries.
        </p>

        {/* 4 system pills */}
        {[
          { emoji: '🌍', name: 'EVN-iQ400™', desc: 'Environmental Intelligence', color: '#60a5fa', badge: 'NEW' },
          { emoji: '🧠', name: 'MedGuard™',  desc: 'Behavioural Safety AI',     color: '#a855f7' },
          { emoji: '🛡️', name: 'Safe-T4life™', desc: 'Check-In Protocol',      color: '#22c55e' },
          { emoji: '✈️', name: 'iQ200™',     desc: 'Journey Coordination',     color: GOLD },
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
    </div>
  );
}
