import React from 'react';
import { Search, Shield, LayoutGrid, Check } from 'lucide-react';
import RobotAvatarImage from '@/components/mcare/RobotAvatarImage';
import { C } from './theme';

const CAPABILITIES = [
  { label: 'Analyze', Icon: Search },
  { label: 'Protect', Icon: Shield },
  { label: 'Coordinate', Icon: LayoutGrid },
  { label: 'Resolve', Icon: Check },
];

/** The agent's own column: identity, the four capabilities, and the running demos. */
export default function DemoSidebar({ scenarios, activeIndex, onSelect }) {
  return (
    <aside className="msd-sidebar" style={{ background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
      <p style={{ margin: 0, fontFamily: C.serif, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
        M-Safe<span style={{ color: C.gold }}>+</span>
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>
        Morales Super Agent
      </p>
      <p style={{ margin: '1px 0 0', fontSize: 11, color: C.soft, lineHeight: 1.5 }}>
        Medical + Travel Concierge
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 12px' }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `1px solid ${C.border}`,
            background: 'radial-gradient(circle at 50% 35%, #FFFFFF 0%, #EFEADF 70%, #E3DCCB 100%)',
          }}
        >
          <RobotAvatarImage size={88} animated={false} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 9999,
          padding: '6px 11px',
          marginBottom: 12,
        }}
      >
        <span className="msd-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#3CB371', display: 'inline-block' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: C.ink }}>Monitoring</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {CAPABILITIES.map(({ label, Icon }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '8px 7px',
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: C.gold }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: C.ink }}>{label}</span>
          </div>
        ))}
      </div>

      <p style={{ margin: '16px 0 6px', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', color: C.faint }}>
        RUNNING DEMO
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {scenarios.map((scenario, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                textAlign: 'left',
                background: active ? 'rgba(197,160,89,0.10)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                padding: '5px 6px',
                cursor: 'pointer',
                color: active ? C.ink : C.soft,
                fontSize: 10.5,
                fontWeight: active ? 700 : 500,
                fontFamily: C.sans,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: active ? C.gold : '#CFC8B8',
                  flexShrink: 0,
                }}
              />
              {scenario.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="msd-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3CB371', display: 'inline-block' }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.faint }}>LIVE SESSION</span>
      </div>
    </aside>
  );
}