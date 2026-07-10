/**
 * LuxuryStatsBar — animated live stat counters
 * Numbers count up when the section scrolls into view.
 * The "0 patients unreachable" is the most powerful zero in medical travel.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

// Protocol facts, not usage counts — every claim here is verifiable in the
// product today. No invented numbers on patient-facing surfaces, ever.
const STATS = [
  { display: '100%', label: 'Doctors Credential-Checked', sub: 'licenses, registries, history — verified before they ever see you', color: GOLD },
  { display: '8',    label: 'Confirmed Checkpoints Per Journey', sub: 'driver · clinic · surgeon · hotel — every handoff verified', color: GOLD },
  { display: '24/7', label: 'Emergency Escalation', sub: 'missed check-ins escalate automatically — SMS, call, dispatch', color: GOLD },
  { display: 'ZERO', label: 'Unsafe Plans Ever Approved', sub: 'RED-flagged combinations are blocked — no exceptions, no override', color: GOLD, isZero: true },
];

function useCountUp(target, duration = 2000, started = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;
    if (target === 0) { setValue(0); return; }

    const startTime = performance.now();
    const isDecimal = target % 1 !== 0;

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setValue(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration, started]);

  return value;
}

function StatCard({ stat, index, started }) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col items-center text-center px-4 py-6"
      style={{ borderRight: index < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
    >
      {/* Number */}
      <div
        className="font-black leading-none mb-2"
        style={{
          fontSize:    'clamp(2.2rem, 5vw, 3.4rem)',
          color:       stat.color,
          letterSpacing: '-0.03em',
          fontFamily:  '"SF Pro Display", system-ui, sans-serif',
          filter:      stat.isZero ? `drop-shadow(0 0 12px ${stat.color}80)` : undefined,
          animation:   stat.isZero ? 'zeroPulse 2.5s ease-in-out infinite' : undefined,
        }}
      >
        {stat.display}
      </div>

      {/* Label */}
      <p className="text-xs font-semibold text-white mb-1" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {stat.label}
      </p>

      {/* Sub */}
      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {stat.sub}
      </p>

    </motion.div>
  );
}

export default function LuxuryStatsBar() {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-16">
        <div
          className="grid grid-cols-2 lg:grid-cols-4"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        >
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} started={started} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes zeroPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </section>
  );
}
