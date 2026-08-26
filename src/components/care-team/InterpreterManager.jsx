import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Languages, Flag } from 'lucide-react';

/**
 * InterpreterManager — the spec's InterpreterManager module. Persistent
 * mismatch banner + "Flag this moment" control, grounded in the real HHS
 * Section 1557 language-access standard: machine translation is fine for
 * ordinary conversation, but self-identified bilingual staff or informal
 * translation does not meet the bar for consent/diagnosis/treatment/risk
 * discussion — a qualified human interpreter is required there, and Morales
 * doesn't yet offer one to book in-app (an honest, named v1 gap).
 */
export default function InterpreterManager({ virtualConsultationId, languagesDiffer, patientLanguage, doctorLanguage, onAcknowledged = null }) {
  const [flagging, setFlagging] = useState(false);
  const [flagged, setFlagged] = useState(false);

  if (!languagesDiffer) return null;

  const handleFlag = async () => {
    setFlagging(true);
    try {
      await base44.functions.invoke('flagInterpreterMoment', { virtual_consultation_id: virtualConsultationId });
      setFlagged(true);
      setTimeout(() => setFlagged(false), 4000);
    } catch (_) { /* best-effort */ }
    setFlagging(false);
  };

  return (
    <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Languages size="16" color="#D4AF37" />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Language difference detected</span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.65)' }}>
        You and {doctorLanguage ? 'your doctor' : 'this provider'} speak different languages
        {patientLanguage && doctorLanguage ? ` (${patientLanguage} vs ${doctorLanguage})` : ''}. Machine-translated
        captions can help with general conversation, but for consent, diagnosis, treatment, or risk discussion, a
        qualified human interpreter is required — not a bilingual staff member, not AI translation. Morales doesn't
        yet offer one to book in-app.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {onAcknowledged && (
          <button
            type="button"
            onClick={onAcknowledged}
            style={{ background: '#D4AF37', color: '#060B16', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            I understand
          </button>
        )}
        {virtualConsultationId && (
          <button
            type="button"
            onClick={handleFlag}
            disabled={flagging}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
          >
            <Flag size="13" /> {flagged ? 'Flagged' : 'Flag this moment'}
          </button>
        )}
      </div>
    </div>
  );
}
