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

// Caribbean woman facing golden-hour ocean
const HERO_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=90&auto=format&fit=crop';

export default function Hero() {
  const { navigateToLogin } = useAuth();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(p => (p + 1) % STEPS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{
      background: '#060c17',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── NAVIGATION ── */}
      <header style={{
        position: 'relative', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,12,23,0.88)',
        backdropFilter: 'blur(14px)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, padding: 2 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 18, height: 1.5, background: 'rgba(255,255,255,0.50)', borderRadius: 2 }} />)}
          </button>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1 }}>MORALES</div>
            <div style={{ fontSize: 7.5, fontWeight: 600, color: GOLD, letterSpacing: '0.11em', textTransform: 'uppercase', marginTop: 2 }}>Dental &amp; Aesthetic Travel Concierge</div>
          </div>
        </div>

        {/* Center brand */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.28em', color: GOLD, textTransform: 'uppercase' }}>SAFE-T4LIFE™</div>
          <div style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(197,160,89,0.48)', textTransform: 'uppercase', fontWeight: 600, marginTop: 1 }}>Safety Intelligence Engine</div>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[Phone, MessageCircle].map((Icon, i) => (
            <button key={i} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={14} color="rgba(255,255,255,0.58)" />
            </button>
          ))}
          <Link to="/booking">
            <button style={{ background: GOLD, color: '#060c17', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', letterSpacing: '0.02em' }}>
              Book a Consultation
            </button>
          </Link>
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 290px', minHeight: 0 }}>

        {/* ─── LEFT: Emotional copy ─── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85 }}
          style={{ display: 'flex', alignItems: 'center', padding: '28px 16px 28px 24px' }}
        >
          <div style={{
            width: '100%',
            background: 'rgba(10,20,38,0.72)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 22,
            padding: '28px 24px',
            backdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column', gap: 22,
          }}>
            {/* Hero copy */}
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.08, margin: '0 0 16px' }}>
                Your safe care<br />journey starts here.
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.65, margin: '0 0 12px' }}>
                Verified specialists, travel coordination, and recovery support in one clear, human care plan.
              </p>
              <p style={{ fontSize: 13.5, color: GOLD, fontStyle: 'italic', margin: 0, lineHeight: 1.55 }}>
                "From consultation to the coast —<br />your safety travels with you."
              </p>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/booking">
                <button style={{ background: GOLD, color: '#060c17', border: 'none', borderRadius: 9, padding: '12px 20px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Begin Your Journey →
                </button>
              </Link>
              <Link to="/procedures">
                <button style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.26)', borderRadius: 9, padding: '12px 16px', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Explore Treatments
                </button>
              </Link>
            </div>

            {/* Minimal trust — 3 inline items, no grid cards */}
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { icon: Shield,     label: 'SAFE-T 4LIFE™',       sub: 'AI-Powered Safety' },
                { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
                { icon: Plane,      label: 'Door-to-Door Care',    sub: 'Travel. Care. Recover.' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.10)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(197,160,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={12} color={GOLD} />
                  </div>
                  <div style={{ fontSize: 7.5, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.38)', lineHeight: 1.3 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Care journey — minimal animated pipeline */}
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 4 }}>Care, Coordinated For You</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>Every detail handled. Every step supported.</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: step === i ? 1 : 0.35, transition: 'opacity 0.45s', flexShrink: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step === i ? 'rgba(197,160,89,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${step === i ? 'rgba(197,160,89,0.38)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.45s' }}>
                        {s.icon}
                      </div>
                      <span style={{ fontSize: 5.5, fontWeight: 700, color: step === i ? GOLD : 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.14)', minWidth: 4 }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Care Concierge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(5,10,20,0.80)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${GOLD}`, overflow: 'hidden', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80&auto=format&fit=crop&crop=face"
                  alt="Care Concierge" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff' }}>Care Concierge</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontWeight: 600, color: '#4ade80' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                    Online
                  </span>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
                  We're here for you 24/7. Need help planning your perfect care journey?
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── CENTER: Globe ─── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, delay: 0.45, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 8px' }}
        >
          <HeroGlobe />
        </motion.div>

        {/* ─── RIGHT: Cinematic image + benefits ─── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', padding: '24px 24px 24px 8px', gap: 12, justifyContent: 'center' }}
        >
          {/* Cinematic golden-hour coastal image */}
          <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', height: 195, flexShrink: 0 }}>
            <img
              src={HERO_IMAGE}
              alt="Golden hour coastal healing"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Warm cinematic overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(160,90,10,0.18) 0%, transparent 40%, rgba(6,12,23,0.72) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(6,12,23,0.70) 100%)' }} />
            {/* Fallback gradient */}
            <div style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'linear-gradient(160deg, #2a1a04 0%, #0b1e3a 55%, #060c17 100%)' }} />
          </div>

          {/* Benefit items — editorial style, NOT dashboard cards */}
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'rgba(10,20,38,0.72)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 13,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(197,160,89,0.10)', border: '1px solid rgba(197,160,89,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={GOLD} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.44)', lineHeight: 1.45 }}>{desc}</div>
              </div>
            </div>
          ))}

          {/* Social proof — minimal */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'rgba(10,20,38,0.72)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 13,
          }}>
            <div>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.13em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 5 }}>Trusted by Patients Worldwide</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                {[...Array(5)].map((_,i) => <Star key={i} size={11} fill="#f59e0b" color="#f59e0b" />)}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginLeft: 5 }}>4.9</span>
              </div>
              <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.30)' }}>Based on 1,200+ journeys</div>
            </div>
            <div style={{ display: 'flex' }}>
              {AVATARS.map((src, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #060c17', overflow: 'hidden', marginLeft: i === 0 ? 0 : -8, zIndex: AVATARS.length - i, flexShrink: 0 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM EMOTIONAL ANCHOR ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(5,10,20,0.82)',
        backdropFilter: 'blur(12px)',
        padding: '22px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(197,160,89,0.10)', border: '1px solid rgba(197,160,89,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Heart size={11} color={GOLD} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>
          More Than a Journey — It's Peace of Mind
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: 0 }}>
          Real people. Real care. Real support — before, during, and after your trip.
        </p>
      </div>
    </section>
  );
}