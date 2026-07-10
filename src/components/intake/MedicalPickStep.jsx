import React, { useState } from 'react';
import MedicalHistoryPills from '@/components/booking/MedicalHistoryPills';

const GOLD = '#D4AF37';
const BORDER = '#2A3F4A';

/**
 * MedicalPickStep — one reusable conversational step for the safety-critical
 * medical-history questions the /intake flow previously skipped (current
 * medications, anesthesia-complication history, prior surgeries). Mirrors the
 * exact Consultation fields the detailed /booking wizard writes, so both
 * flows capture identical medical history for the reviewing doctor.
 *
 * Driven entirely by `config` (set per-step in questionGraph.js):
 *   options        — pill options [{label, icon}]
 *   noneLabel      — the exclusive "nothing applies" pill (deselects the rest)
 *   flagField      — boolean Consultation field: true when any non-None pill is
 *                    selected, false when the noneLabel pill is selected
 *   arrayField     — array Consultation field: the selected pill labels (minus None)
 *   primaryField   — optional string field set to the FIRST selected pill
 *                    (the wizard stores previous_procedures as a single value)
 *   notesField     — optional free-text Consultation field
 *   notesLabel     — label shown above the notes box (when any non-None selected)
 *   notesPlaceholder
 */
export default function MedicalPickStep({ config, onContinue }) {
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');

  const {
    options,
    noneLabel,
    flagField,
    arrayField = null,
    primaryField = null,
    notesField = null,
    notesLabel = 'Anything you would like to add?',
    notesPlaceholder = '',
  } = config;

  const chosen = selected.filter((s) => s !== noneLabel);
  const saidNone = selected.includes(noneLabel);
  const hasPositive = chosen.length > 0;
  const canContinue = hasPositive || saidNone; // must answer one way or the other

  const handleContinue = () => {
    if (!canContinue) return;
    const extracted = {};
    if (flagField) extracted[flagField] = hasPositive;
    if (arrayField) extracted[arrayField] = chosen;
    if (primaryField) extracted[primaryField] = chosen[0] || '';
    if (notesField && notes.trim()) extracted[notesField] = notes.trim();
    onContinue({ rawText: selected.join(', '), extracted });
  };

  return (
    <div>
      <MedicalHistoryPills
        selected={selected}
        onChange={setSelected}
        options={options}
        exclusive={[noneLabel]}
        accent={GOLD}
      />

      {notesField && hasPositive && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{notesLabel}</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={notesPlaceholder}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${BORDER}`,
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '13px 20px',
          borderRadius: 999,
          cursor: canContinue ? 'pointer' : 'default',
          background: canContinue ? GOLD : 'rgba(212,175,55,0.3)',
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
