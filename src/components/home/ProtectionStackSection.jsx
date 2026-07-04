import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, MapPin, Users, WifiOff } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const OUTCOMES = [
  {
    Icon: Globe,
    color: '#60a5fa',
    title: 'Before you land, we\'ve already prepared.',
    desc: 'Your destination is scanned. Your driver is confirmed. Your neighborhood is pre-screened. You arrive to a journey that\'s already been thought through — every detail.',
  },
  {
    Icon: MapPin,
    color: '#22c55e',
    title: 'Every checkpoint confirmed.',
    desc: 'From airport pickup to clinic arrival, every handshake is tracked in real time. Miss a check-in — and your Morales coordinator is alerted immediately and reaches out.',
  },
  {
    Icon: Users,
    color: GOLD,
    title: 'Your family is never in the dark.',
    desc: 'Share one link before you fly. They see every checkpoint confirmed in real time — like a flight tracker, designed entirely for your surgery journey.',
  },
  {
    Icon: WifiOff,
    color: '#a855f7',
    title: 'No signal? You\'re still protected.',
    desc: 'Offline GPS cache, queued emergency alerts, encrypted vault. When connectivity fails, Morales doesn\'t.',
  },
];

export default function ProtectionStackSection() {
  return (
    <section style={{
      background: 'linear-gradient(180deg, #060B16 0%, #070E1A 50%, #060B16 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      padding: '80px 0 100px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.3em',
            color: GOLD, textTransform: 'uppercase', marginBottom: 14,
          }}>
            Your Journey. Protected.
          </p>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.1, color: '#fff', marginBottom: 16,
            fontFamily: '"SF Pro Display", system-ui, sans-serif',
          }}>
            You focus on healing.<br />
            <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 400, fontFamily: 'Georgia, serif' }}>
              We handle everything else.
            </span>
          </h2>
          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.45)',
            maxWidth: 520, margin: '0 auto', lineHeight: 1.7,
          }}>
            Behind the scenes, Morales is running hundreds of checks, monitoring your journey,
            and standing by — so you never have to think about what could go wrong.
          </p>
        </div>

        {/* 2×2 outcome grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OUTCOMES.map(({ Icon, color, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              style={{
                borderRadius: 20,
                padding: '28px 28px 24px',
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, marginBottom: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${color}15`, border: `1px solid ${color}35`,
              }}>
                <Icon style={{ width: 18, height: 18, color }} strokeWidth={1.5} />
              </div>
              <h3 style={{
                fontSize: 17, fontWeight: 700, color: '#fff',
                marginBottom: 10, lineHeight: 1.3, letterSpacing: '-0.01em',
                fontFamily: '"SF Pro Display", system-ui, sans-serif',
              }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
                {desc}
              </p>
              <div style={{
                width: 28, height: 2, background: color,
                borderRadius: 2, marginTop: 20, opacity: 0.65,
              }} />
            </motion.div>
          ))}
        </div>

        {/* Emotional closing */}
        <div style={{ textAlign: 'center', marginTop: 72, paddingTop: 56, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{
            fontSize: 'clamp(1.3rem, 3vw, 2rem)',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.45)',
            marginBottom: 10,
            lineHeight: 1.3,
          }}>
            "When your flight lands,<br />who will be there?"
          </p>
          <p style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 40,
            letterSpacing: '-0.02em',
          }}>
            We will.
          </p>
          <Link
            to="/booking"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 40px', borderRadius: 99,
              background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
              color: '#060B16', fontSize: 15, fontWeight: 800, letterSpacing: '0.02em',
              textDecoration: 'none',
              boxShadow: `0 8px 40px ${BRAND.goldAlpha(0.4)}`,
            }}
          >
            Begin Your Journey <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
          <p style={{
            marginTop: 16, fontSize: 11,
            color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em',
          }}>
            No account needed · 0 patients unreachable · 2,847 journeys completed
          </p>
        </div>

      </div>
    </section>
  );
}
