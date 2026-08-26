import React from 'react';
import CaseThread from '@/components/quotes/CaseThread';

/**
 * ConsultationSummary — the spec's ConsultationSummary module. Shows the
 * doctor's real written plan and an honest "not available yet" state for AI
 * notes (no real transcript source exists even as a dormant scaffold — see
 * CLAUDE.md's "Explicitly deferred" list). Reuses CaseThread unmodified for
 * the real async Care Room when a case exists.
 */
export default function ConsultationSummary({ virtualConsultation }) {
  const vc = virtualConsultation || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Clinician's written plan</p>
        {vc.doctor_plan_summary ? (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{vc.doctor_plan_summary}</p>
            {vc.doctor_plan_included?.length > 0 && (
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Included: {vc.doctor_plan_included.join(', ')}
              </p>
            )}
            {vc.doctor_plan_excluded?.length > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Not included: {vc.doctor_plan_excluded.join(', ')}
              </p>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>
            Your doctor hasn't submitted a written plan yet.
          </p>
        )}
      </div>

      <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#fff' }}>AI note-taking summary</p>
        <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>
          Not available yet — this depends on a real call transcript, which isn't wired up in this version.
        </p>
      </div>

      {vc.case_id && (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Care Room</p>
          <CaseThread caseId={vc.case_id} theme="dark" />
        </div>
      )}
    </div>
  );
}
