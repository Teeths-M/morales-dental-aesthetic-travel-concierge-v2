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
  { display: '100%', label: 'Doctors Credential-Checked', sub: 'licences checked against the issuing medical board before they are listed', color: GOLD },
  // Was '8'. The journey is NINE handshakes — HANDSHAKE_LABELS has nine entries
  // and completion is `currentStep >= 9`. The hero on this same page already
  // said "Nine checkpoints", so the bar was both wrong and contradicting the
  // headline two scrolls above it.
  { display: '9',    label: 'Confirmed Checkpoints Per Journey', sub: 'driver · airport · hotel · clinic · companion · home — every handoff confirmed', color: GOLD },
  /* This slot used to read: 24/7 · Emergency Escalation · "missed check-ins
     escalate automatically — SMS, call, dispatch".

     The escalation ladder is built and correct, but it is not running: the
     functions that drive it are not deployed, and nothing schedules them. A
     missed check-in today is escalated when a human opens /admin and presses a
     button. "Automatically" is therefore not true yet, and this is the front
     door.

     Replaced with a claim that IS true today and verified
     (tests/contrast.test.js aside, see VaultUploader + vaultEncryption.js):
     documents are encrypted in the browser with a password we never receive.

     PUT THE ESCALATION STAT BACK the day the safety functions deploy and the
     scheduler is green — it is the stronger claim, and it will be honest then. */
  { display: 'AES-256', label: 'Documents Encrypted On Your Device', sub: 'your password never reaches our servers — only you can open them', color: GOLD },
  { display: 'ZERO', label: 'Unsafe Plans Ever Approved', sub: 'RED-flagged combinations are blocked — no exceptions, no override', color: GOLD, isZero: true },
];

function StatCard({ stat, index, started: _started }) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col items-center text-center px-3 py-5 sm:px-4 sm:py-6"
      style={{ borderRight: index < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
    >
      {/* Number */}
      <div
        className="font-black leading-none mb-2"
        style={{
          fontSize:    'clamp(1.8rem, 5vw, 3.4rem)',
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