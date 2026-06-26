import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight } from 'lucide-react';

/**
 * SmartAllergyInput — 2046 zero-type allergy selector.
 *
 * Layer 1: Tap-to-add common allergy pills (most people never type).
 * Layer 2: If they do type, AI autocomplete surfaces the top 3 matches
 *          and nudges: "We think you mean 'Penicillin' — is that correct?"
 * Layer 3: Free-text fallback for truly custom entries.
 *
 * Props:
 *   selected  — string[] currently selected allergies
 *   onChange  — (allergies: string[]) => void
 */

const COMMON = [
  { label: 'None',           icon: '✅', common: true  },
  { label: 'Penicillin',     icon: '💊', common: true  },
  { label: 'Latex',          icon: '🧤', common: true  },
  { label: 'Peanuts',        icon: '🥜', common: true  },
  { label: 'Sulfa drugs',    icon: '💊', common: true  },
  { label: 'Ibuprofen',      icon: '💊', common: true  },
  { label: 'Aspirin',        icon: '💊', common: true  },
  { label: 'Iodine / dye',   icon: '🔵', common: true  },
  { label: 'Shellfish',      icon: '🦐', common: true  },
  { label: 'Tree nuts',      icon: '🌰', common: false },
  { label: 'Dairy',          icon: '🥛', common: false },
  { label: 'Eggs',           icon: '🥚', common: false },
  { label: 'Bee stings',     icon: '🐝', common: false },
  { label: 'Codeine',        icon: '💊', common: false },
  { label: 'Morphine',       icon: '💊', common: false },
  { label: 'Contrast dye',   icon: '💉', common: false },
  { label: 'Pollen',         icon: '🌸', common: false },
  { label: 'Dust mites',     icon: '🕷️', common: false },
  { label: 'Cat dander',     icon: '🐱', common: false },
  { label: 'Mold',           icon: '🍄', common: false },
];

const ALL_LABELS = COMMON.map(c => c.label);

function getSuggestions(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return ALL_LABELS.filter(l => l.toLowerCase().includes(q)).slice(0, 3);
}

export default function SmartAllergyInput({ selected = [], onChange }) {
  const [query,        setQuery]        = useState('');
  const [suggestions,  setSuggestions]  = useState([]);
  const [nudge,        setNudge]        = useState(null); // { label, query }
  const [showAll,      setShowAll]      = useState(false);
  const inputRef = useRef(null);
  const GOLD = '#D4AF37';

  const visibleCommon = showAll ? COMMON : COMMON.filter(c => c.common);

  // Generate suggestions + nudge as user types
  useEffect(() => {
    const s = getSuggestions(query);
    setSuggestions(s);
    // Nudge when the top suggestion is a strong match
    if (s.length > 0 && query.length >= 3) {
      const top = s[0];
      if (top.toLowerCase().startsWith(query.toLowerCase().slice(0, 3))) {
        setNudge({ label: top, query });
      } else {
        setNudge(null);
      }
    } else {
      setNudge(null);
    }
  }, [query]);

  function toggle(label) {
    if (label === 'None') {
      onChange(['None']);
      return;
    }
    const without = selected.filter(s => s !== 'None');
    if (without.includes(label)) {
      onChange(without.filter(s => s !== label));
    } else {
      onChange([...without, label]);
    }
  }

  function addCustom(label) {
    const cleaned = label.trim();
    if (!cleaned) return;
    if (!selected.includes(cleaned)) {
      toggle(cleaned);
    }
    setQuery('');
    setSuggestions([]);
    setNudge(null);
  }

  function acceptNudge() {
    addCustom(nudge.label);
    setNudge(null);
  }

  const hasNone   = selected.includes('None');
  const hasOthers = selected.filter(s => s !== 'None').length > 0;

  return (
    <div className="space-y-4">
      {/* Common allergy pills */}
      <div>
        <p className="text-xs text-white/45 mb-3">
          Tap all that apply — or tap <strong className="text-white/60">None</strong> if you have no allergies.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {visibleCommon.map(item => {
            const isSelected = selected.includes(item.label);
            return (
              <motion.button
                key={item.label}
                type="button"
                onClick={() => toggle(item.label)}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 rounded-2xl px-3.5 py-3 min-h-[48px] text-left transition-all"
                style={{
                  background: isSelected ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
                  border: isSelected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.10)',
                  outline: 'none',
                }}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-semibold flex-1"
                  style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                  {item.label}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" strokeWidth={2.5} />}
              </motion.button>
            );
          })}
        </div>

        {/* Show more toggle */}
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="mt-2 text-xs font-semibold flex items-center gap-1"
          style={{ color: GOLD }}>
          {showAll ? 'Show fewer options' : `Show ${COMMON.length - visibleCommon.length} more allergies`}
          <ChevronRight className="w-3 h-3" style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Smart type-ahead — only shown when user starts typing */}
      {!hasNone && (
        <div>
          <p className="text-xs text-white/45 mb-2">Don't see yours? Type it below:</p>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(suggestions[0] || query); } }}
              placeholder="e.g. Penicillin, Peanuts…"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                outline: 'none',
                minHeight: 48,
              }}
            />

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {suggestions.length > 0 && query.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                  style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                >
                  {suggestions.map(s => (
                    <button key={s} type="button" onClick={() => addCustom(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="text-sm font-medium text-white/80">{s}</span>
                      <span className="ml-auto text-[10px] text-white/30">Tap to add</span>
                    </button>
                  ))}
                  {query.trim() && !ALL_LABELS.map(l => l.toLowerCase()).includes(query.toLowerCase()) && (
                    <button type="button" onClick={() => addCustom(query)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-sm font-medium text-white/60">Add "<strong className="text-white/80">{query}</strong>"</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Predictive nudge */}
          <AnimatePresence>
            {nudge && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mt-2 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: `rgba(212,175,55,0.08)`, border: `1px solid rgba(212,175,55,0.28)` }}
              >
                <span className="text-sm text-white/70">
                  We think you mean <strong className="text-white">&ldquo;{nudge.label}&rdquo;</strong> — is that correct?
                </span>
                <button type="button" onClick={acceptNudge}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: GOLD, color: '#060B16' }}>
                  Confirm
                </button>
                <button type="button" onClick={() => setNudge(null)}
                  className="flex-shrink-0 text-xs text-white/40 hover:text-white/60">
                  Keep typing
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Selected summary */}
      {(hasOthers || hasNone) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl px-3.5 py-3"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider mb-2">Recorded</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(s => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-white/75 rounded-full px-3 py-1"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                {s}
                <button type="button" onClick={() => toggle(s)}
                  className="text-white/40 hover:text-white/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
