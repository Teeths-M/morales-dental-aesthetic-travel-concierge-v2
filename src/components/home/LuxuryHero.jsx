import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import HowItWorksModal from './HowItWorksModal';
import LiveJourneyCard from './LiveJourneyCard';
import { usePlatformMode } from '@/context/PlatformModeContext';
import { Shield, CheckCircle, Heart } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const GOLD       = BRAND.gold;
const HERO_IMAGE = 'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/102642e19_generated_image.png';
// TEMP: local watermarked preview only (Storyblocks SBV-348455312) — swap for
// the licensed, unwatermarked CDN asset before this ever ships to production.
const HERO_VIDEO = '/hero-preview-TEST.mp4';

/* ── Content by mode ──────────────────────────────────────────────────────── */
const CONTENT = {
  medical: {
    headline:    'NEVER\nALONE',
    subheadline: 'Travel abroad for world-class medical care — and come home safely.',
    body:        'Your driver picks you up at home. Your verified doctor is waiting. Your family tracks every checkpoint in real time. If something goes wrong, Morales activates your emergency response plan and coordinates the next steps.',
    cta:         { label: 'Start Your Journey', path: '/intake' },
  },
  nonmedical: {
    headline:    'THE WORLD,\nEFFORTLESSLY YOURS.',
    subheadline: '24/7 protection — even at 35,000 feet.',
    // Was "Verified transfers, vetted hotels". Neither is checked today —
    // hotels have no verification path at all, and drivers have no cleared
    // background check. Replaced with what the platform genuinely does: every
    // handoff between transfers, hotel and clinic is confirmed and logged, so
    // nobody is unaccounted for. That is the real differentiator anyway, and
    // unlike "vetted" it is true.
    body:        'Wherever you land, Morales is already there. Every transfer, hotel and clinic handover confirmed and logged, personal companions, and a safety net that follows you across every border and time zone.',
    cta:         { label: 'Plan My Journey', path: '/travel-intake' },
  },
};

/* ── Feature cards below hero ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: Heart,       title: 'Your Family Stays Close',    desc: 'Share a zero-login link and they watch every checkpoint in real time — like a flight tracker, but for your surgery.' },
  { icon: Shield,      title: 'Every Checkpoint Confirmed', desc: 'Miss a check-in and we escalate automatically — SMS, voice call, security dispatch, police. You are never alone.' },
  { icon: CheckCircle, title: 'Verified Specialists Only',  desc: 'Every doctor is screened for credentials, procedure history, and patient outcomes. Only the top 1% earn the Morales badge.' },
];


/* ── Post-surgery protocol — answers the judge's question directly ─────────── */
const AFTER_SURGERY_STEPS = [
  {
    num: '01',
    title: 'Recovery monitoring starts the moment surgery ends.',
    desc: 'Your recovery clock starts immediately. Miss a check-in by 45 minutes and Morales escalates automatically — not 24 hours later. 45 minutes.',
  },
  {
    num: '02',
    title: 'Your family never loses sight of you.',
    desc: "A zero-login link. A live map. Every checkpoint confirmed in real time. They sleep peacefully. We don't.",
  },
  {
    num: '03',
    title: 'Six channels before we give up.',
    desc: 'SMS. Voice call. Companion check. Security dispatch. Local clinic. Emergency services. In sequence — until someone confirms you are safe.',
  },
];

/* ── Hero chat exchange ────────────────────────────────────────────────────
 * The moment the hero video is built around: her procedure is confirmed
 * safe, M checks if she's traveling solo, she is, and she's protected.
 * Shown as an animated phone-notification exchange over the video rather
 * than baked into the footage itself — easier to change, and matches the
 * site's own i18n system if this ever needs translating.
 */
const CHAT_STEPS = [
  { from: 'm',    text: 'Your procedure is confirmed safe!' },
  { from: 'user', text: 'Great ❤️' },
  { from: 'm',    text: 'Traveling solo?' },
  { from: 'user', text: 'Yes 😊' },
  { from: 'm',    text: 'You are protected.' },
  { from: 'user', text: 'Awesome 🙏' },
];

function HeroChatBubbles() {
  const [step, setStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Reduced motion: show the full exchange at once, settled — no cycling.
    if (prefersReducedMotion) { setStep(CHAT_STEPS.length); return; }
    const t = setInterval(() => setStep(s => (s + 1) % (CHAT_STEPS.length + 1)), 1600);
    return () => clearInterval(t);
  }, [prefersReducedMotion]);

  const visible = CHAT_STEPS.slice(0, step);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 284 }}>
      <AnimatePresence>
        {visible.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              alignSelf:      msg.from === 'user' ? 'flex-end' : 'flex-start',
              background:     msg.from === 'user' ? 'rgba(255,255,255,0.12)' : 'rgba(212,175,55,0.16)',
              border:         `1px solid ${msg.from === 'user' ? 'rgba(255,255,255,0.18)' : 'rgba(212,175,55,0.4)'}`,
              backdropFilter: 'blur(12px)',
              borderRadius:   14,
              padding:        '9px 16px',
              fontSize:       'clamp(0.95rem, 1.6vw, 1.05rem)',
              fontWeight:     600,
              color:          msg.from === 'user' ? '#fff' : GOLD,
            }}
          >
            {msg.from === 'm' && <span style={{ opacity: 0.55, fontWeight: 800, marginRight: 7 }}>M</span>}
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

export default function LuxuryHero() {
  const [showModal, setShowModal] = useState(false);
  const { mode }    = usePlatformMode();

  const isMedical   = mode === 'medical';
  const content     = isMedical ? CONTENT.medical : CONTENT.nonmedical;
  const prefersReducedMotion = useReducedMotion();
  const _openModal   = useCallback(() => setShowModal(true), []);
  const closeModal  = useCallback(() => setShowModal(false), []);

  return (
    <>
      {/* ── HERO SECTION ── */}
      <section
        data-hero
        className="relative overflow-hidden"
        style={{ background: '#0b1219', marginTop: '-72px', minHeight: '100svh' }}
      >
        {/* Full-bleed background — skeleton placeholder prevents layout shift.
            Reduced motion: show the static poster frame, no autoplaying video. */}
        <div className="absolute inset-0 img-skeleton">
          {prefersReducedMotion ? (
            <img
              src={HERO_IMAGE}
              alt="A traveler checking her phone before her journey"
              className="w-full h-full object-cover"
              style={{ objectPosition: '65% center' }}
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <video
              key={HERO_VIDEO}
              src={HERO_VIDEO}
              poster={HERO_IMAGE}
              className="w-full h-full object-cover"
              style={{ objectPosition: '65% center' }}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          )}
          {/* Gradient overlays.
              The left-to-right one was tuned for the desktop 2-column split
              (dark backing for the text column, clear video behind the card
              on the right) — on mobile, content stacks full-width over that
              same gradient, so its solid-black 0-32% band was blacking out
              most of the video instead of just backing the text. Desktop
              keeps the original; mobile gets a much lighter flat wash so the
              footage — the actual point of this hero — stays visible. */}
          <div className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(to right, #0b1219 0%, #0b1219 32%, rgba(11,18,25,0.88) 50%, rgba(11,18,25,0.45) 72%, transparent 100%)' }} />
          <div className="absolute inset-0 lg:hidden" style={{ background: 'rgba(11,18,25,0.38)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0b1219 0%, rgba(11,18,25,0.55) 12%, transparent 32%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0b1219 0%, rgba(11,18,25,0.8) 12%, transparent 32%)' }} />
          {/* Gold shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 65% 50%, ${BRAND.goldAlpha(0.04)} 0%, transparent 65%)` }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.25, 0.55, 0.25] }}
            transition={prefersReducedMotion ? {} : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ── CONTENT GRID ── */}
        <div
          className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center"
          style={{ minHeight: '100svh', paddingTop: '72px' }}
        >
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col z-10 lg:pr-20 py-20 lg:py-0"
          >
            {/* ── HERO CHAT EXCHANGE — replaces the badge + story ticker ── */}
            <div style={{ marginBottom: 20 }}>
              <HeroChatBubbles />
            </div>

            {/* ── COMMANDING HEADLINE ── */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`headline-${mode}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-white mb-6"
                style={{
                  fontSize:      'clamp(2.2rem, 9vw, 6.2rem)',
                  fontWeight:    900,
                  lineHeight:    1.0,
                  letterSpacing: '-0.03em',
                  fontFamily:    '"SF Pro Display", system-ui, -apple-system, sans-serif',
                  textTransform: 'uppercase',
                  whiteSpace:    'pre-line',
                  textShadow:    '0 2px 40px rgba(0,0,0,0.5)',
                }}
              >
                {content.headline}
              </motion.h1>
            </AnimatePresence>

            {/* ── CTA — single primary action, nothing competing with it ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col gap-3 mb-8"
            >
              <Link to={content.cta.path}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full sm:w-auto min-h-[56px] px-10 rounded-full text-base font-semibold overflow-hidden transition-shadow duration-300"
                  style={{
                    background:    `linear-gradient(135deg, ${GOLD} 0%, ${BRAND.goldLight} 100%)`,
                    color:         '#060B16',
                    boxShadow:     `0 8px 36px ${BRAND.goldAlpha(0.35)}, 0 0 0 1px ${BRAND.goldAlpha(0.2)} inset`,
                    letterSpacing: '0.02em',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2.5">
                    {content.cta.label}
                    <span>→</span>
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${BRAND.goldLight} 0%, ${GOLD} 100%)` }}
                  />
                </motion.button>
              </Link>

              {/* No-account signal — directly below the button */}
              {isMedical && (
                <span style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', color: 'rgba(255,255,255,0.28)', fontWeight: 500, letterSpacing: '0.04em' }}>
                  No account needed to start
                </span>
              )}
            </motion.div>

          </motion.div>

          {/* Right column — live patient journey card */}
          <LiveJourneyCard />
        </div>
      </section>

      {/* ── FEATURE GRID — below hero ── */}
      <section
        className="w-full"
        style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 py-10 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-10">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-3 p-6 rounded-2xl border transition-all duration-300 hover:border-[#D4AF37]/25 group cursor-default"
                style={{
                  background:   'rgba(12,26,29,0.6)',
                  border:       '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${BRAND.goldAlpha(0.1)}`,
                    border:     `1px solid ${BRAND.goldAlpha(0.2)}`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-all duration-300 group-hover:scale-110"
                    style={{ color: GOLD, filter: `drop-shadow(0 0 6px ${BRAND.goldAlpha(0.5)})` }}
                    strokeWidth={1.5}
                  />
                </div>
                <p
                  style={{
                    fontSize: 'clamp(1rem, 1.8vw, 1.1rem)', fontWeight: 600, color: '#FFFFFF',
                    letterSpacing: '-0.01em', lineHeight: 1.2,
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1rem)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AFTER SURGERY — the question every judge and investor asks ── */}
      <section style={{ background: '#060B16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 py-14 sm:py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

            {/* Left — question + answer */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 24, height: 1, background: `${GOLD}50` }} />
                <span style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${GOLD}65` }}>
                  After Surgery
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 20 }}>
                "What happens<br />after surgery?"
              </h2>
              <p style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)', fontStyle: 'italic', color: `${GOLD}90`, lineHeight: 1.6, fontFamily: 'Georgia, serif', marginBottom: 20 }}>
                That's where Morales<br />becomes most valuable.
              </p>
              <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.05rem)', color: 'rgba(255,255,255,0.35)', lineHeight: 1.75, maxWidth: 380 }}>
                Most platforms track your booking.<br />
                Morales tracks you — until you are home safe.
              </p>
            </motion.div>

            {/* Right — protocol steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 4 }}>
              {AFTER_SURGERY_STEPS.map(({ num, title, desc }, i) => (
                <motion.div
                  key={num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}
                >
                  <span style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', fontWeight: 800, color: `${GOLD}45`, letterSpacing: '0.1em', flexShrink: 0, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{num}</span>
                  <div>
                    <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.1rem)', fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{title}</p>
                    <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1rem)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75 }}>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HowItWorksModal isOpen={showModal} onClose={closeModal} />
    </>
  );
}