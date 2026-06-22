/**
 * SkeletonBlock
 *
 * Low-level shimmer placeholder. Compose into skeleton layouts.
 *
 * Props:
 *   w / h       {string?}   — Tailwind width/height classes (e.g. 'w-32', 'h-4')
 *   rounded     {string?}   — Tailwind rounding (default 'rounded')
 *   dark        {boolean?}  — default true
 *   count       {number?}   — render N stacked lines (default 1)
 *   className   {string?}
 */
import React from 'react';

export default function SkeletonBlock({
  w = 'w-full',
  h = 'h-4',
  rounded = 'rounded',
  dark = true,
  count = 1,
  className = '',
}) {
  const base = `${dark ? 'bg-white/[0.06]' : 'bg-muted'} animate-pulse ${rounded}`;

  if (count > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${base} ${h} ${i === count - 1 ? 'w-2/3' : w}`} />
        ))}
      </div>
    );
  }

  return <div className={`${base} ${w} ${h} ${className}`} aria-hidden="true" />;
}