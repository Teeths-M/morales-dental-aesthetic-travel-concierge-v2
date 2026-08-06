import React from 'react';

/**
 * MedicalHistoryShareConsent — M-Care super-agent Phase 4B. A SEPARATE,
 * later consent from DataProcessingConsent.jsx's blanket "process my info"
 * agreement captured at the very start of intake. This one is shown at the
 * review step, right after the patient sees exactly what they've disclosed
 * (medical conditions, allergies — see ReviewStep.jsx's REVIEW_FIELDS), and
 * specifically covers sharing THAT medical history with whichever doctor's
 * clinic is assigned to their case — the real gap this closes: previously
 * `assignDoctorToCase` emailed/pushed a doctor full case access the moment
 * SAFE-T passed, with no patient sign-off scoped to that specific act.
 *
 * The checked state is recorded on the Consultation
 * (medical_history_share_consent + timestamp) via buildConsultationPayload
 * (src/lib/intakeFlow/fieldMap.js), same durable/auditable shape as the
 * data-processing consent. assignDoctorToCase refuses to notify a doctor
 * without it — see that function and the MEDICAL CONSENT redteam invariant.
 */
export default function MedicalHistoryShareConsent({ checked, onChange }) {
  return (
    <div
      style={{
        background: 'rgba(212,175,55,0.05)',
        border: '1px solid #2A3F4A',
        borderRadius: 16,
        padding: '16px 18px',
        textAlign: 'left',
        marginTop: 16,
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.62)' }}>
        The medical information above stays private with M until you say otherwise. Before we assign your case to a
        doctor, we need your OK to share it with that doctor's clinic — so they can confirm they're a safe fit for
        your procedure.
      </p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 1, accentColor: '#D4AF37', flexShrink: 0, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.62)' }}>
          I agree to share the medical information above with my assigned doctor's clinic.
        </span>
      </label>
    </div>
  );
}
