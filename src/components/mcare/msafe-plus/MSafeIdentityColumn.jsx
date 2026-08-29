import React, { useState, useEffect } from 'react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import HologramPlatform from './HologramPlatform';
import CapabilityPill from './CapabilityPill';
import LiveSessionBadge from './LiveSessionBadge';
import { MSAFE_BRAND, MSAFE_PALETTE as C, CAPABILITIES } from '../msafePlusConfig';

const DUST = [
  { top: '15%', left: '20%', d: 0, s: 2 },
  { top: '30%', left: '78%', d: 0.8, s: 1.6 },
  { top: '62%', left: '12%', d: 1.4, s: 1.8 },
  { top: '75%', left: '70%', d: 0.4, s: 2.2 },
  { top: '48%', left: '88%', d: 1.1, s: 1.4 },
];

// MSafeIdentityColumn — the left column: serif "M-Safe+" branding, the robot
// floating over a gold hologram platform, four capability pills, and a LIVE
// SESSION badge. Pills seed the chat with their intent. Motion is extremely
// subtle (ambient float + hologram glow); respects prefers-reduced-motion.
export default function MSafeIdentityColumn({ onSelectIntent, hasConversation }) {
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
    <div className="relative flex flex-col h-full p-5 md:p-8">
      {/* Subtle gold dust */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {!reduced && DUST.map((p, i) => (
          <span
            key={i}
            className="msafe-dust"
            style={{ position: 'absolute', top: p.top, left: p.left, width: p.s, height: p.s, borderRadius: '50%', background: C.goldPlus, boxShadow: `0 0 4px ${C.goldPlus}aa`, animationDelay: `${p.d}s` }}
          />
        ))}
      </div>

      {/* Branding */}
      <div className="relative z-10">
        <div className="flex items-start gap-1">
          <h1
            className="font-serif font-semibold leading-none"
            style={{ color: C.charcoal, fontSize: 'clamp(1.7rem, 3vw, 2.6rem)', letterSpacing: '-0.02em' }}
          >
            {MSAFE_BRAND.title}
          </h1>
          <span
            className="font-serif font-semibold"
            style={{ color: C.goldPlus, fontSize: '1rem', lineHeight: 1.1, marginTop: '0.2em' }}
          >
            {MSAFE_BRAND.plus}
          </span>
        </div>
        <p className="mt-1 text-[10px] md:text-[11px] font-medium tracking-tight" style={{ color: C.charcoalSoft }}>
          {MSAFE_BRAND.subtitle}
        </p>
      </div>

      {/* Robot on hologram platform */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 py-2">
        <div className="relative flex items-center justify-center" style={{ width: 'min(220px, 78%)', height: 'min(220px, 78%)' }}>
          <HologramPlatform size={220} />
          <div className={reduced ? undefined : 'msafe-float'} style={{ position: 'relative', zIndex: 2 }}>
            <RobotAvatarImage size={180} naturalAspect animated={!reduced} activityState="idle" />
          </div>
        </div>
      </div>

      {/* Pills + live badge */}
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
          {CAPABILITIES.map((cap) => (
            <div key={cap.id} onClick={(e) => e.stopPropagation()}>
              <CapabilityPill label={cap.label} icon={cap.icon} onClick={() => onSelectIntent?.(cap.intent)} />
            </div>
          ))}
        </div>
        <LiveSessionBadge />
      </div>

      <style>{`
        .msafe-float { animation: msafe-ambient-float 6s ease-in-out infinite; }
        @keyframes msafe-ambient-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .msafe-dust { opacity: 0.25; animation: msafe-dust-fade 4s ease-in-out infinite; }
        @keyframes msafe-dust-fade {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .msafe-float { animation: none; }
          .msafe-dust { animation: none; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}