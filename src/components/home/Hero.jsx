import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, BadgeCheck, Plane, Users, Heart, Star, Phone, MessageCircle } from 'lucide-react';
import HeroGlobe from './HeroGlobe';
import { useAuth } from '@/lib/AuthContext';

const GOLD = '#C5A059';

const STEPS = [
  { icon: '📋', label: 'Consultation' },
  { icon: '✈️', label: 'Travel' },
  { icon: '🏥', label: 'Treatment' },
  { icon: '🌿', label: 'Recovery' },
  { icon: '🏡', label: 'Return Home' },
];

const BADGES = [
  { icon: Shield,     label: 'SAFE-T 4LIFE™',       sub: 'AI-Powered Safety' },
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
  { icon: Plane,      label: 'Door-to-Door Care',    sub: 'Travel. Care. Recover.' },
];

const BENEFITS = [
  { icon: Users,  label: 'Human Care',            desc: 'Real people, real support, when you need it most.' },
  { icon: Shield, label: 'Safe Connections',       desc: 'Vetted specialists and trusted global partners.' },
  { icon: Heart,  label: 'Better Outcomes',        desc: 'Care designed around your safety and recovery.' },
  { icon: Plane,  label: 'Travel With Confidence', desc: "From arrival to recovery, you're never alone." },
];

const AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=56&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=56&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=56&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=56&q=80&auto=format&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=56&q=80&auto=format&fit=crop&crop=face',
];

export default function Hero() {
  const { navigateToLogin } = useAuth();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(p => (p + 1) % STEPS.length), 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ background: '#080f1c', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* ── NAV BAR ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,15,28,0.90)', backdropFilter: 'blur(12px)',
        position: 'relative', zIndex: 50,
      }}>
        {/* Left: hamburger + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }} aria-label="Menu">
            <div style={{ width: 18, height: 1.5, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
            <div style={{ width: 18, height: 1.5, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
            <div style={{ width: 18, height: 1.5, background: 'rgba(255,255,255,0.55)', borderRadius: 2 }} />
          </button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1 }}>MORALES</div>
            <div style={{ fontSize: 7.5, fontWeight: 600, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2, lineHeight: 1 }}>Dental &amp; Aesthetic Travel Concierge</div>
          </div>
        </div>

        {/* Center: SAFE-T brand */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>SAFE-T4LIFE™</div>
          <div style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(197,160,89,0.50)', textTransform: 'uppercase', fontWeight: 600, marginTop: 1 }}>Safety Intelligence Engine</div>
        </div>

        {/* Right: icons + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[Phone, MessageCircle].map((Icon, i) => (
            <button key={i} style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} color="rgba(255,255,255,0.60)" />
            </button>
          ))}
          <Link to="/booking">
            <button style={{
              background: GOLD, color: '#080f1c', border: 'none', borderRadius: 8,
              padding: '9px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em',
            }}>
              Book a Consultation
            </button>
          </Link>
        </div>
      </header>

      {/* ── MAIN 3-COLUMN BODY ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: 0, overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
          style={{ padding: '24px 20px', display: 'flex', alignItems: 'center' }}
        >
          <div style={{
            width: '100%',
            background: 'rgba(12,22,40,0.75)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            padding: '24px 22px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Headline */}
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.08, fontFamily: 'var(--font-display)', margin: 0, marginBottom: 16 }}>
                Your safe care<br />journey starts here.
              </h1>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: 0, marginBottom: 10 }}>
                Verified specialists, travel coordination, and recovery support in one clear, human care plan.
              </p>
              <p style={{ fontSize: 13, color: GOLD, fontStyle: 'italic', margin: 0 }}>
                "From consultation to the coast — your safety travels with you."
              </p>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/booking">
                <button style={{
                  background: GOLD, color: '#080f1c', border: 'none', borderRadius: 8,
                  padding: '11px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  Begin Your Journey →
                </button>
              </Link>
              <Link to="/procedures">
                <button style={{
                  background: 'transparent', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: 8, padding: '11px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  Explore Treatments
                </button>
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(197,160,89,0.12)',
                  borderRadius: 12, padding: '10px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(197,160,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} color={GOLD} />
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.40)', lineHeight: 1.3 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Care pipeline */}
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 4 }}>Care, Coordinated For You</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>Every detail handled. Every step supported.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: step === i ? 1 : 0.38, transition: 'opacity 0.4s', flexShrink: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step === i ? 'rgba(197,160,89,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${step === i ? 'rgba(197,160,89,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.4s',
                      }}>
                        {s.icon}
                      </div>
                      <span style={{ fontSize: 6, fontWeight: 700, color: step === i ? GOLD : 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.15)', minWidth: 4 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Care Concierge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(6,12,22,0.80)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${GOLD}`, overflow: 'hidden', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80&auto=format&fit=crop&crop=face"
                  alt="Care Concierge" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Care Concierge</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontWeight: 600, color: '#4ade80' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                    Online
                  </span>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
                  We're here for you 24/7. Need help planning your perfect care journey?
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── CENTER: Globe ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.0, delay: 0.4, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
        >
          <HeroGlobe />
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          style={{ padding: '24px 20px 24px 8px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}
        >
          {/* Mountain photo */}
          <div style={{ borderRadius: 16, overflow: 'hidden', height: 185, position: 'relative', flexShrink: 0 }}>
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=85&auto=format&fit=crop"
              alt="Golden hour mountains"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(8,15,28,0.65) 100%)' }} />
          </div>

          {/* Benefit cards */}
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(12,22,40,0.75)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '10px 14px',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(197,160,89,0.10)', border: '1px solid rgba(197,160,89,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={GOLD} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>{desc}</div>
              </div>
            </div>
          ))}

          {/* Social proof */}
          <div style={{
            background: 'rgba(12,22,40,0.75)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', marginBottom: 5 }}>Trusted by Patients Worldwide</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={11} fill="#f59e0b" color="#f59e0b" />)}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginLeft: 4 }}>4.9</span>
              </div>
              <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.32)' }}>Based on 1,200+ journeys</div>
            </div>
            <div style={{ display: 'flex', marginLeft: 8 }}>
              {AVATARS.map((src, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #080f1c', overflow: 'hidden', marginLeft: i === 0 ? 0 : -8, flexShrink: 0, zIndex: AVATARS.length - i }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM BAND ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(6,12,22,0.80)',
        padding: '20px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(197,160,89,0.10)', border: '1px solid rgba(197,160,89,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Heart size={11} color={GOLD} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', margin: '0 0 4px' }}>
          More Than a Journey — It's Peace of Mind
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: 0 }}>
          Real people. Real care. Real support — before, during, and after your trip.
        </p>
      </div>
    </section>
  );
}