/**
 * SectionHeader
 *
 * Sub-section heading inside a page (below PageHeader level).
 * Use for grouping cards, table sections, and form blocks.
 *
 * Props:
 *   title       {string}
 *   subtitle    {string?}
 *   icon        {LucideIcon?}
 *   actions     {ReactNode?}   — right-aligned controls
 *   dark        {boolean?}     — default true
 *   className   {string?}
 */
import React from 'react';

export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  dark = true,
  className = '',
}) {
  return (
    <div className={`flex items-start justify-between gap-3 flex-wrap mb-4 ${className}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <span
            className={`mt-0.5 flex-shrink-0 ${dark ? 'text-white/40' : 'text-muted-foreground'}`}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className={`font-display text-lg font-semibold leading-tight ${dark ? 'text-white/90' : 'text-foreground'}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`mt-0.5 text-xs leading-relaxed ${dark ? 'text-white/35' : 'text-muted-foreground'}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}