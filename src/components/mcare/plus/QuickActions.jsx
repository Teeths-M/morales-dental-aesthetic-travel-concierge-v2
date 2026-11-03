import React from 'react';
import { MapPin, Shield, Headset } from 'lucide-react';
import { P } from './plusTheme';

const ACTIONS = [
  { key: 'map', label: 'View Map', Icon: MapPin },
  { key: 'check', label: 'Safety Check', Icon: Shield },
  { key: 'live', label: 'Talk live', Icon: Headset },
];

export default function QuickActions({ onAction }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onAction(key)}
          className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-3"
          style={{
            border: `1px solid ${P.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: P.text,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.01em',
            cursor: 'pointer',
          }}
        >
          <Icon size={13} strokeWidth={1.8} color={P.gold} aria-hidden="true" />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}