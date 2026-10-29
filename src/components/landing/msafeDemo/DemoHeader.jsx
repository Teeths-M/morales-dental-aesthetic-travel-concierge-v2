import React from 'react';
import { Phone, Volume2, Moon, Maximize2, X } from 'lucide-react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import { C } from './theme';

/** The session bar: whose session this is, and that it is running right now. */
export default function DemoHeader() {
  return (
    <div
      className="msd-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${C.border}`,
        background: C.card,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <RobotAvatarImage size={26} animated={false} />
      </div>
      <p
        className="msd-title"
        style={{
          margin: 0,
          fontSize: 12.5,
          fontWeight: 700,
          color: C.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        M-Safe
        <span style={{ color: C.faint, fontWeight: 400 }}> · </span>
        <span style={{ color: C.soft, fontWeight: 500 }}>Morales Super Agent</span>
      </p>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: C.greenBg,
            border: `1px solid ${C.greenBorder}`,
            color: C.greenInk,
            borderRadius: 9999,
            padding: '3px 9px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="msd-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: '#1F7A4D' }} />
          LIVE SESSION
        </span>
        <span className="msd-icons" style={{ display: 'flex', alignItems: 'center', gap: 9, color: C.faint }}>
          <Phone className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <Moon className="w-3.5 h-3.5" />
          <Maximize2 className="w-3.5 h-3.5" />
          <X className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}