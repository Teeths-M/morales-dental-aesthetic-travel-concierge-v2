import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ArrowRight, Check, Minus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

const COMPLEXITY_LABEL = { simple: 'Simple', moderate: 'Moderate', complex: 'Complex', advanced: 'Advanced' };
const COMPLEXITY_COLOR = {
  simple: 'text-emerald-600 bg-emerald-50',
  moderate: 'text-blue-600 bg-blue-50',
  complex: 'text-amber-600 bg-amber-50',
  advanced: 'text-red-600 bg-red-50',
};
const RISK_COLOR = {
  low: 'text-emerald-600 bg-emerald-50',
  moderate: 'text-amber-600 bg-amber-50',
  high: 'text-red-600 bg-red-50',
};

const ROWS = [
  { key: 'base_price_usd', label: 'Starting Price', format: (v) => v != null ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'max_price_usd', label: 'Max Price', format: (v) => v != null ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'estimated_time_minutes', label: 'Procedure Duration', format: (v) => v != null ? `${v} min` : '—' },
  { key: 'min_safe_recovery_days', label: 'Min Recovery', format: (v) => v != null ? `${v} days` : '—' },
  { key: 'ideal_recovery_days', label: 'Ideal Recovery', format: (v) => v != null ? `${v} days` : '—' },
  { key: 'complexity_level', label: 'Complexity', format: (v) => v || '—', badge: COMPLEXITY_COLOR },
  { key: 'ai_risk_level', label: 'Risk Level', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '—', badge: RISK_COLOR },
  { key: 'doctor_specialty_required', label: 'Specialist Required', format: (v) => v ? v.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—' },
];

export default function ProcedureCompare({ allProcedures }) {
  const [selected, setSelected] = useState([null, null]);
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState([false, false]);

  // Flatten all procedures for the dropdown
  const flatProcs = allProcedures.flatMap(cat =>
    cat.procedures.map(p => ({ ...p, category: cat.label, categoryId: cat.id }))
  );

  useEffect(() => {
    const needed = selected.filter(Boolean).map(p => p.title);
    if (!needed.length) return;

    const missing = needed.filter(title => !pricingData[title]);
    if (!missing.length) return;

    setLoading(true);
    base44.entities.ProcedurePricing.filter({})
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.procedure_name] = r; });
        setPricingData(prev => ({ ...prev, ...map }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected]);

  const selectProc = (slot, proc) => {
    setSelected(prev => {
      const next = [...prev];
      next[slot] = proc;
      return next;
    });
    setOpen(prev => { const n = [...prev]; n[slot] = false; return n; });
  };

  const clearSlot = (slot) => {
    setSelected(prev => { const n = [...prev]; n[slot] = null; return n; });
  };

  const bothSelected = selected[0] && selected[1];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600 mb-1">Side-by-Side</p>
          <h3 className="text-base font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>Compare Procedures</h3>
        </div>
        <span className="text-xs text-slate-400">Pick any two treatments to compare</span>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        {[0, 1].map(slot => (
          <div key={slot} className="bg-white p-4">
            {selected[slot] ? (
              <div className="flex items-start gap-3">
                {selected[slot].image && (
                  <img src={selected[slot].image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{selected[slot].title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selected[slot].category}</p>
                </div>
                <button onClick={() => clearSlot(slot)} className="p-1 rounded-lg hover:bg-slate-100 flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setOpen(prev => { const n = [...prev]; n[slot] = !n[slot]; return n; })}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                >
                  <span>Select procedure {slot + 1}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {open[slot] && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto"
                    >
                      {flatProcs
                        .filter(p => p.title !== selected[slot === 0 ? 1 : 0]?.title)
                        .map(p => (
                          <button
                            key={p.title}
                            onClick={() => selectProc(slot, p)}
                            className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-b border-slate-50 last:border-0"
                          >
                            <span className="font-medium">{p.title}</span>
                            <span className="text-xs text-slate-400 ml-2">{p.category}</span>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      {bothSelected && (
        <div>
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">Loading pricing data…</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ROWS.map((row, i) => {
                const v0 = pricingData[selected[0].title]?.[row.key];
                const v1 = pricingData[selected[1].title]?.[row.key];
                const label0 = row.format(v0);
                const label1 = row.format(v1);
                const isHighlighted = i % 2 === 0;

                return (
                  <div key={row.key} className={`grid grid-cols-3 ${isHighlighted ? 'bg-slate-50/50' : 'bg-white'}`}>
                    {/* Row label */}
                    <div className="px-4 py-3 flex items-center">
                      <span className="text-xs font-semibold text-slate-500">{row.label}</span>
                    </div>
                    {/* Value 0 */}
                    <div className="px-4 py-3 border-l border-slate-100 flex items-center">
                      {row.badge && v0 ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.badge[v0] || 'text-slate-500 bg-slate-100'}`}>
                          {label0}
                        </span>
                      ) : (
                        <span className={`text-sm font-semibold ${label0 === '—' ? 'text-slate-300' : 'text-slate-800'}`}>{label0}</span>
                      )}
                    </div>
                    {/* Value 1 */}
                    <div className="px-4 py-3 border-l border-slate-100 flex items-center">
                      {row.badge && v1 ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.badge[v1] || 'text-slate-500 bg-slate-100'}`}>
                          {label1}
                        </span>
                      ) : (
                        <span className={`text-sm font-semibold ${label1 === '—' ? 'text-slate-300' : 'text-slate-800'}`}>{label1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Column headers overlay */}
          <div className="grid grid-cols-3 border-t border-slate-100 bg-white">
            <div className="px-4 py-3" />
            {[0, 1].map(slot => (
              <div key={slot} className="px-4 py-3 border-l border-slate-100">
                <Link to="/booking">
                  <button className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-700 to-blue-800 text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5">
                    Book {selected[slot]?.title?.split(' ').slice(0, 2).join(' ')} <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!bothSelected && (
        <div className="px-6 py-8 text-center text-sm text-slate-400">
          Select two procedures above to see a full cost & care comparison.
        </div>
      )}
    </div>
  );
}