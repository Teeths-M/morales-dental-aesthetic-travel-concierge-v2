import React from 'react';
import { C } from './companionTheme';

const RING_PX = {
  idle: 1,
  listening: 1.05,
  thinking: 1,
  speaking: 1.03,
};

/**
 * The golden ring: the one visual centre of this screen.
 *
 * It is drawn with layered gradients rather than an image so it stays crisp at
 * any size and can answer real state. `state` is the *interaction* state only
 * (idle / listening / thinking / speaking) — it is never used to say anything
 * about monitoring, connectivity or safety, which have their own indicators.
 */
export default function GoldenRing({
  state = 'idle',
  size = 236,
  reduced = false,
  amplitude = null,
}) {
  const breathing = !reduced && state !== 'thinking';
  const pulseSpeed = state === 'listening' ? '2s' : state === 'speaking' ? '1.6s' : '6.5s';
  const bloomOpacity = state === 'listening' ? 0.42 : state === 'speaking' ? 0.38 : state === 'thinking' ? 0.3 : 0.26;
  const scale = state === 'speaking' && amplitude != null ? 1 + Math.min(0.05, amplitude * 0.05) : RING_PX[state] || 1;

  const torusMask =
    'radial-gradient(circle, transparent 0 63%, #000 64.5% 71.5%, transparent 73%)';

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`M-Care ring, ${state}`}
    >
      {/* Outer bloom */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -size * 0.42,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, rgba(248,213,140,${bloomOpacity}) 0%, rgba(212,168,96,${bloomOpacity * 0.5}) 38%, rgba(212,168,96,0.05) 66%, transparent 76%)`,
          filter: 'blur(16px)',
          animation: breathing ? `mc-ring-breathe ${pulseSpeed} ease-in-out infinite` : 'none',
        }}
      />

      {/* Elongated light wisps */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -size * 0.55,
          borderRadius: '50%',
          background:
            'conic-gradient(from 200deg, transparent 0deg, rgba(248,213,140,0.16) 30deg, transparent 90deg, transparent 200deg, rgba(212,168,96,0.14) 250deg, transparent 320deg)',
          filter: 'blur(20px)',
          opacity: 0.85,
          animation: reduced ? 'none' : 'mc-ring-spin 40s linear infinite',
        }}
      />

      {/* The torus itself */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${scale})`,
          transition: reduced ? 'none' : 'transform 320ms ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'conic-gradient(from 208deg, #FFF0CE 0deg, #F8D58C 26deg, #C79A4E 62deg, #7A5C22 96deg, #D4A860 132deg, #FFF3D6 168deg, #C99C50 208deg, #6E5119 248deg, #E8C078 286deg, #F8D58C 322deg, #FFF0CE 360deg)',
            WebkitMaskImage: torusMask,
            maskImage: torusMask,
            filter: 'saturate(1.05)',
          }}
        />
        {/* Inner machined edge */}
        <div
          style={{
            position: 'absolute',
            inset: size * 0.035,
            borderRadius: '50%',
            background:
              'conic-gradient(from 20deg, rgba(255,235,190,0.55), rgba(140,105,45,0.35), rgba(255,240,205,0.5), rgba(110,81,25,0.3), rgba(255,235,190,0.55))',
            WebkitMaskImage:
              'radial-gradient(circle, transparent 0 65.5%, #000 66.5% 68.5%, transparent 69.5%)',
            maskImage:
              'radial-gradient(circle, transparent 0 65.5%, #000 66.5% 68.5%, transparent 69.5%)',
            opacity: 0.75,
            filter: 'blur(0.4px)',
          }}
        />
        {/* Hot highlight, the bright catch of light on one side */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'conic-gradient(from 190deg, transparent 0deg, rgba(255,247,225,0.95) 22deg, transparent 58deg, transparent 300deg, rgba(255,240,205,0.7) 330deg, transparent 360deg)',
            WebkitMaskImage: torusMask,
            maskImage: torusMask,
            filter: 'blur(0.6px)',
            opacity: 0.9,
          }}
        />
        {/* Sparks riding the ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(2px 2px at 26% 18%, #FFEFC9 0%, transparent 100%),' +
              'radial-gradient(1.6px 1.6px at 76% 30%, #FFE6B4 0%, transparent 100%),' +
              'radial-gradient(1.4px 1.4px at 62% 88%, #FFEFC9 0%, transparent 100%),' +
              'radial-gradient(1.2px 1.2px at 16% 62%, #F8D58C 0%, transparent 100%)',
            opacity: 0.9,
            animation: reduced ? 'none' : 'mc-ring-twinkle 5.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Inner haze, so the ring reads as translucent */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'radial-gradient(closest-side, rgba(212,168,96,0.13) 0%, rgba(212,168,96,0.05) 52%, transparent 72%)',
          filter: 'blur(8px)',
          opacity: state === 'idle' ? 0.85 : 1,
          transition: reduced ? 'none' : 'opacity 400ms ease',
        }}
      />

      {/* Thinking: a single orbiting arc, so the state is visible without text */}
      {state === 'thinking' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,247,225,0.0) 200deg, rgba(255,247,225,0.9) 340deg, transparent 360deg)',
            WebkitMaskImage: torusMask,
            maskImage: torusMask,
            animation: reduced ? 'none' : 'mc-ring-spin 1.4s linear infinite',
          }}
        />
      )}

      <style>{`
        @keyframes mc-ring-breathe {
          0%, 100% { opacity: 0.75; transform: scale(0.97); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes mc-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mc-ring-twinkle {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="mc-ring-"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}