import React from 'react';

const GOLD = '#D4AF37';

/**
 * Live progress, not a loading spinner. `items` is a list of
 * `{ label, state: 'pending' | 'done' | 'error' }` — question progress plus
 * the background-search results (doctors, cost, destination partners) as
 * their async lookups settle, built by ConciergeIntake's buildChecklistItems.
 */
function StatusDot({ state }) {
  if (state === 'done')
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}
      >
        <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>✓</span>
      </div>
    );
  if (state === 'error')
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444' }}
      >
        <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}>!</span>
      </div>
    );
  return (
    <div
      className="w-6 h-6 rounded-full flex-shrink-0"
      style={{ background: '#1e2d35', border: '2px solid #2A3F4A' }}
    />
  );
}

/**
 * `progressLabel`/`progressRatio` render a phase ("Building your Safe-T
 * Profile...") plus a thin wordless bar instead of an exact "X of Y
 * questions answered" count — the ratio is still tracked internally, just
 * not shown as a literal number, which reads like a long form.
 */
export default function IntakeProgressChecklist({ items = [], progressLabel = '', progressRatio = 0 }) {
  const hasItems = items && items.length > 0;
  if (!hasItems && !progressLabel) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {progressLabel && (
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
            {progressLabel}
          </p>
          <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(4, (progressRatio || 0) * 100))}%`,
                background: GOLD,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}
      {hasItems && items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusDot state={item.state} />
          <span
            style={{
              fontSize: 13,
              color: item.state === 'done' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
              fontWeight: item.state === 'done' ? 600 : 500,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
      <div style={{ height: 1, background: '#2A3F4A', margin: '4px 0 2px' }} />
      <span style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD, opacity: 0.7 }}>
        Working alongside you
      </span>
    </div>
  );
}
