/**
 * StatCard
 *
 * Metric card for dashboards. Supports trend indicators, loading skeletons,
 * icons, sparkline slot, and both light and dark themes.
 *
 * Props:
 *   title        {string}
 *   value        {string|number}
 *   subtitle     {string?}
 *   icon         {LucideIcon?}
 *   iconColor    {string?}       — tailwind colour e.g. 'text-emerald-400'
 *   trend        {number?}       — percentage change, +/- float
 *   trendLabel   {string?}       — e.g. 'vs last month'
 *   isLoading    {boolean?}
 *   onClick      {() => void?}
 *   accent       {'gold'|'emerald'|'blue'|'red'|'none'} — left border accent
 *   children     {ReactNode?}    — bottom slot (sparkline, mini chart, etc.)
 *   className    {string?}
 */

/* eslint-disable react/prop-types */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';
// Note: `Icon` is used as a JSX component from the `icon` prop — intentional dynamic component pattern.

const ACCENT_BORDER = {
  gold:    `border-l-[3px]`,
  emerald: `border-l-[3px]`,
  blue:    `border-l-[3px]`,
  red:     `border-l-[3px]`,
  none:    '',
};

const ACCENT_COLOR = {
  gold:    BRAND.gold,
  emerald: '#34d399',
  blue:    '#60a5fa',
  red:     '#f87171',
  none:    'transparent',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className}`} />;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-white/30',
  trend,
  trendLabel = 'vs last period',
  isLoading = false,
  onClick,
  accent = 'none',
  children,
  className = '',
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const trendPositive = hasTrend && trend > 0;
  const trendNeutral = hasTrend && trend === 0;
  const TrendIcon = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trendNeutral ? 'text-white/30' : trendPositive ? 'text-emerald-400' : 'text-red-400';

  const accentBorderStyle = accent !== 'none'
    ? { borderLeftColor: ACCENT_COLOR[accent] }
    : {};

  return (
    <div
      className={`
        relative rounded-2xl border border-white/[0.07] bg-[#0A101D] p-5
        ${ACCENT_BORDER[accent]}
        ${onClick ? 'cursor-pointer hover:border-white/[0.12] hover:bg-[#0D1525] transition-all duration-200' : ''}
        ${className}
      `}
      style={accentBorderStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${title}: ${value}` : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
            {title}
          </p>
        )}

        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
            {isLoading
              ? <div className="w-4 h-4 rounded animate-pulse bg-white/[0.06]" />
              : <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.75} />
            }
          </div>
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <Skeleton className="h-8 w-32 mb-2" />
      ) : (
        <p className="text-3xl font-display font-semibold text-white leading-none mb-1 tabular-nums">
          {value ?? '—'}
        </p>
      )}

      {/* Subtitle */}
      {isLoading ? (
        <Skeleton className="h-3 w-20 mt-1" />
      ) : subtitle ? (
        <p className="text-[11px] text-white/30 mt-1">{subtitle}</p>
      ) : null}

      {/* Trend indicator */}
      {!isLoading && hasTrend && (
        <div className={`flex items-center gap-1.5 mt-3 ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
          <span className="text-[10px] text-white/20">{trendLabel}</span>
        </div>
      )}

      {/* Bottom slot — sparkline or extra content */}
      {children && (
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          {children}
        </div>
      )}
    </div>
  );
}