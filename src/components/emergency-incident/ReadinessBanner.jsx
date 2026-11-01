import React from 'react';
import { AlertTriangle, CheckCircle2, Phone, ShieldAlert } from 'lucide-react';
import MSafeCard from '@/components/mobile/MSafeCard';
import MSafeText from '@/components/mobile/MSafeText';
import { capabilityCopy, toneSurface, toneText } from '@/lib/emergencyIncidentUi';

/**
 * ReadinessBanner — the one place the screen states whether an external
 * security response actually exists.
 *
 * It is driven entirely by server-evaluated capability, never by whether a
 * message was sent: a sent message is a sent message. The blockers are printed
 * verbatim so the traveller is never told "not confirmed" without being told
 * why, and the local emergency number is always offered as the supported route.
 */
export default function ReadinessBanner({ capability, blockers = [], readiness, emergencyNumber }) {
  const copy = capabilityCopy(capability);
  const Icon = capability === 'confirmed' ? CheckCircle2 : capability === 'unconfirmed' ? ShieldAlert : AlertTriangle;

  return (
    <div className={`rounded-2xl border px-5 py-4 ${toneSurface(copy.tone)}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneText(copy.tone)}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold ${toneText(copy.tone)}`}>{copy.label}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-msafe-muted">{copy.sentence}</p>

          {blockers.length > 0 && (
            <ul className="mt-3 space-y-1">
              {blockers.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-msafe-muted">
                  <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-msafe-muted" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {readiness && capability === 'confirmed' && (
            <p className="mt-3 text-[11px] text-msafe-muted">
              {readiness.team_name}
              {readiness.operational_hours ? ` · ${readiness.operational_hours}` : ''}
              {readiness.response_time_assumption_minutes
                ? ` · assumed ${readiness.response_time_assumption_minutes} min response`
                : ''}
            </p>
          )}

          {capability !== 'confirmed' && emergencyNumber && (
            <a
              href={`tel:${String(emergencyNumber).replace(/[^0-9+]/g, '')}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-msafe-critical/50 bg-msafe-critical/10 px-3.5 py-2 text-[12px] font-semibold text-msafe-critical"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              Call local emergency services ({emergencyNumber})
            </a>
          )}
        </div>
      </div>
    </div>
  );
}