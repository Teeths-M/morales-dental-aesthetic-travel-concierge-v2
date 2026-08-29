import React, { useState, useEffect } from 'react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import HologramPlatform from './HologramPlatform';
import CapabilityPill from './CapabilityPill';
import LiveSessionBadge from './LiveSessionBadge';
import { MSAFE_BRAND, MSAFE_PALETTE as C, CAPABILITIES } from '../msafePlusConfig';

// MSafeHero — the full M-Safe+ luxury landing composition: ivory canvas,
// editorial serif branding top-left, centered robot on a gold hologram
// platform, four capability pills, and a LIVE SESSION badge. Serves as the
// calm welcome state before the M-Safe conversation begins.
//
// onSelectIntent(intent) — called when a capability pill is tapped; the
//   parent seeds the conversation with that intent as the first message.
// onBegin() — called when the visitor taps anywhere to begin / continue
//   without choosing a specific capability.
// hasConversation — when true, the "tap to begin" hint reads "Continue".
export default function MSafeHero({ onSelectIntent, onBegin, hasConversation = false }) {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between relative overflow-hidden"
      style={{ background: C.ivory }}
      onClick={onBegin}
    >
      {/* Subtle paper texture + soft radial light + floating gold dust */}
      <div className="msafe-bg-layer absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Top-left identity */}
      <div className="w-full max-w-3xl mx-auto px-6 pt-10 sm:pt-14 relative" style={{ zIndex: 2 }}>
        <div className="flex items-start gap-1.5">
          <h1
            className="font-serif font-semibold leading-none"
            style={{ color: C.charcoal, fontSize: '2.6rem', letterSpacing: '-0.02em' }}
          >
            {MSAFE_BRAND.title}
          </h1>
          <span
            className="font-serif font-semibold"
            style={{ color: C.goldPlus, fontSize: '1.1rem', lineHeight: 1.1, marginTop: '0.15em' }}
          >
            {MSAFE_BRAND.plus}
          </span>
        </div>
        <p
          className="mt-1.5 text-[12px] font-medium tracking-tight"
          style={{ color: C.charcoalSoft }}
        >
          {MSAFE_BRAND.subtitle}
        </p>
      </div>

      {/* Robot hero on hologram platform */}
      <div className="flex-1 w-full flex items-center justify-center relative" style={{ minHeight: '40vh', zIndex: 1 }}>
        <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
          <HologramPlatform size={300} />
          <div
            className={reduced ? undefined : 'msafe-robot-hover'}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <RobotAvatarImage size={240} naturalAspect animated={!reduced} activityState="idle" />
          </div>
        </div>
      </div>

      {/* Capability pills + live badge */}
      <div className="w-full max-w-3xl mx-auto px-6 pb-10 sm:pb-14 flex flex-col items-center gap-3 relative" style={{ zIndex: 2 }}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CAPABILITIES.map((cap) => (
            <div key={cap.id} onClick={(e) => e.stopPropagation()}>
              <CapabilityPill label={cap.label} icon={cap.icon} onClick={() => onSelectIntent?.(cap.intent)} />
            </div>
          ))}
        </div>
        <LiveSessionBadge />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBegin?.(); }}
          className="mt-1 text-[11px] font-medium tracking-tight transition-opacity hover:opacity-70"
          style={{ color: C.charcoalSoft }}
        >
          {hasConversation ? 'Continue your session →' : 'Tap anywhere to begin →'}
        </button>
      </div>

      <style>{`
        .msafe-bg-layer {
          background:
            radial-gradient(circle at 50% 42%, rgba(241,222,155,0.28) 0%, transparent 55%),
            radial-gradient(circle at 50% 48%, rgba(255,255,255,0.5) 0%, transparent 70%),
            repeating-linear-gradient(45deg, rgba(201,164,59,0.012) 0px, rgba(201,164,59,0.012) 1px, transparent 1px, transparent 4px);
        }
        .msafe-robot-hover { animation: msafe-hover 6s ease-in-out infinite; }
        @keyframes msafe-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .msafe-robot-hover { animation: none; }
        }
      `}</style>
    </div>
  );
}