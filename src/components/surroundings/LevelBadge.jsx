import React from 'react';

/**
 * LevelBadge — the four levels, and nothing else. Kept as its own component so
 * "Urgent" can never be rendered in the same style as "Information" by accident
 * in some other surface.
 */
const STYLES = {
  information: { color: '#7DD3FC', bg: 'rgba(125,211,252,0.12)', border: 'rgba(125,211,252,0.3)', label: 'Information' },
  caution: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', label: 'Caution' },
  warning: { color: '#FB923C', bg: 'rgba(251,146,60,0.14)', border: 'rgba(251,146,60,0.34)', label: 'Warning' },
  urgent: { color: '#EF4444', bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.38)', label: 'Urgent' },
};

export default function LevelBadge({ level = 'information', label }) {
  const style = STYLES[level] || STYLES.information;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-bold uppercase"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        fontSize: 9.5,
        letterSpacing: '0.14em',
        padding: '3px 9px',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: style.color }} />
      {label || style.label}
    </span>
  );
}