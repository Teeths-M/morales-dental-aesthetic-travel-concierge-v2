/**
 * ActionMenu
 *
 * Accessible dropdown action menu — replaces ad-hoc button groups in tables
 * and cards. Keyboard navigable, closes on outside click or Escape.
 *
 * Props:
 *   items     {Array<{
 *               label: string,
 *               icon?: LucideIcon,
 *               onClick: () => void,
 *               variant?: 'default'|'danger'|'warning',
 *               disabled?: boolean,
 *               hidden?: boolean,
 *             }>}
 *   trigger   {ReactNode?}  — custom trigger, defaults to ⋯ button
 *   align     {'left'|'right'} — dropdown alignment, default 'right'
 *   className {string?}
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

const VARIANT_STYLES = {
  default: 'text-white/70 hover:text-white hover:bg-white/[0.05]',
  danger:  'text-red-400 hover:text-red-300 hover:bg-red-500/[0.08]',
  warning: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/[0.08]',
};

export default function ActionMenu({ items = [], trigger, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const visibleItems = items.filter(i => !i.hidden);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape, arrow-key navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
        if (!items?.length) return;
        const active = document.activeElement;
        const idx = Array.from(items).indexOf(active);
        const next = e.key === 'ArrowDown'
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!visibleItems.length) return null;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div ref={triggerRef}>
        {trigger ? (
          <div onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu">
            {trigger}
          </div>
        ) : (
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Actions"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Menu */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={`absolute z-50 mt-1.5 w-48 rounded-xl bg-[#0D1525] border border-white/[0.08] shadow-2xl py-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
        >
          {visibleItems.map((item, i) => (
            item === 'divider' ? (
              <div key={i} className="h-px bg-white/[0.06] my-1.5 mx-2" role="separator" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:bg-white/[0.05] ${VARIANT_STYLES[item.variant || 'default']}`}
              >
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0 opacity-70" strokeWidth={1.75} />}
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}