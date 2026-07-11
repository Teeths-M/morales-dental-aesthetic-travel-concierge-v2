import React, { useState } from 'react';
import { CALM } from '@/lib/brandTokens';

const TEAL = CALM.action;
const BORDER = CALM.border;

/**
 * Lets a patient select more than one procedure in a single beat — the
 * precondition for Morales's core "wow moment": narrating that it's
 * evaluating whether the combination is safe (ProcedureEvaluationStep,
 * reusing the same procedureCompatibility engine every other cart-driven
 * flow in the app relies on) rather than silently accepting whatever was
 * picked.
 */
export default function MultiProcedureStep({ options, onContinue }) {
  const [selected, setSelected] = useState([]);

  const toggle = (opt) => {
    setSelected((prev) =>
      prev.some((s) => s.value === opt.value) ? prev.filter((s) => s.value !== opt.value) : [...prev, opt]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    const labels = selected.map((s) => s.label).join(', ');
    onContinue({
      rawText: labels,
      extracted: {
        procedure_interest: selected[0].value,
        selected_procedures: selected.map((s) => s.value),
      },
    });
  };

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {selected.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggle(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                background: CALM.actionSoft,
                border: `1px solid ${TEAL}`,
                color: TEAL,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.label} <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
        {options.map((opt) => {
          const isSelected = selected.some((s) => s.value === opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                textAlign: 'left',
                padding: '13px 16px',
                borderRadius: 14,
                background: isSelected ? CALM.actionSoft : CALM.surfaceSoft,
                border: `1px solid ${isSelected ? TEAL : BORDER}`,
                color: CALM.text,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {opt.label}
              {isSelected && <span style={{ color: TEAL, fontWeight: 700 }}>✓</span>}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={selected.length === 0}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '13px 20px',
          borderRadius: 999,
          cursor: selected.length === 0 ? 'default' : 'pointer',
          background: selected.length === 0 ? 'rgba(14,138,125,0.35)' : TEAL,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {selected.length > 1 ? `Continue with ${selected.length} procedures` : 'Continue'}
      </button>
    </div>
  );
}
