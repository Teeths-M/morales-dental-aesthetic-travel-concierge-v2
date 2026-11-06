import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { GOLD } from '@/lib/partnerPricing';

const FIELD = 'w-full rounded-lg px-2.5 py-1.5 text-[12px] bg-white/5 border border-white/10 text-white placeholder:text-white/25 outline-none';

const STATES = [
  { value: 'included', label: 'Included & priced' },
  { value: 'excluded', label: 'Not included' },
  { value: 'unpriced', label: 'Included, no price' },
];

/**
 * PackageComponentsField — the pieces a package is made of.
 *
 * "Included, no price" is a first-class choice on purpose: a component that has
 * no price yet must not be summed as if it were free, so the partner states that
 * explicitly instead of leaving the amount blank and hoping.
 */
export default function PackageComponentsField({ value = [], currency, onChange }) {
  const rows = value;

  const update = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const add = () => onChange([...rows, { label: '', component_state: 'included', amount: '' }]);

  const remove = (index) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="rounded-lg border border-white/10 p-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: GOLD }}>
        What the package contains
      </p>

      {rows.length === 0 && (
        <p className="mt-1.5 text-[11px] text-white/40">
          No components yet. Adding them is what lets M-Care price and compare the package honestly.
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-12 gap-1.5">
            <input
              className={`${FIELD} col-span-5`}
              placeholder="Flight, hotel, transfers"
              value={row.label}
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <select
              className={`${FIELD} col-span-4`}
              value={row.component_state}
              onChange={(e) => update(index, { component_state: e.target.value })}
            >
              {STATES.map((state) => (
                <option key={state.value} value={state.value} className="bg-[#0C1A1D]">{state.label}</option>
              ))}
            </select>
            <input
              className={`${FIELD} col-span-2`}
              placeholder={currency || 'USD'}
              inputMode="decimal"
              disabled={row.component_state !== 'included'}
              value={row.component_state === 'included' ? row.amount : ''}
              onChange={(e) => update(index, { amount: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="col-span-1 flex items-center justify-center rounded-lg text-white/40"
              aria-label="Remove component"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] font-medium text-white/70"
      >
        <Plus className="h-3 w-3" /> Add component
      </button>
    </div>
  );
}