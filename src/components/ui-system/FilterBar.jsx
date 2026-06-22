/**
 * FilterBar
 *
 * Horizontal scrollable row of filter "pills" (single-select).
 * Generic — pass options + active value. No domain assumptions.
 *
 * Props:
 *   options   {Array<{ value, label, count? }>}
 *   value     {string}            — currently active value
 *   onChange  {(value) => void}
 *   dark      {boolean?}          — default true
 *   ariaLabel {string?}          — group label (default 'Filter')
 *   className {string?}
 */
import React from 'react';

export default function FilterBar({
  options = [],
  value,
  onChange,
  dark = true,
  ariaLabel = 'Filter',
  className = '',
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
              active
                ? (dark ? 'bg-white text-slate-900 ring-white/20' : 'bg-primary text-primary-foreground')
                : (dark ? 'bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.08] ring-white/10' : 'bg-muted text-muted-foreground hover:text-foreground')
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className={`text-[10px] tabular-nums ${active ? 'opacity-60' : 'opacity-50'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}