/**
 * LoadingState
 *
 * Drop-in skeleton scaffold for data-driven cards/lists while fetching.
 * Exposes aria-busy so assistive tech announces the pending state.
 *
 * Props:
 *   rows        {number?}   — number of skeleton rows (default 3)
 *   variant     {'list'|'card'|'table'} — default 'list'
 *   dark        {boolean?}  — default true
 *   label       {string?}   — accessible label (default 'Loading content')
 *   className   {string?}
 */
import React from 'react';

export default function LoadingState({
  rows = 3,
  variant = 'list',
  dark = true,
  label = 'Loading content',
  className = '',
}) {
  const shimmer = dark ? 'bg-white/[0.06]' : 'bg-muted';

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`space-y-3 ${className}`}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`rounded-xl border p-4 ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-border bg-card'}`}
        >
          <div className="flex items-center gap-3">
            {variant !== 'table' && (
              <div className={`w-10 h-10 rounded-lg flex-shrink-0 animate-pulse ${shimmer}`} />
            )}
            <div className="flex-1 space-y-2">
              <div className={`h-3.5 rounded animate-pulse ${shimmer}`} style={{ width: `${60 + (i % 3) * 12}%` }} />
              <div className={`h-3 w-1/3 rounded animate-pulse ${shimmer}`} />
            </div>
            {variant === 'card' && (
              <div className={`w-16 h-7 rounded-full flex-shrink-0 animate-pulse ${shimmer}`} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}