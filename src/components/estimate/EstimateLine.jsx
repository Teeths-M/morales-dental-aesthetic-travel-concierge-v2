import React from 'react';
import PriceKindBadge from './PriceKindBadge';

/**
 * One line of the itemized estimate.
 *
 * When there is no price there is no number — not a dash pretending to be zero,
 * and not an omitted row that would read as "included".
 */
export default function EstimateLine({ line }) {
  const hasNumber = line.amount_display !== null && line.amount_display !== undefined;

  return (
    <div
      style={{
        padding: '16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#F3F5F7' }}>{line.label}</p>

          {line.partner_name && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(243,245,247,0.55)' }}>
              {line.partner_name}
              {line.location_label ? ` · ${line.location_label}` : ''}
            </p>
          )}

          {line.quantity_basis && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(243,245,247,0.45)' }}>
              {line.unit_amount_display} {line.quantity_basis}
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasNumber ? (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 650, color: '#D4AF37' }}>{line.amount_display}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(243,245,247,0.4)' }}>No price yet</p>
          )}
          <div style={{ marginTop: 6 }}>
            <PriceKindBadge line={line} />
          </div>
        </div>
      </div>

      {line.source_note && (
        <p style={{ margin: '9px 0 0', fontSize: 12, lineHeight: 1.55, color: 'rgba(243,245,247,0.5)' }}>
          {line.source_note}
        </p>
      )}

      {Array.isArray(line.parts) && line.parts.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '1px solid rgba(212,175,55,0.25)' }}>
          {line.parts.map((part, index) => (
            <div
              key={`${part.label}-${index}`}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}
            >
              <span style={{ fontSize: 12.5, color: 'rgba(243,245,247,0.62)' }}>{part.label}</span>
              <span style={{ fontSize: 12.5, color: part.amount_display ? 'rgba(243,245,247,0.85)' : 'rgba(243,245,247,0.4)' }}>
                {part.amount_display || 'Quote required'}
              </span>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(line.detail) && line.detail.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {line.detail.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0' }}
            >
              <span style={{ fontSize: 12.5, color: 'rgba(243,245,247,0.62)' }}>{row.label}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(243,245,247,0.85)' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.amount_minor / 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}