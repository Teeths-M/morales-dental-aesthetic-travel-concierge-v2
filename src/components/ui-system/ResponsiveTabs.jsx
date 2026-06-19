/**
 * ResponsiveTabs
 *
 * Accessible tab strip that scrolls horizontally on narrow screens
 * instead of wrapping/overlapping. Keyboard arrow navigation supported.
 *
 * Props:
 *   tabs      {Array<{ value, label, icon? }>}
 *   value     {string}           — active tab value
 *   onChange  {(value) => void}
 *   dark      {boolean?}         — default true
 *   ariaLabel {string?}
 *   className {string?}
 */
import React, { useRef } from 'react';

export default function ResponsiveTabs({
  tabs = [],
  value,
  onChange,
  dark = true,
  ariaLabel = 'Sections',
  className = '',
}) {
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange?.(tabs[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 overflow-x-auto border-b ${dark ? 'border-white/[0.06]' : 'border-border'} ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((tab, i) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
              active
                ? (dark ? 'border-white text-white' : 'border-primary text-primary')
                : (dark ? 'border-transparent text-white/40 hover:text-white/70' : 'border-transparent text-muted-foreground hover:text-foreground')
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}