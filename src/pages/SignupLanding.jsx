import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Stethoscope } from 'lucide-react';

const GOLD  = '#D4AF37';
const DARK  = '#060B16';
const CARD  = '#0C1A1D';
const BORDER = '#2A3F4A';

const PATHS = [
  {
    id: 'patient',
    icon: Heart,
    label: 'I\'m seeking care',
    sub: 'Patient · Client',
    description: 'Book procedures with verified doctors abroad. M monitors your safety, coordinates your travel, and is with you every step of the journey.',
    cta: 'Create patient account',
    href: '/register',
    accentColor: GOLD,
    glowColor: 'rgba(212,175,55,0.18)',
    borderHover: `rgba(212,175,55,0.45)`,
    features: ['Medical procedure booking', 'Journey safety monitoring', 'Emergency support 24/7'],
  },
  {
    id: 'partner',
    icon: Stethoscope,
    label: 'I\'m a provider',
    sub: 'Doctor · Agency · Companion · Security · Chauffeur',
    description: 'Join M\'s verified partner network. Receive pre-screened international patients and access tools built for medical travel professionals.',
    cta: 'Apply as a partner',
    href: '/partner-signup',
    accentColor: '#60a5fa',
    glowColor: 'rgba(96,165,250,0.12)',
    borderHover: 'rgba(96,165,250,0.35)',
    features: ['Verified patient referrals', 'Partner dashboard & tools', 'SAFE-T™ compliance badge'],
  },
];

export default function SignupLanding() {
  const [hovered, setHovered] = useState(null);
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: DARK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: '"SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: `radial-gradient(ellipse, ${GOLD}0A 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 48 }}>
        <div style={{
          width: 38, height: 38, background: GOLD, color: DARK,
          fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 900,
          borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 24px rgba(212,175,55,0.45)`,
        }}>M</div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>MORALES</p>
          <p style={{ margin: 0, fontSize: 9, color: GOLD, letterSpacing: '0.22em', fontWeight: 500 }}>MEDICAL TRAVEL SAFETY</p>
        </div>
      </Link>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          How are you joining M?
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Choose the path that fits you — takes under 2 minutes.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20,
        width: '100%',
        maxWidth: 760,
      }}>
        {PATHS.map(path => {
          const Icon = path.icon;
          const isHovered = hovered === path.id;
          return (
            <div
              key={path.id}
              onMouseEnter={() => setHovered(path.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => navigate(path.href)}
              style={{
                background: isHovered ? `${CARD}` : CARD,
                border: `1px solid ${isHovered ? path.borderHover : BORDER}`,
                borderRadius: 20,
                padding: '32px 28px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.18s',
                transform: isHovered ? 'translateY(-3px)' : 'none',
                boxShadow: isHovered ? `0 16px 48px ${path.glowColor}, 0 4px 16px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: isHovered ? `${path.accentColor}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isHovered ? `${path.accentColor}40` : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 22,
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                <Icon style={{ width: 22, height: 22, color: isHovered ? path.accentColor : 'rgba(255,255,255,0.5)', transition: 'color 0.2s' }} />
              </div>

              {/* Sub-label */}
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: isHovered ? path.accentColor : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                {path.sub}
              </p>

              {/* Title */}
              <h2 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                {path.label}
              </h2>

              {/* Description */}
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                {path.description}
              </p>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                {path.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isHovered ? path.accentColor : 'rgba(255,255,255,0.2)',
                      flexShrink: 0, transition: 'background 0.2s',
                    }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px',
                borderRadius: 12,
                background: isHovered
                  ? path.id === 'patient'
                    ? `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`
                    : 'rgba(96,165,250,0.15)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isHovered ? (path.id === 'patient' ? 'transparent' : 'rgba(96,165,250,0.3)') : 'rgba(255,255,255,0.07)'}`,
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: isHovered && path.id === 'patient' ? DARK : isHovered ? '#93c5fd' : 'rgba(255,255,255,0.6)',
                  transition: 'color 0.2s',
                }}>
                  {path.cta}
                </span>
                <ArrowRight style={{
                  width: 15, height: 15,
                  color: isHovered && path.id === 'patient' ? DARK : isHovered ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                  transform: isHovered ? 'translateX(3px)' : 'none',
                  transition: 'transform 0.18s, color 0.2s',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sign in link */}
      <p style={{ margin: '36px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
