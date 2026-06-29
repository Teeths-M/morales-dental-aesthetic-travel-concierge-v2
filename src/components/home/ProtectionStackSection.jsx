/**
 * ProtectionStackSection
 * Homepage showcase of all 4 intelligence layers — the competitive moat.
 * Each system is live and independent; together they form the world's only
 * complete medical travel protection stack.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD = BRAND.gold;

const SYSTEMS = [
  {
    id:      'evn',
    tag:     'EVN-iQ400™',
    name:    'Environmental Intelligence',
    color:   '#60a5fa',
    emoji:   '🌍',
    score:   { value: 195, unit: 'Countries', label: 'Global coverage' },
    points:  [
      'Live government travel advisories',
      'GPS-triggered neighbourhood scans',
      'Works offline — 200+ risk zones preloaded',
    ],
    badge:   'NEW',
    link:    '/demo/evn',
    linkLabel: 'See live demo →',
  },
  {
    id:      'medguard',
    tag:     'MedGuard™',
    name:    'Behavioural Safety AI',
    color:   '#a855f7',
    emoji:   '🧠',
    score:   { value: '0–100', unit: 'Score', label: 'Real-time risk index' },
    points:  [
      '6 behavioural signals analysed continuously',
      'Refreshes every 5 minutes during travel',
      'Predictive escalation 45 min before miss',
    ],
    badge:   'AI',
    link:    '/demo/medguard',
    linkLabel: 'See demo →',
  },
  {
    id:      'safet',
    tag:     'Safe-T4life™',
    name:    'Check-In Protocol',
    color:   '#22c55e',
    emoji:   '🛡️',
    score:   { value: '12h', unit: 'Cycle', label: 'Max check-in interval' },
    points:  [
      '5-tier automated escalation chain',
      'Police + embassy engaged at 9h no-response',
      'Offline queue — syncs when reconnected',
    ],
    badge:   null,
    link:    '/safe-t',
    linkLabel: 'Learn more →',
  },
  {
    id:      'iq200',
    tag:     'iQ200™',
    name:    'Journey Coordination',
    color:   GOLD,
    emoji:   '✈️',
    score:   { value: 9, unit: 'Handshakes', label: 'Per journey' },
    points:  [
      'Sequential GPS checkpoints home → home',
      'SMS shortcode backup (HS1–HS9)',
      'Golden M awarded on completion',
    ],
    badge:   null,
    link:    '/how-it-works',
    linkLabel: 'See the journey →',
  },
];

// Animated ring showing all systems connected
function ConnectionRing({ size = 180 }) {
  const cx = size / 2;
  const r  = size / 2 - 16;
  const colors = SYSTEMS.map(s => s.color);
  const segAngle = 360 / colors.length;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {colors.map((color, i) => {
          const start = (i * segAngle * Math.PI) / 180;
          const end   = ((i + 0.85) * segAngle * Math.PI) / 180;
          const x1 = cx + r * Math.cos(start);
          const y1 = cx + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end);
          const y2 = cx + r * Math.sin(end);
          return (
            <motion.path
              key={i}
              d={`M ${cx} ${cx} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={`${color}15`}
              stroke={color}
              strokeWidth="1.5"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity }}
            />
          );
        })}
        {/* Centre ring */}
        <circle cx={cx} cy={cx} r={r * 0.42}
          fill="#060B16" stroke={`${GOLD}30`} strokeWidth="1" />
      </svg>

      {/* Centre text */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/morales-m-mark.png" alt="M" style={{ width: 32, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
        <p style={{ margin: '4px 0 0', fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', color: GOLD }}>PROTECTED</p>
      </div>
    </div>
  );
}

export default function ProtectionStackSection() {
  const [activeIdx, setActiveIdx] = useState(0);

  // Cycle highlight every 3s
  useEffect(() => {
    const id = setInterval(() => setActiveIdx(i => (i + 1) % SYSTEMS.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section style={{
      background: 'linear-gradient(180deg, #060B16 0%, #070E1A 50%, #060B16 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      padding: '80px 0 100px',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>
            The Complete Protection Stack
          </p>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 800,
            letterSpacing: '-0.03em', lineHeight: 1.1, color: '#fff', marginBottom: 16,
            fontFamily: '"SF Pro Display", system-ui, sans-serif',
          }}>
            Four systems. One journey.<br />
            <span style={{ color: GOLD, fontStyle: 'italic', fontWeight: 400, fontFamily: 'Georgia, serif' }}>
              Zero blind spots.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            No other medical travel platform combines environmental intelligence,
            behavioural AI, check-in protocols, and GPS handshakes into a single
            unified protection layer.
          </p>
        </div>

        {/* Centre ring — mobile: above cards, desktop: between cards */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 24 }} className="lg:hidden">
          <ConnectionRing size={160} />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>ALL SYSTEMS ACTIVE</p>
        </div>

        {/* System cards — mobile: 2-column grid, desktop: 3-col with ring in centre */}
        <div className="hidden lg:grid" style={{ gridTemplateColumns: '1fr auto 1fr', gap: 40, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SYSTEMS.slice(0, 2).map((sys, i) => (
              <SystemCard key={sys.id} sys={sys} isActive={activeIdx === i} onClick={() => setActiveIdx(i)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <ConnectionRing size={200} />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textAlign: 'center' }}>ALL SYSTEMS ACTIVE</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SYSTEMS.slice(2, 4).map((sys, i) => (
              <SystemCard key={sys.id} sys={sys} isActive={activeIdx === i + 2} onClick={() => setActiveIdx(i + 2)} />
            ))}
          </div>
        </div>

        {/* Mobile: 2-col card grid */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          {SYSTEMS.map((sys, i) => (
            <SystemCard key={sys.id} sys={sys} isActive={activeIdx === i} onClick={() => setActiveIdx(i)} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <Link to="/demo/evn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 99,
              background: `linear-gradient(135deg, ${GOLD} 0%, #E8C85C 100%)`,
              color: '#060B16', fontSize: 13, fontWeight: 800, letterSpacing: '0.02em',
              textDecoration: 'none',
              boxShadow: `0 8px 32px ${BRAND.goldAlpha(0.35)}`,
            }}
          >
            See EVN-iQ400 Live Demo <ArrowRight style={{ width: 15, height: 15 }} />
          </Link>
          <Link to="/demo"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '14px 24px', borderRadius: 99, marginLeft: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Full platform demo →
          </Link>
        </div>

      </div>
    </section>
  );
}

function SystemCard({ sys, isActive, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: 18, padding: '18px 20px', cursor: 'pointer',
        background: isActive ? `${sys.color}10` : 'rgba(255,255,255,0.02)',
        border: `1.5px solid ${isActive ? sys.color + '55' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.3s ease',
        boxShadow: isActive ? `0 0 24px ${sys.color}20` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{sys.emoji}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: sys.color, letterSpacing: '0.05em' }}>{sys.tag}</p>
              {sys.badge && (
                <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${sys.color}25`, color: sys.color, letterSpacing: '0.1em' }}>{sys.badge}</span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{sys.name}</p>
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: sys.color, letterSpacing: '-0.02em' }}>{sys.score.value}</p>
          <p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{sys.score.unit}</p>
        </div>
      </div>

      {/* Feature points */}
      {isActive && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.25 }}>
          <div style={{ borderTop: `1px solid ${sys.color}20`, paddingTop: 10, marginTop: 4 }}>
            {sys.points.map((pt, i) => (
              <p key={i} style={{ margin: '4px 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: sys.color, flexShrink: 0, marginTop: 1 }}>·</span> {pt}
              </p>
            ))}
            <Link to={sys.link} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, fontWeight: 700, color: sys.color, textDecoration: 'none' }}>
              {sys.linkLabel} <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
