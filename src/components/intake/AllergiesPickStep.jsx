import React, { useState } from 'react';
import SmartAllergyInput from '@/components/booking/SmartAllergyInput';

const GOLD = '#D4AF37';

/**
 * Thin adapter — reuses the old wizard's "zero-type" allergy picker
 * unmodified (tap-to-add pills + fuzzy autocomplete + free-text fallback,
 * all already self-contained in SmartAllergyInput). Targets Consultation's
 * real `allergies` array (what SAFE-T risk scoring actually reads), not
 * just the `allergy_details` elaboration string the free-text step used to
 * write alone. Custom-typed allergies already land directly in the array
 * via SmartAllergyInput's own free-text layer, so there's no separate
 * "Other" text field needed here — matches the old wizard's own
 * Section5Anesthesia.jsx, which doesn't populate allergy_details either.
 */
export default function AllergiesPickStep({ onContinue }) {
  const [selected, setSelected] = useState([]);

  const handleContinue = () => {
    if (selected.length === 0) return;
    onContinue({ rawText: selected.join(', '), extracted: { allergies: selected } });
  };

  return (
    <div>
      <SmartAllergyInput selected={selected} onChange={setSelected} />

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
