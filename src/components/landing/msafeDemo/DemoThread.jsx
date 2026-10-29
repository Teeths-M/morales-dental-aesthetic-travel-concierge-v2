import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { C, BUBBLE, clockTime } from './theme';

function Stamp({ at }) {
  return (
    <p style={{ margin: '3px 0 0 2px', fontSize: 9.5, color: C.faint, letterSpacing: '0.02em' }}>{clockTime(at)}</p>
  );
}

function DoctorCard({ step }) {
  const green = step.tone === 'green';
  return (
    <div className="msd-item">
      <div style={BUBBLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{step.name}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 9999,
              padding: '2px 9px',
              fontSize: 10,
              fontWeight: 700,
              background: green ? C.greenBg : C.greyBg,
              color: green ? C.greenInk : C.greyInk,
              border: `1px solid ${green ? C.greenBorder : '#DCD7CC'}`,
            }}
          >
            {green && <ShieldCheck className="w-3 h-3" />}
            {step.badge}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: C.soft, lineHeight: 1.6 }}>{step.note}</p>
      </div>
      <Stamp at={step.at} />
    </div>
  );
}

function AgentText({ step }) {
  return (
    <div className="msd-item">
      <div style={BUBBLE}>
        <p style={{ margin: 0 }}>{step.text}</p>
        {step.note && (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: C.soft, lineHeight: 1.6 }}>{step.note}</p>
        )}
      </div>
      <Stamp at={step.at} />
    </div>
  );
}

function Verb({ step }) {
  return (
    <div className="msd-item" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '1px 2px' }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: C.greenBg,
          border: `1px solid ${C.greenBorder}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Check className="w-2.5 h-2.5" style={{ color: C.greenInk }} strokeWidth={3.5} />
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.soft,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '-0.01em',
        }}
      >
        {step.text}
      </span>
    </div>
  );
}

export default function DemoThread({ items, typing }) {
  return (
    <div className="msd-thread">
      {items.map((step, index) => {
        if (step.kind === 'verb') return <Verb key={index} step={step} />;
        if (step.kind === 'doctor') return <DoctorCard key={index} step={step} />;
        return <AgentText key={index} step={step} />;
      })}

      {typing && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 4px' }}>
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="msd-dot"
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: C.gold,
                display: 'inline-block',
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
          <span style={{ fontSize: 9.5, color: C.faint, marginLeft: 4, letterSpacing: '0.08em' }}>
            WORKING
          </span>
        </div>
      )}
    </div>
  );
}