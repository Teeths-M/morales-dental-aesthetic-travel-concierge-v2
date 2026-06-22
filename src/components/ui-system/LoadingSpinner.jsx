/**
 * LoadingSpinner / PageLoader / SectionLoader
 *
 * Three variants for different contexts:
 *   <LoadingSpinner />          — inline, small
 *   <SectionLoader />           — card/section level
 *   <PageLoader />              — full-page takeover
 *
 * Props (all components):
 *   size      {'xs'|'sm'|'md'|'lg'} — default 'md'
 *   label     {string?}
 *   dark      {boolean?}            — dark bg variant
 *   className {string?}
 */

import React from 'react';
import { BRAND } from '@/lib/brandTokens';

const SIZES = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
};

export function LoadingSpinner({ size = 'md', label, dark = true, className = '' }) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        className={`${SIZES[size]} rounded-full border-current border-t-transparent animate-spin ${dark ? 'text-white/40' : 'text-muted-foreground/40'}`}
      />
      {label && (
        <span className={`text-xs ${dark ? 'text-white/30' : 'text-muted-foreground'}`}>
          {label}
        </span>
      )}
    </span>
  );
}

export function SectionLoader({ label = 'Loading…', dark = true, className = '' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex flex-col items-center justify-center py-16 gap-3 ${className}`}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${BRAND.goldAlpha(0.3)} ${BRAND.goldAlpha(0.3)} ${BRAND.goldAlpha(0.3)} transparent` }}
      />
      <p className={`text-xs ${dark ? 'text-white/25' : 'text-muted-foreground'}`}>{label}</p>
    </div>
  );
}

export function PageLoader({ label = '' }) {
  return (
    <div
      role="status"
      aria-label={label || 'Loading page'}
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#060B16] z-50"
    >
      {/* Morales M logo */}
      <div
        className="w-14 h-14 rounded-2xl border border-white/[0.08] flex items-center justify-center mb-6"
        style={{ background: '#051A1D' }}
      >
        <span className="font-serif text-2xl tracking-wider" style={{ color: BRAND.gold }}>M</span>
      </div>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
        style={{ borderColor: `${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} transparent` }}
      />
      {label && (
        <p className="text-xs text-white/20 tracking-wider">{label}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;