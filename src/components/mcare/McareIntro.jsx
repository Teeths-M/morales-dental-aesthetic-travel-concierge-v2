/**
 * McareIntro — a ~25s cinematic, full-screen intro sequence for recording
 * the buildathon demo video. Not part of the live product experience; a
 * standalone route (`/demo/mcare-intro`, see McareIntroDemo.jsx) meant to be
 * played once and captured in Loom, then cut to a real screen-recorded demo
 * of the actual app.
 *
 * Reuses real, already-approved pieces rather than inventing new visual
 * language: `LivingOrb` (the real M-Safe robot component — same asset, same
 * ring/glow "atmosphere" this whole app already uses) for every robot
 * appearance, and this app's own gold (#D4AF37) / deep-navy design tokens.
 * The Caribbean "map" is a deliberately abstract, stylized set of glowing
 * dots + a drawn connector path — not detailed coastline art or any
 * depiction of people — both to stay within what's honestly buildable here
 * (no image-generation tool available) and to avoid any risk of the
 * geographic/cultural stereotyping the brief explicitly warned against.
 * Flags are real Unicode flag emoji (official flags), not illustrations.
 *
 * Every phone-mockup exchange is grounded in a real, shipped M-Care
 * capability (doctor trust-tier verification, Care Room live translation,
 * JourneyPlan trip building, on-demand ride dispatch) — see
 * mcareIntroCopy.js's own header comment. No absolute/unverifiable claims
 * ("guaranteed," "verified everywhere") appear anywhere in the copy.
 *
 * Renders as a fixed, full-viewport overlay (position:fixed, inset:0) at a
 * z-index above every other fixed element in this app (Header's mobile tray
 * is 9999, MCareOrb's panel is 9001) so it plays truly full-screen and
 * chrome-free for recording, without needing to restructure how routes nest
 * under AppLayout — every public route (including every existing /demo/*
 * page) still renders inside Header/Footer/BottomTabBar; this just visually
 * covers all of it, the same "fixed overlay above everything" technique
 * MCareOrb's own panel already uses.
 *
 * Timing is driven by real elapsed-time timers (setTimeout, not scrubbable
 * video frames) advancing a small phase/island state machine — 'hook'
 * (0-3s) -> 'journey' (3-15s, 7 islands x ~1.71s) -> 'network' (15-21s) ->
 * 'reveal' (21-25s, holds). "Skip intro" jumps straight to 'reveal' — both
 * the required accessible bypass control and a fast way to preview the
 * ending while tuning this. `prefers-reduced-motion` keeps the exact same
 * phase timing (the video's total length shouldn't change) but swaps every
 * spring/path-draw/camera-pull animation for a plain, fast opacity fade —
 * the same "fully simplified, not just slower" convention LivingOrb.jsx
 * already established elsewhere in this app.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LivingOrb from '@/components/mcare/LivingOrb';
import {
  HOOK_LINE, ISLAND_STOPS, MOTION_LINES, FINAL_LINES,
  BRAND_LINE, BRAND_SUBLINE, SKIP_LABEL, REPLAY_LABEL,
} from '@/components/mcare/mcareIntroCopy';

const GOLD = '#D4AF37';
const GOLD_BRIGHT = '#F4D97A';
const NAVY = '#060B16';
const NAVY_CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

const PHASE_HOOK = 'hook';
const PHASE_JOURNEY = 'journey';
const PHASE_NETWORK = 'network';
const PHASE_REVEAL = 'reveal';

const HOOK_MS = 3000;
const ISLAND_SLOT_MS = 12000 / ISLAND_STOPS.length; // 12s across all stops
const JOURNEY_END_MS = HOOK_MS + 12000; // 15000
const NETWORK_END_MS = JOURNEY_END_MS + 6000; // 21000
const REVEAL_END_MS = NETWORK_END_MS + 4000; // 25000

// Abstract, simplified relative positions (not a precise projection) in a
// 0-400 x 0-300 viewBox — Bahamas north, Jamaica west, the Lesser Antilles
// arcing south-east through Saint Lucia/Barbados/Trinidad, Guyana on the
// South American mainland. Purely for a stylized "signal moving across the
// region" visual, not a claim of geographic precision.
const ISLAND_POS = {
  'Jamaica': { x: 70, y: 128 },
  'Barbados': { x: 308, y: 162 },
  'Trinidad and Tobago': { x: 292, y: 202 },
  'Dominican Republic': { x: 150, y: 98 },
  'The Bahamas': { x: 128, y: 44 },
  'Saint Lucia': { x: 274, y: 152 },
  'Guyana': { x: 318, y: 238 },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** A small, deliberately static/deterministic phone mockup — never live data. */
function PhoneMockup({ stop, reduced }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.94 }}
      transition={{ duration: reduced ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: 158, borderRadius: 26, background: NAVY_CARD, border: `1px solid ${BORDER}`,
        boxShadow: `0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.10)`,
        padding: '10px 10px 12px', flexShrink: 0,
      }}
    >
      <div style={{ height: 5, width: 34, borderRadius: 3, background: 'rgba(255,255,255,0.14)', margin: '0 auto 8px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <LivingOrb state="idle" size={18} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff' }}>M-CARE</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '88%', background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`, color: '#1A1204', borderRadius: '10px 10px 2px 10px', padding: '6px 9px', fontSize: 9.5, fontWeight: 600, lineHeight: 1.3 }}>
          {stop.userLine}
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: '#E5E7EB', borderRadius: '10px 10px 10px 2px', padding: '6px 9px', fontSize: 9.5, lineHeight: 1.3 }}>
          {stop.replyLine}
        </div>
      </div>
      <p style={{ margin: '9px 2px 0', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: GOLD, textTransform: 'uppercase' }}>{stop.caption}</p>
    </motion.div>
  );
}

/** The abstract Caribbean map — glowing island dots + a drawn connector path. */
function CaribbeanMap({ activeIndex, showAllConnections, reduced }) {
  const points = ISLAND_STOPS.map((s) => ISLAND_POS[s.country]);
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    return d;
  }, [points]);

  return (
    <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <radialGradient id="mcareIntroOcean" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#0B1B24" />
          <stop offset="100%" stopColor="#04080D" />
        </radialGradient>
      </defs>
      <rect x="-40" y="-40" width="480" height="380" fill="url(#mcareIntroOcean)" />

      {/* Drawn connector path — reveals progressively during the journey
          phase, fully visible (and gently shimmering) once every island has
          been visited. */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity={0.55}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: showAllConnections || activeIndex >= 0 ? Math.min(1, (activeIndex + 1) / points.length) : 0 }}
        transition={{ duration: reduced ? 0.2 : 1.1, ease: 'easeInOut' }}
      />

      {points.map((p, i) => {
        const visited = i <= activeIndex || showAllConnections;
        return (
          <g key={ISLAND_STOPS[i].country}>
            {visited && !reduced && (
              <motion.circle
                cx={p.x} cy={p.y} r={4}
                fill="none" stroke={GOLD} strokeWidth={1}
                initial={{ r: 4, opacity: 0.6 }}
                animate={{ r: [4, 14, 4], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <circle cx={p.x} cy={p.y} r={visited ? 4.5 : 2.6} fill={visited ? GOLD_BRIGHT : 'rgba(212,175,55,0.35)'} />
          </g>
        );
      })}
    </svg>
  );
}

export default function McareIntro({ onDone = null }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(PHASE_HOOK);
  const [islandIndex, setIslandIndex] = useState(-1);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    clearTimers();
    const at = (ms, fn) => { timersRef.current.push(setTimeout(fn, ms)); };

    at(HOOK_MS, () => setPhase(PHASE_JOURNEY));
    ISLAND_STOPS.forEach((_, i) => {
      at(HOOK_MS + i * ISLAND_SLOT_MS, () => setIslandIndex(i));
    });
    at(JOURNEY_END_MS, () => setPhase(PHASE_NETWORK));
    at(NETWORK_END_MS, () => setPhase(PHASE_REVEAL));

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToEnd = () => {
    clearTimers();
    setIslandIndex(ISLAND_STOPS.length - 1);
    setPhase(PHASE_REVEAL);
  };

  const replay = () => {
    clearTimers();
    setIslandIndex(-1);
    setPhase(PHASE_HOOK);
    // Re-arm the timers by remounting the effect's schedule.
    const at = (ms, fn) => { timersRef.current.push(setTimeout(fn, ms)); };
    at(HOOK_MS, () => setPhase(PHASE_JOURNEY));
    ISLAND_STOPS.forEach((_, i) => at(HOOK_MS + i * ISLAND_SLOT_MS, () => setIslandIndex(i)));
    at(JOURNEY_END_MS, () => setPhase(PHASE_NETWORK));
    at(NETWORK_END_MS, () => setPhase(PHASE_REVEAL));
  };

  const activeStop = islandIndex >= 0 ? ISLAND_STOPS[islandIndex] : null;
  const activePos = activeStop ? ISLAND_POS[activeStop.country] : ISLAND_POS['Jamaica'];

  return (
    <div
      role="region"
      aria-label="M-Care intro"
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: NAVY, color: '#fff', overflow: 'hidden',
        fontFamily: '"SF Pro Display", system-ui, -apple-system, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Skip — the required accessible bypass, and a fast way to preview
          the ending. Real button, keyboard-focusable, visible focus ring. */}
      <button
        type="button"
        onClick={() => { skipToEnd(); onDone?.(); }}
        style={{
          position: 'absolute', top: 18, right: 18, zIndex: 5,
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 999,
          color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
          padding: '8px 16px', cursor: 'pointer',
        }}
      >
        {SKIP_LABEL}
      </button>

      {phase === PHASE_REVEAL && (
        <button
          type="button"
          onClick={replay}
          style={{
            position: 'absolute', top: 18, left: 18, zIndex: 5,
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 999,
            color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
            padding: '8px 16px', cursor: 'pointer',
          }}
        >
          {REPLAY_LABEL}
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ── Phase 1: hook (0-3s) ── */}
        {phase === PHASE_HOOK && (
          <motion.div
            key="hook"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: 24, textAlign: 'center' }}
          >
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <LivingOrb state="idle" size={112} />
            </motion.div>
            <motion.p
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.7, delay: reduced ? 0 : 0.5 }}
              style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 700, letterSpacing: '-0.01em', color: GOLD_BRIGHT, maxWidth: 720, lineHeight: 1.25 }}
            >
              {HOOK_LINE}
            </motion.p>
          </motion.div>
        )}

        {/* ── Phase 2: journey across the islands (3-15s) ── */}
        {phase === PHASE_JOURNEY && (
          <motion.div
            key="journey"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.5 }}
            style={{ position: 'relative', width: 'min(92vw, 900px)', height: 'min(78vh, 560px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <CaribbeanMap activeIndex={islandIndex} showAllConnections={false} reduced={reduced} />
            </div>

            {/* The traveling M-Safe marker — a small living orb positioned
                over the map at the current island's coordinates, animating
                smoothly between stops via framer-motion's own layout tween
                rather than manual path-point math. */}
            <motion.div
              animate={{ left: `${(activePos.x / 400) * 100}%`, top: `${(activePos.y / 300) * 100}%` }}
              transition={{ duration: reduced ? 0.15 : 1.1, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'absolute', transform: 'translate(-50%, -120%)', zIndex: 2, filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.55))' }}
            >
              <LivingOrb state="acting" size={42} />
            </motion.div>

            {/* Floating flag + country label, briefly, per stop. */}
            <AnimatePresence mode="wait">
              {activeStop && (
                <motion.div
                  key={activeStop.country}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: reduced ? 0.12 : 0.35 }}
                  style={{
                    position: 'absolute', left: `${(activePos.x / 400) * 100}%`, top: `${(activePos.y / 300) * 100}%`,
                    transform: 'translate(-50%, -220%)', zIndex: 3, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(6,11,22,0.82)',
                    border: `1px solid ${BORDER}`, borderRadius: 999, padding: '5px 12px 5px 8px',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{activeStop.flag}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{activeStop.country}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The premium phone mockup for the current stop, offset to one
                side so it never overlaps the map/marker/label. */}
            <div style={{ position: 'absolute', right: '2%', bottom: '4%', zIndex: 4 }}>
              <AnimatePresence mode="wait">
                {activeStop && <PhoneMockup key={activeStop.country} stop={activeStop} reduced={reduced} />}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Phase 3: pull back to reveal the connected network (15-21s) ── */}
        {phase === PHASE_NETWORK && (
          <motion.div
            key="network"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: 24 }}
          >
            <motion.div
              initial={reduced ? { scale: 1 } : { scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduced ? 0.15 : 1.4, ease: 'easeOut' }}
              style={{ position: 'relative', width: 'min(88vw, 820px)', height: 'min(56vh, 380px)' }}
            >
              <CaribbeanMap activeIndex={ISLAND_STOPS.length - 1} showAllConnections reduced={reduced} />
              <div style={{ position: 'absolute', left: '50%', top: -10, transform: 'translate(-50%, -100%)', filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.6))' }}>
                <LivingOrb state="acting" size={64} />
              </div>
            </motion.div>

            <div style={{ display: 'flex', gap: 'clamp(14px, 3vw, 34px)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {MOTION_LINES.map((word, i) => (
                <motion.span
                  key={word}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0.15 : 0.5, delay: reduced ? 0 : 0.3 + i * 0.35 }}
                  style={{ fontSize: 'clamp(18px, 3.4vw, 28px)', fontWeight: 800, color: GOLD_BRIGHT, letterSpacing: '-0.01em' }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Phase 4: final reveal (21-25s, holds) ── */}
        {phase === PHASE_REVEAL && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0.2 : 0.8 }}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: 24, textAlign: 'center' }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: '-30% -20%', zIndex: -1, borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${GOLD}22, transparent 70%)`,
              }}
            />
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0.15 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <LivingOrb state="speaking" size={104} />
            </motion.div>

            {FINAL_LINES.map((line, i) => (
              <motion.p
                key={line}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0.15 : 0.5, delay: reduced ? 0 : 0.25 + i * 0.25 }}
                style={{ margin: 0, fontSize: 'clamp(18px, 3.4vw, 28px)', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}
              >
                {line}
              </motion.p>
            ))}

            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.5, delay: reduced ? 0 : 0.9 }}
              style={{ marginTop: 10 }}
            >
              <p style={{ margin: 0, fontSize: 'clamp(24px, 4.4vw, 38px)', fontWeight: 800, letterSpacing: '0.06em', color: GOLD_BRIGHT }}>
                {BRAND_LINE}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                {BRAND_SUBLINE}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
