import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { fuzzyFilterOptions } from '@/lib/fuzzyMatch';

/**
 * Light, searchable combobox with fuzzy autocomplete (per the "fuzzy everything"
 * rule). Type to filter the list, or type a value that isn't in it — either way
 * onChange fires. Shared primitive for Country / City pickers (BYOJ, Check Your
 * Doctor, …).
 *
 * - `boxed` renders its own bordered input container (standalone use).
 *   Omit it when the caller already provides the field box.
 */
export default function SearchSelect({ value, onChange, options = [], placeholder, disabled = false, boxed = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { if (value !== q) setQ(value || ''); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const objOpts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const filtered = (q.trim() ? fuzzyFilterOptions(objOpts, q) : objOpts).slice(0, 60);

  const pick = (label) => { setQ(label); onChange(label); setOpen(false); };

  const wrapCls = boxed
    ? 'flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-[#0E8A7D]/50 transition-colors'
    : 'flex items-center';

  return (
    <div ref={ref} className="relative">
      <div className={wrapCls}>
        <input
          disabled={disabled}
          value={q}
          onChange={(e) => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal disabled:text-slate-300 disabled:cursor-not-allowed"
        />
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-40 mt-2 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl">
          {filtered.map((o) => (
            <li key={o.value} onMouseDown={() => pick(o.label)}
              className={`px-3.5 py-2.5 text-[14px] cursor-pointer transition-colors ${o.label === value ? 'text-[#0E8A7D] font-semibold bg-[#0E8A7D]/8' : 'text-slate-700 hover:bg-[#0E8A7D]/8'}`}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
