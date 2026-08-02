import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { fuzzyFilterOptions } from '@/lib/fuzzyMatch';

/**
 * Light/dark searchable combobox with fuzzy autocomplete (the "fuzzy everything"
 * rule). Shared primitive for Country / Nationality / City pickers (BYOJ, Check
 * Your Doctor, Booking, …).
 *
 * - `strict` — pick-from-list only. Typing filters the list but NEVER commits a
 *   raw string; on close, an un-picked query reverts to the last committed value.
 *   Use for closed sets (country, nationality) where a typo silently breaks
 *   downstream visa/geo logic. Omit for long-tail fields (city) where a value
 *   not in the list is legitimate — there typing commits, as before.
 * - `boxed` — renders its own bordered input container (standalone use).
 * - `dark`  — dark surfaces (ConsultationForm) instead of the light CALM ones.
 */
export default function SearchSelect({
  value, onChange, options = [], placeholder, disabled = false, boxed = false, strict = false, dark = false,
  testId = undefined,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');
  const ref = useRef(null);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => { if (value !== q) setQ(value || ''); }, [value]);  

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        // Strict: never leave a typed-but-unpicked value behind — revert to the
        // last committed value so only real list entries are ever stored.
        if (strict) setQ(valueRef.current || '');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [strict]);

  const objOpts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const filtered = (q.trim() ? fuzzyFilterOptions(objOpts, q) : objOpts).slice(0, 60);

  const pick = (label) => { setQ(label); onChange(label); setOpen(false); };
  const handleInput = (e) => {
    setQ(e.target.value);
    if (!strict) onChange(e.target.value); // strict: typing only filters, never commits
    setOpen(true);
  };

  // Theme-aware classes
  const wrapBase = dark
    ? 'rounded-xl border border-[#2A3F4A] bg-white/5 px-3.5 py-3 focus-within:border-[#0E8A7D]/60'
    : 'rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-[#0E8A7D]/50';
  const wrapCls = `flex items-center transition-colors ${boxed ? wrapBase : ''}`;
  const inputCls = dark
    ? 'w-full bg-transparent outline-none text-[15px] font-semibold text-white placeholder:text-white/40 placeholder:font-normal disabled:text-white/30 disabled:cursor-not-allowed'
    : 'w-full bg-transparent outline-none text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal disabled:text-slate-300 disabled:cursor-not-allowed';
  const menuCls = dark
    ? 'absolute z-40 mt-2 left-0 right-0 max-h-56 overflow-y-auto bg-[#0C1A1D] border border-[#2A3F4A] rounded-xl shadow-xl'
    : 'absolute z-40 mt-2 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl';
  const optClass = (isSel) => {
    if (isSel) return 'px-3.5 py-2.5 text-[14px] cursor-pointer transition-colors text-[#0E8A7D] font-semibold bg-[#0E8A7D]/8';
    return dark
      ? 'px-3.5 py-2.5 text-[14px] cursor-pointer transition-colors text-white/80 hover:bg-white/10'
      : 'px-3.5 py-2.5 text-[14px] cursor-pointer transition-colors text-slate-700 hover:bg-[#0E8A7D]/8';
  };

  return (
    <div ref={ref} className="relative">
      <div className={wrapCls}>
        <input
          data-testid={testId}
          disabled={disabled}
          value={q}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputCls}
        />
        <ChevronDown className={`w-4 h-4 shrink-0 pointer-events-none ${dark ? 'text-white/40' : 'text-slate-400'}`} />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className={menuCls}>
          {filtered.map((o) => (
            <li key={o.value} onMouseDown={() => pick(o.label)} className={optClass(o.label === value)}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
