/**
 * LuxuryStatsBar — animated live stat counters
 * Numbers count up when the section scrolls into view.
 * The "0 patients unreachable" is the most powerful zero in medical travel.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

const STATS = [
  { value: 2847,  suffix: '',   prefix: '',  label: 'Journeys Completed',       sub: 'patients safely home',          color: GOLD },
  { value: 14.2,  suffix: 'M', prefix: '$',  label: 'Saved vs US Pricing',      sub: 'kept in our patients\' pockets', color: GOLD },
  { value: 9621,  suffix: '',   prefix: '',  label: 'Checkpoints Confirmed',     sub: 'every handshake tracked',       color: GOLD },
  { value: 0,     suffix: '',   prefix: '',  label: 'Patients Unreachable',      sub: 'our safety record',             color: GOLD, isZero: true },
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
  const count = useCountUp(stat.value, 2000 + index * 200, started);
  const displayValue = stat.value % 1 !== 0
    ? count.toFixed(1)
    : count.toLocaleString();

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
        {stat.prefix}{displayValue}{stat.suffix}
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
