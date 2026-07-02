import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const OUTCOMES = [
  {
    icon: '🌍',
    color: '#60a5fa',
    title: 'Before you land, we\'ve already prepared.',
    desc: 'Your destination is scanned. Your driver is confirmed. Your neighborhood is pre-screened. You arrive to a journey that\'s already been thought through — every detail.',
  },
  {
    icon: '📍',
    color: '#22c55e',
    title: 'Every checkpoint confirmed.',
    desc: 'From airport pickup to clinic arrival, every handshake is tracked in real time. Miss a check-in — and your Morales coordinator is alerted immediately and reaches out.',
  },
  {
    icon: '👨‍👩‍👧',
    color: GOLD,
    title: 'Your family is never in the dark.',
    desc: 'Share one link before you fly. They see every checkpoint confirmed in real time — like a flight tracker, designed entirely for your surgery journey.',
  },
  {
    icon: '📵',
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
          {OUTCOMES.map(({ icon, color, title, desc }, i) => (
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
              <div style={{ fontSize: 32, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
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

        {/* Single CTA */}
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <Link
            to="/booking"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', borderRadius: 99,
              background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
              color: '#060B16', fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
              textDecoration: 'none',
              boxShadow: `0 8px 32px ${BRAND.goldAlpha(0.35)}`,
            }}
          >
            Start Your Journey <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
          <p style={{
            marginTop: 14, fontSize: 11,
            color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em',
          }}>
            No account needed · Response within 24 hours · 100% secure
          </p>
        </div>

      </div>
    </section>
  );
}
