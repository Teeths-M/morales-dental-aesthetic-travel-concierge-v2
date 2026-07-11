import React, { useState } from 'react';
import MedicalHistoryPills, { DEFAULT_CONDITIONS } from '@/components/booking/MedicalHistoryPills';
import { CALM } from '@/lib/brandTokens';

/**
 * Thin adapter — reuses the old wizard's "zero-type" pill picker unmodified
 * rather than forcing a return to free text. Targets Consultation's real
 * `medical_conditions` array (what SAFE-T risk scoring actually reads, see
 * generateSafeTProfile/safeT4LifeScan), not just the `medical_conditions_other`
 * elaboration string the free-text step used to write alone.
 */
export default function ConditionsPickStep({ onContinue }) {
  const [selected, setSelected] = useState([]);
  const [otherText, setOtherText] = useState('');

  const hasOther = selected.includes('Other');

  const handleContinue = () => {
    if (selected.length === 0) return;
    const extracted = { medical_conditions: selected };
    if (hasOther && otherText.trim()) {
      extracted.medical_conditions_other = otherText.trim();
    }
    onContinue({ rawText: selected.join(', '), extracted });
  };

  return (
    <div>
      <MedicalHistoryPills selected={selected} onChange={setSelected} options={DEFAULT_CONDITIONS} accent={CALM.action} />

      {hasOther && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder="Tell us more..."
          style={{
            width: '100%',
            marginTop: 12,
            padding: '14px 16px',
            borderRadius: 14,
            background: CALM.surfaceSoft,
            border: `1px solid ${CALM.border}`,
            color: CALM.text,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

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
          background: selected.length === 0 ? 'rgba(14,138,125,0.35)' : CALM.action,
          border: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Continue
      </button>
    </div>
  );
}
