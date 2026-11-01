import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import MSafeThemeScope from '@/components/mobile/MSafeThemeScope';
import MSafeText from '@/components/mobile/MSafeText';
import ConfirmPanel from '@/components/emergency-incident/ConfirmPanel';
import ReadinessBanner from '@/components/emergency-incident/ReadinessBanner';
import LocationIntegrityCard from '@/components/emergency-incident/LocationIntegrityCard';
import RecipientStatusList from '@/components/emergency-incident/RecipientStatusList';
import TransportPanel from '@/components/emergency-incident/TransportPanel';
import ClosurePanel from '@/components/emergency-incident/ClosurePanel';

/**
 * EmergencyResponse — the M-Safe incident screen.
 *
 * Ordered by what a frightened person needs next: is help actually coming,
 * where do they think I am, who has been told, how do I get out of here, and
 * only then how do I end this. Every status on it is rendered literally; nothing
 * on this screen upgrades a message into a response.
 *
 * SAMPLE DATA BELOW IS LOCAL TO THIS FILE. It exists so the screen renders with
 * its real structure before the incident service is wired, and it is labelled as
 * a sample on screen — it is never presented as a live emergency.
 */

const SAMPLE = {
  incident_ref: 'MC-SAMPLE',
  status: 'DISPATCHING',
  type: 'security',
  confirmed_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  response_capability: 'unconfirmed',
  response_blockers: [
    'No two-person-approved security team covers this destination',
    'No authorised after-hours contact is configured for the assigned team',
  ],
  readiness: { team_name: 'Coverage not configured', operational_hours: null, response_time_assumption_minutes: null },
  emergency_number: '911',
  location: {
    source: 'network',
    latitude: 10.6549,
    longitude: -61.5019,
    accuracy_m: 1800,
    captured_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    freshness: 'current',
  },
  location_label: 'Port of Spain',
  recipients: [
    {
      id: 'r1',
      recipient_role: 'care_team',
      recipient_name: 'M-Care duty coordinator',
      channel: 'email',
      state: 'DELIVERED',
      queued_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      acknowledgement_deadline_at: new Date(Date.now() + 90 * 1000).toISOString(),
    },
    {
      id: 'r2',
      recipient_role: 'guardian',
      recipient_name: 'Emergency contact',
      channel: 'sms',
      state: 'SENT',
      queued_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      acknowledgement_deadline_at: new Date(Date.now() + 90 * 1000).toISOString(),
    },
    {
      id: 'r3',
      recipient_role: 'responder',
      recipient_name: 'Security team (not assigned)',
      channel: 'app',
      state: 'ESCALATED',
      queued_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      escalated_at: new Date(Date.now() - 60 * 1000).toISOString(),
      failure_reason: 'No operational team covers this destination.',
    },
  ],
  transport: null,
  destinations: [
    { label: 'Hotel — lobby front desk', detail: 'Staffed 24 hours' },
    { label: 'Nearest police station', detail: 'Port of Spain, 1.2 km' },
  ],
  closed_reason: null,
};

export default function EmergencyResponse() {
  const [incident] = useState(SAMPLE);
  const [notice, setNotice] = useState(null);
  const [busy] = useState(false);

  const nowMs = useMemo(() => Date.now(), []);

  const elapsed = useMemo(() => {
    if (!incident?.confirmed_at) return null;
    const mins = Math.max(0, Math.round((nowMs - new Date(incident.confirmed_at).getTime()) / 60000));
    return mins < 1 ? 'just now' : `${mins} min ago`;
  }, [incident?.confirmed_at, nowMs]);

  const sampleOnly = (what) => setNotice(`${what} — sample incident, nothing was sent.`);

  return (
    <MSafeThemeScope active className="min-h-screen bg-msafe-canvas pb-16">
      <div className="mx-auto w-full max-w-xl px-4 pt-5">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] text-msafe-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-msafe-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-msafe-gold" aria-hidden="true" />
            M-Safe
          </span>
        </div>

        <header className="mt-4">
          <h1 className="font-display text-[26px] leading-tight text-msafe-ink">
            {incident?.confirmed_at ? 'Emergency response' : 'Emergency help'}
          </h1>
          <p className="mt-1 text-[12.5px] text-msafe-muted">
            {incident?.confirmed_at
              ? `Opened ${elapsed} · ${incident.incident_ref}`
              : 'Nothing has been alerted yet.'}
          </p>
        </header>

        <div className="mt-3 rounded-xl border border-msafe-warn/35 bg-msafe-warn/10 px-3.5 py-2.5">
          <p className="text-[11px] leading-relaxed text-msafe-warn">
            Sample incident — this screen is showing example data. No alerts were sent.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {!incident?.confirmed_at ? (
            <ConfirmPanel onConfirm={() => sampleOnly('Alert confirmed')} busy={busy} />
          ) : (
            <>
              <ReadinessBanner
                capability={incident.response_capability}
                blockers={incident.response_blockers}
                readiness={incident.readiness}
                emergencyNumber={incident.emergency_number}
              />

              <LocationIntegrityCard location={incident.location} label={incident.location_label} />

              <RecipientStatusList recipients={incident.recipients} nowMs={nowMs} />

              <TransportPanel
                transport={incident.transport}
                options={incident.destinations}
                onRequest={() => sampleOnly('Transport requested')}
                busy={busy}
              />

              <ClosurePanel
                onResolve={() => sampleOnly('Incident closed')}
                busy={busy}
                closedReason={incident.closed_reason}
              />
            </>
          )}
        </div>

        {notice && (
          <p className="mt-4 rounded-xl border border-msafe-border bg-msafe-raised px-3.5 py-2.5 text-[11.5px] text-msafe-muted">
            {notice}
          </p>
        )}

        <MSafeText variant="meta" className="mt-6">
          Every state on this screen is written by the server. A message that was sent is never
          shown as an answer, and an incident is never deleted — closing it records why.
        </MSafeText>
      </div>
    </MSafeThemeScope>
  );
}