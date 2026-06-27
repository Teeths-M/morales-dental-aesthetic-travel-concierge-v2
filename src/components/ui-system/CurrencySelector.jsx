// @ts-nocheck — pre-existing type gaps in custom ui-system components
import React from 'react';
import { CURRENCIES } from '@/hooks/useCurrencyConverter';

/**
 * CurrencySelector â€” compact dropdown + converted amount display.
 *
 * Props:
 *   selectedCode   â€” current currency code string
 *   onSelect       â€” (code: string) => void
 *   amountUSD      â€” number | null  (optional â€” if provided, shows converted amount)
 *   formatLocal    â€” (amountUSD: number) => string | null  (from useCurrencyConverter)
 *   dark           â€” boolean (use dark card styling, default false)
 */
export default function CurrencySelector({ selectedCode, onSelect, amountUSD, formatLocal, dark = false }) {
  const localStr = amountUSD != null ? formatLocal(amountUSD) : null;
  const selected = CURRENCIES.find(c => c.code === selectedCode) || CURRENCIES[0];

  const selectStyle = {
    appearance: 'none',
    WebkitAppearance: 'none',
    background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.10)',
    borderRadius: 999,
    color: dark ? '#fff' : '#1e293b',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 28px 6px 10px',
    cursor: 'pointer',
    outline: 'none',
    minHeight: 36,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 8, fontSize: 14, pointerEvents: 'none' }}>
          {selected.flag}
        </span>
        <select
          value={selectedCode}
          onChange={e => onSelect(e.target.value)}
          style={{ ...selectStyle, paddingLeft: 26 }}
          aria-label="Select display currency"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} â€” {c.name}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <svg
          style={{ position: 'absolute', right: 8, pointerEvents: 'none', opacity: 0.5 }}
          width={12} height={12} viewBox="0 0 24 24" fill="none"
          stroke={dark ? '#fff' : '#334155'} strokeWidth={2.5}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {localStr && selectedCode !== 'USD' && (
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: dark ? 'rgba(255,255,255,0.65)' : '#475569',
          background: dark ? 'rgba(212,175,55,0.08)' : 'rgba(0,0,0,0.04)',
          border: dark ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(0,0,0,0.07)',
          borderRadius: 999, padding: '4px 12px',
          whiteSpace: 'nowrap',
        }}>
          â‰ˆ {localStr}
        </span>
      )}
    </div>
  );
}

