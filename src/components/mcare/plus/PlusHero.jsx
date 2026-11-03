import React from 'react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import { P } from './plusTheme';

/**
 * PlusHero — the robot avatar beside the M-Safe+ identity block.
 * The avatar is the same real, animated robot used elsewhere in the app.
 */
export default function PlusHero({ avatarSize = 98 }) {
  return (
    <section className="flex items-center gap-4">
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-full"
        style={{
          width: avatarSize,
          height: avatarSize,
          border: `1px solid ${P.border}`,
          background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.06), rgba(10,20,32,0.9) 72%)',
          boxShadow: '0 0 26px rgba(197,160,89,0.16)',
        }}
      >
        <RobotAvatarImage size={Math.round(avatarSize * 0.76)} activityState="idle" />
      </div>

      <div className="min-w-0">
        <h1 style={{ margin: 0, fontFamily: P.fontDisplay, fontSize: 23, fontWeight: 700, letterSpacing: '-0.01em', color: P.text }}>
          M-Safe+
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>
          Your AI Travel Companion
        </p>

        <div
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-[3px]"
          style={{ background: P.mintBg }}
        >
          <span className="msafe-plus-live-dot h-1.5 w-1.5 rounded-full" style={{ background: P.mint }} />
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: P.mintText }}>
            LIVE SESSION
          </span>
        </div>

        <p style={{ margin: '6px 0 0', fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>
          Safe travels, always.
        </p>
      </div>

      <style>{`
        .msafe-plus-live-dot { animation: msafe-plus-pulse 2.2s ease-in-out infinite; }
        @keyframes msafe-plus-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(127,209,166,0.55); }
          50% { opacity: 0.65; box-shadow: 0 0 0 4px rgba(127,209,166,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .msafe-plus-live-dot { animation: none; }
        }
      `}</style>
    </section>
  );
}