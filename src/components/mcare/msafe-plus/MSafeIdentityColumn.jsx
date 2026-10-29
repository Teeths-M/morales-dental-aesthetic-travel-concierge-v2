import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import HologramPlatform from './HologramPlatform';
import CapabilityPill from './CapabilityPill';
import { MSAFE_BRAND, CAPABILITIES } from '../msafePlusConfig';

/**
 * MSafeIdentityColumn — the left sidebar: the M-Safe+ wordmark, the agent's
 * physical presence over its hologram platform, a monitoring status that
 * opens the real Safe-T surface, the four capabilities in a 2x2 block, and a
 * live-session footer.
 *
 * Motion is deliberately slight (an ambient float, a slow hologram glow) and
 * stops entirely under prefers-reduced-motion.
 */
export default function MSafeIdentityColumn({ onSelectIntent }) {
  const navigate = useNavigate();
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="relative flex flex-col h-full px-5 py-6 md:py-7">
      {/* Wordmark */}
      <div className="flex-shrink-0">
        <h1
          className="leading-none"
          style={{
            fontFamily: '"Cormorant Garamond","Playfair Display",Georgia,serif',
            color: 'var(--ms-ink)',
            fontSize: 'clamp(1.7rem, 2.2vw, 2rem)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          {MSAFE_BRAND.title}
          <span style={{ color: 'var(--ms-gold)' }}>{MSAFE_BRAND.plus}</span>
        </h1>
        <p className="mt-1 text-[11.5px] font-medium leading-tight" style={{ color: 'var(--ms-ink-soft)' }}>
          {MSAFE_BRAND.name}
        </p>
        <p className="text-[11.5px] leading-tight" style={{ color: 'var(--ms-ink-faint)' }}>
          {MSAFE_BRAND.subtitle}
        </p>
      </div>

      {/* The agent itself */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 py-3">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 'min(190px, 74%)', aspectRatio: '1 / 1' }}
        >
          <HologramPlatform size={190} />
          <div className={reduced ? undefined : 'msafe-float'} style={{ position: 'relative', zIndex: 2 }}>
            <RobotAvatarImage size={150} naturalAspect animated={!reduced} activityState="idle" />
          </div>
        </div>
      </div>

      {/* Monitoring status — opens the real safety surface */}
      <button
        type="button"
        onClick={() => navigate('/safe-t')}
        className="msafe-monitor flex-shrink-0 mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
        style={{ background: 'var(--ms-green-bg)', border: '1px solid rgba(60,179,113,0.35)' }}
        title="Open Safe-T4Life safety monitoring"
      >
        <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.8} style={{ color: 'var(--ms-green-ink)' }} />
        <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ms-green-ink)' }}>
          Monitoring
        </span>
      </button>

      {/* Capabilities — 2x2 */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-2">
        {CAPABILITIES.map((cap) => (
          <CapabilityPill
            key={cap.id}
            label={cap.label}
            icon={cap.icon}
            full
            onClick={() => onSelectIntent?.(cap.intent)}
          />
        ))}
      </div>

      {/* Live session */}
      <div className="flex-shrink-0 mt-5 flex items-center justify-center gap-2">
        <span className="msafe-live-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ms-green)' }} />
        <span
          className="text-[9.5px] font-bold uppercase"
          style={{ color: 'var(--ms-ink-faint)', letterSpacing: '0.16em' }}
        >
          Live Session
        </span>
      </div>

      <style>{`
        .msafe-float { animation: msafe-ambient-float 7s ease-in-out infinite; }
        @keyframes msafe-ambient-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .msafe-live-dot { animation: msafe-dot-pulse 2.4s ease-in-out infinite; }
        @keyframes msafe-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(60,179,113,0.45); }
          50% { opacity: 0.55; box-shadow: 0 0 0 4px rgba(60,179,113,0); }
        }
        .msafe-monitor:hover { box-shadow: 0 0 0 3px rgba(60,179,113,0.14); }
        @media (prefers-reduced-motion: reduce) {
          .msafe-float, .msafe-live-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}