import React from 'react';
import { Star } from 'lucide-react';

const TONE = {
  green: { color: 'var(--ms-green-ink)' },
  amber: { color: 'var(--ms-amber-ink)' },
  muted: { color: 'var(--ms-ink-faint)' },
};

/**
 * EvidenceCard — the key/value card the walkthrough renders under an agent
 * message. One component serves every stage so the layout stays identical as
 * the intake moves: title row with its badge, then the facts, then an optional
 * footer block (the QR / directions block on the location stages).
 */
export default function EvidenceCard({ icon: Icon, title, badge, rows, footer }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--ms-card)', border: '1px solid var(--ms-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        {Icon && (
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--ms-chip)' }}
          >
            <Icon className="w-4 h-4" strokeWidth={1.8} style={{ color: 'var(--ms-gold)' }} />
          </div>
        )}
        <p className="text-[13.5px] font-semibold leading-tight flex-1 min-w-0 truncate" style={{ color: 'var(--ms-ink)' }}>
          {title}
        </p>
        {badge && (
          <span
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background: badge.tone === 'green' ? 'var(--ms-green-bg)' : 'var(--ms-amber-bg)',
              border: `1px solid ${badge.tone === 'green' ? 'rgba(60,179,113,0.3)' : 'rgba(218,165,32,0.35)'}`,
            }}
          >
            <span
              className="text-[9.5px] font-bold uppercase"
              style={{ color: badge.tone === 'green' ? 'var(--ms-green-ink)' : 'var(--ms-amber-ink)', letterSpacing: '0.06em' }}
            >
              {badge.label}
            </span>
          </span>
        )}
      </div>

      <dl className="px-4 pb-3.5 space-y-[7px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <dt className="text-[11px] w-[86px] flex-shrink-0 pt-[1px]" style={{ color: 'var(--ms-ink-faint)' }}>
              {row.label}
            </dt>
            <dd className="text-[11.5px] leading-snug flex-1 min-w-0" style={{ color: TONE[row.tone]?.color || 'var(--ms-ink)' }}>
              {row.tone === 'star' ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--ms-gold)' }} fill="currentColor" />
                  {String(row.value).replace('★ ', '')}
                </span>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {footer}
    </div>
  );
}