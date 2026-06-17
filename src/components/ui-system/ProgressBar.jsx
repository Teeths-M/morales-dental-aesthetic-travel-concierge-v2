/**
 * ProgressBar
 *
 * Accessible progress indicator for uploads, downloads, and multi-step processes.
 * Supports determinate and indeterminate modes, with optional labels and variants.
 *
 * Props:
 *   value      {number?}       — Progress value (0-100). Omit for indeterminate
 *   label      {string?}       — Progress label
 *   showValue  {boolean?}      — Show percentage value
 *   variant    {'default'|'success'|'warning'|'danger'} — Color variant
 *   size       {'sm'|'md'|'lg'} — Bar height
 *   dark       {boolean?}      — Dark theme variant (default true)
 *   className  {string?}
 */

import React from 'react';

const SIZE_HEIGHTS = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const VARIANT_COLORS = {
  default: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

export default function ProgressBar({
  value,
  label,
  showValue = false,
  variant = 'default',
  size = 'md',
  dark = true,
  className = '',
}) {
  const isIndeterminate = value === undefined || value === null;
  const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full ${className}`}>
      {/* Label row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className={`text-xs font-medium ${dark ? 'text-white/60' : 'text-foreground/70'}`}>
              {label}
            </span>
          )}
          {showValue && !isIndeterminate && (
            <span className={`text-xs tabular-nums ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={`w-full rounded-full overflow-hidden ${dark ? 'bg-white/[0.06]' : 'bg-muted'} ${SIZE_HEIGHTS[size]}`}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {isIndeterminate ? (
          <div className={`h-full ${VARIANT_COLORS[variant]} animate-progress-indeterminate`} />
        ) : (
          <div
            className={`h-full ${VARIANT_COLORS[variant]} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}