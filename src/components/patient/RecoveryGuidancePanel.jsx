import React from 'react';
import { HeartPulse } from 'lucide-react';

const GOLD = '#D4AF37';

/**
 * RecoveryGuidancePanel — patient-facing, read-only view of approved Recovery
 * Wellness Guidance (Phase 1: general wellness only, never specific supplements
 * or doses). Renders ONLY the fields reviewRecoveryGuidance's approve branch
 * copied onto CaseRecord — the same "attach approved content to the case the
 * patient already reads" pattern as SignedConsentPanel.jsx. No direct access to
 * RecoveryGuidanceDraft/RecoveryGuidanceApproval is needed or granted here.
 * Deliberately renders plain text, not dangerouslySetInnerHTML.
 */
export default function RecoveryGuidancePanel({ caseRecord }) {
  if (!caseRecord?.recovery_guidance_text) return null;

  return (
    <div className="rounded-2xl" style={{ background: '#0C1A1D', border: `1px solid ${GOLD}40`, padding: '20px' }}>
      <div className="flex items-center gap-2 mb-3">
        <HeartPulse className="w-4 h-4" style={{ color: GOLD }} />
        <span className="text-sm font-semibold text-white">Your Recovery Wellness Guidance</span>
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {caseRecord.recovery_guidance_text}
      </p>

      <div className="mt-4 pt-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid #1e2d35' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          Reviewed by {caseRecord.recovery_guidance_reviewer_name || 'your care team'}
          {caseRecord.recovery_guidance_reviewer_credential ? `, ${caseRecord.recovery_guidance_reviewer_credential}` : ''}
        </span>
        {caseRecord.recovery_guidance_approved_at && (
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {new Date(caseRecord.recovery_guidance_approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
        This supplements, but does not replace, guidance from your treating physician.
      </p>
    </div>
  );
}
