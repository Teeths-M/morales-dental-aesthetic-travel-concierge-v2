import React, { useState } from 'react';
import MedicalHistoryPills, { DEFAULT_CONDITIONS } from '@/components/booking/MedicalHistoryPills';

const GOLD = '#D4AF37';
const BORDER = '#2A3F4A';

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
      <MedicalHistoryPills selected={selected} onChange={setSelected} options={DEFAULT_CONDITIONS} accent={GOLD} />

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
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER}`,
            color: '#fff',
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
          background: selected.length === 0 ? 'rgba(212,175,55,0.3)' : GOLD,
          border: 'none',
          color: '#060B16',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Continue
      </button>
    </div>
  );
}
