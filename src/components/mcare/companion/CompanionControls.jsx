import React from 'react';
import { Mic, History as HistoryIcon, Keyboard } from 'lucide-react';
import { C } from './companionTheme';

/**
 * The three controls from the reference screen: the glowing microphone in the
 * centre, with History to its left and Type to its right.
 *
 * Every one of them does the real thing — voice opens the live companion,
 * History opens the existing conversation history, Type opens the live
 * companion's text composer.
 */
function SideControl({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        padding: '8px 10px',
        border: 'none',
        background: 'transparent',
        color: C.textMuted,
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <Icon style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.72)' }} strokeWidth={1.7} />
      </span>
      <span style={{ fontSize: 11, letterSpacing: '0.01em' }}>{label}</span>
    </button>
  );
}

export default function CompanionControls({ onSpeak, onHistory, onType, reduced = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        margin: '0 auto',
      }}
    >
      <div style={{ justifySelf: 'start' }}>
        <SideControl icon={HistoryIcon} label="History" onClick={onHistory} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onSpeak}
          aria-label="Speak naturally to M-Care"
          style={{
            position: 'relative',
            width: 76,
            height: 76,
            borderRadius: '50%',
            border: `1px solid ${C.goldFaint}`,
            background:
              'radial-gradient(circle at 50% 35%, rgba(248,213,140,0.16) 0%, rgba(20,18,14,0.9) 62%, rgba(9,10,13,0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(212,168,96,0.10), 0 10px 34px rgba(212,168,96,0.28), inset 0 1px 0 rgba(255,240,205,0.16)',
            animation: reduced ? 'none' : 'mc-mic-pulse 3.6s ease-in-out infinite',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: '1px solid rgba(212,168,96,0.18)',
            }}
          />
          <Mic style={{ width: 26, height: 26, color: C.goldLight }} strokeWidth={1.9} />
        </button>

        <span style={{ fontSize: 11.5, color: C.textSoft, letterSpacing: '0.005em', whiteSpace: 'nowrap' }}>
          Speak naturally to M-Care
        </span>
      </div>

      <div style={{ justifySelf: 'end' }}>
        <SideControl icon={Keyboard} label="Type" onClick={onType} />
      </div>

      <style>{`
        @keyframes mc-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(212,168,96,0.10), 0 10px 28px rgba(212,168,96,0.22), inset 0 1px 0 rgba(255,240,205,0.14); }
          50%      { box-shadow: 0 0 0 1px rgba(212,168,96,0.18), 0 10px 40px rgba(212,168,96,0.42), inset 0 1px 0 rgba(255,240,205,0.22); }
        }
      `}</style>
    </div>
  );
}