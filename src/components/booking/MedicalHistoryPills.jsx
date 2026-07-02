import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * MedicalHistoryPills — 2046 zero-type medical condition selector.
 *
 * Replaces RadioGroup and text inputs for medical conditions.
 * Patient taps pills to select/deselect. Never types.
 *
 * Props:
 *   selected   — string[] currently selected conditions
 *   onChange   — (conditions: string[]) => void
 *   options    — { label, icon, desc? }[]
 *   title      — section label
 *   hint       — subtext hint
 *   exclusive  — string[] labels that deselect everything else when tapped (e.g. "None")
 *   multiSelect — boolean (default true)
 */

const DEFAULT_CONDITIONS = [
  { label: 'None',                  icon: '✅', desc: 'No known conditions',          common: true  },
  { label: 'Diabetes',              icon: '🩸', desc: 'Type 1 or Type 2',             common: true  },
  { label: 'Hypertension',          icon: '❤️', desc: 'High blood pressure',           common: true  },
  { label: 'Asthma',                icon: '🫁', desc: 'Breathing condition',           common: true  },
  { label: 'Heart Disease',         icon: '💗', desc: 'Cardiac condition',             common: true  },
  { label: 'Thyroid Conditions',    icon: '🦋', desc: 'Hypo / hyperthyroidism',        common: true  },
  { label: 'Autoimmune Disorders',  icon: '🛡️', desc: 'Lupus, RA, MS, etc.',          common: false },
  { label: 'Epilepsy',              icon: '⚡', desc: 'Seizure disorder',              common: false },
  { label: 'Blood Disorders',       icon: '🔴', desc: 'Clotting, anemia, etc.',        common: false },
  { label: 'Other',                 icon: '📝', desc: 'Tell us more',                  common: false },
];

const DEFAULT_SURGERIES = [
  { label: 'Appendectomy',        icon: '🔪' },
  { label: 'C-Section',           icon: '👶' },
  { label: 'Gallbladder',         icon: '🫀' },
  { label: 'Hernia Repair',       icon: '🏥' },
  { label: 'Joint Replacement',   icon: '🦴' },
  { label: 'Cosmetic Surgery',    icon: '✨' },
  { label: 'Dental Surgery',      icon: '🦷' },
  { label: 'Other',               icon: '📝' },
];

const DEFAULT_COMPLICATIONS = [
  { label: 'Infection',                   icon: '🦠' },
  { label: 'Excessive bleeding',          icon: '🩸' },
  { label: 'Poor healing',                icon: '🩹' },
  { label: 'Anesthesia complications',    icon: '💉' },
  { label: 'Other',                       icon: '📝' },
];

function Pill({ item, isSelected, onToggle, accent = '#22c55e' }) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(item.label)}
      whileTap={{ scale: 0.96 }}
      className="relative flex items-center gap-2.5 rounded-2xl px-4 py-3 text-left transition-all duration-150 min-h-[52px]"
      style={{
        background: isSelected
          ? `rgba(${accent === '#22c55e' ? '34,197,94' : '212,175,55'},0.10)`
          : 'rgba(255,255,255,0.04)',
        border: isSelected
          ? `2px solid ${accent}`
          : '1px solid rgba(255,255,255,0.10)',
        outline: 'none',
      }}
    >
      {item.icon && (
        <span className="text-lg flex-shrink-0" style={{ lineHeight: 1 }}>{item.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight"
          style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.70)' }}>
          {item.label}
        </p>
        {item.desc && (
          <p className="text-xs mt-0.5 leading-tight"
            style={{ color: isSelected ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.35)' }}>
            {item.desc}
          </p>
        )}
      </div>
      {isSelected && (
        <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: accent }}>
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
}

/**
 * @param {{
 *   selected?: string[],
 *   onChange: function,
 *   options?: Array<{label: string, icon?: string, desc?: string, common?: boolean}>,
 *   title?: string,
 *   hint?: string,
 *   exclusive?: string[],
 *   multiSelect?: boolean,
 *   accent?: string
 * }} props
 */
export default function MedicalHistoryPills({
  selected = [],
  onChange,
  options = DEFAULT_CONDITIONS,
  title = null,
  hint = null,
  exclusive = ['None'],
  multiSelect = true,
  accent = '#22c55e',
}) {
  function toggle(label) {
    if (!multiSelect) {
      onChange(selected.includes(label) ? [] : [label]);
      return;
    }
    // "None" deselects everything else; selecting anything else removes "None"
    if (exclusive.includes(label)) {
      onChange(selected.includes(label) ? [] : [label]);
    } else {
      const without = selected.filter(s => !exclusive.includes(s));
      if (without.includes(label)) {
        onChange(without.filter(s => s !== label));
      } else {
        onChange([...without, label]);
      }
    }
  }

  return (
    <div>
      {title && (
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
      )}
      {hint && (
        <p className="text-xs text-white/45 mb-3">{hint}</p>
      )}
      {!title && !hint && (
        <p className="text-xs text-white/45 mb-3">
          Tap all that apply — or tap <strong className="text-white/60">None</strong> if you have no conditions.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(item => (
          <Pill
            key={item.label}
            item={item}
            isSelected={selected.includes(item.label)}
            onToggle={toggle}
            accent={accent}
          />
        ))}
      </div>
      {selected.length > 0 && !exclusive.includes(selected[0]) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} />
          <p className="text-xs" style={{ color: '#4ade80' }}>
            Selected: <strong>{selected.join(', ')}</strong>
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Named exports for the different pill sets
export { DEFAULT_CONDITIONS, DEFAULT_SURGERIES, DEFAULT_COMPLICATIONS };
