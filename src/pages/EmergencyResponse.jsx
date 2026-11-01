import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MSafeThemeScope from '@/components/mobile/MSafeThemeScope';
import MSafeText from '@/components/mobile/MSafeText';
import MSafeCard from '@/components/mobile/MSafeCard';
import ConfirmPanel from '@/components/emergency-incident/ConfirmPanel';
import ReadinessBanner from '@/components/emergency-incident/ReadinessBanner';
import LocationIntegrityCard from '@/components/emergency-incident/LocationIntegrityCard';
import RecipientStatusList from '@/components/emergency-incident/RecipientStatusList';
import TransportPanel from '@/components/emergency-incident/TransportPanel';
import ClosurePanel from '@/components/emergency-incident/ClosurePanel';

const DESTINATIONS = [
  { label: 'Nearest hospital', detail: 'We confirm which one with you' },
  { label: 'Local police station', detail: 'For a safety incident' },
  { label: 'My accommodation', detail: 'Where you are staying' },
];

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve({ source: 'none' });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        source: 'gps',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        captured_at: new Date(pos.timestamp).toISOString(),
      }),
      () => resolve({ source: 'none' }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * EmergencyResponse — the live M-Safe incident screen.
 *
 * Every value on it comes from the server: capability, blockers, location
 * freshness, each recipient's own state. Nothing is upgraded client-side. If the
 * server says security response is not confirmed, this screen says exactly that
 * and offers the local emergency number instead.
 */
export default function EmergencyResponse() {
  const [params] = useSearchParams();
  const routeParams = useParams();
  const incidentId = params.get('incident');
  // A responder or guardian arrives at /respond/<token> with no account at all.
  const ackToken = params.get('ack') || routeParams?.token;

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(Boolean(incidentId || ackToken));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!incidentId && !ackToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await base44.functions.invoke('getEmergencyIncident', {
        incident_id: incidentId || undefined,
        ack_token: ackToken || undefined,
      });
      setState(res.data);
      setError(null);
    } catch (e) {
      setError('This alert could not be loaded. If you are in danger, call your local emergency number.');
    } finally {
      setLoading(false);
    }
  }, [incidentId, ackToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const incident = state?.incident || null;

  const elapsed = useMemo(() => {
    if (!incident?.confirmed_at) return null;
    const mins = Math.max(0, Math.round((Date.now() - new Date(incident.confirmed_at).getTime()) / 60000));
    return mins < 1 ? 'just now' : `${mins} min ago`;
  }, [incident?.confirmed_at]);

  const transport = state?.transport;
  const recipients = (state?.recipients || []).map((r) => ({ ...r, state: r.status }));

  const locationForCard = incident
    ? {
      source: incident.location_source,
      freshness: state?.location?.freshness || incident.location_freshness,
      latitude: incident.latitude,
      longitude: incident.longitude,
      accuracy_m: incident.location_accuracy_m,
      captured_at: incident.location_captured_at,
    }
    : null;

  const confirm = async (payload) => {
    setBusy(true);
    setNotice(null);
    try {
      const location = await getPosition();
      const res = await base44.functions.invoke('confirmEmergencyIncident', {
        ...payload,
        location,
        country_code: params.get('country') || undefined,
        case_id: params.get('case') || undefined,
        location_label: params.get('area') || undefined,
      });
      setNotice(res.data?.message || 'Alert sent.');
      const id = res.data?.incident?.id;
      if (id) {
        const url = new URL(window.location.href);
        url.searchParams.set('incident', id);
        window.history.replaceState({}, '', url.toString());
      }
      await load();
    } catch (e) {
      setNotice(e?.response?.data?.error || 'The alert could not be sent. Call your local emergency number now.');
    } finally {
      setBusy(false);
    }
  };

  const requestTransport = async (option) => {
    if (!incident) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageIncidentTransport', {
        incident_id: incident.id,
        action: 'set_destination',
        destination_label: option?.label,
        destination_address: option?.detail,
        destination_source: 'traveller_selected',
      });
      setNotice(res.data?.message || 'Destination confirmed.');
      await load();
    } catch (e) {
      setNotice('The destination could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  const resolveIncident = async (key, note) => {
    if (!incident) return;
    setBusy(true);
    try {
      if (key === 'handover') {
        const res = await base44.functions.invoke('resolveEmergencyIncident', {
          incident_id: incident.id,
          action: 'handover',
          handover_to: 'M-Care duty coordinator',
          notes: note,
        });
        setNotice('Handed to a coordinator. The incident stays open until they close it.');
      } else {
        const res = await base44.functions.invoke('resolveEmergencyIncident', {
          incident_id: incident.id,
          action: 'close',
          reason: key,
          notes: note,
        });
        const stood = res.data?.stood_down || 0;
        setNotice(`Closed. ${stood > 0 ? `${stood} responder(s) were told to stand down.` : 'No one needed standing down.'}`);
      }
      await load();
    } catch (e) {
      setNotice(e?.response?.data?.error || 'This could not be closed. Try again, or call the care team.');
    } finally {
      setBusy(false);
    }
  };

  const hasIncident = Boolean(incident);

  return (
    <MSafeThemeScope active className="min-h-screen bg-msafe-canvas pb-16">
      <div className="mx-auto w-full max-w-xl px-4 pt-5">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] text-msafe-muted">
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
            {hasIncident ? 'Emergency response' : 'Emergency help'}
          </h1>
          <p className="mt-1 text-[12.5px] text-msafe-muted">
            {hasIncident
              ? `Opened ${elapsed} · ${incident.incident_ref || ''}`
              : 'Nothing has been alerted yet.'}
          </p>
        </header>

        {loading && (
          <MSafeCard className="mt-4">
            <p className="text-[12.5px] text-msafe-muted">Loading this alert…</p>
          </MSafeCard>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-msafe-critical/40 bg-msafe-critical/10 px-3.5 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-msafe-critical">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="mt-4 space-y-3">
            {!hasIncident ? (
              <ConfirmPanel onConfirm={confirm} busy={busy} />
            ) : (
              <>
                <ReadinessBanner
                  capability={incident.response_capability}
                  blockers={incident.response_blockers || []}
                  readiness={state?.readiness}
                  emergencyNumber={incident.policy_snapshot?.emergency_number}
                />

                <LocationIntegrityCard location={locationForCard} label={incident.location_label} />

                <RecipientStatusList recipients={recipients} nowMs={nowMs} />

                <TransportPanel
                  transport={transport}
                  options={DESTINATIONS}
                  onRequest={requestTransport}
                  busy={busy}
                />

                <ClosurePanel
                  onResolve={resolveIncident}
                  busy={busy}
                  closedReason={incident.closed_reason}
                />
              </>
            )}
          </div>
        )}

        {notice && (
          <p className="mt-4 rounded-xl border border-msafe-border bg-msafe-raised px-3.5 py-2.5 text-[11.5px] text-msafe-ink">
            {notice}
          </p>
        )}

        <MSafeText variant="meta" className="mt-6">
          Every state here is written by the server. A message that was sent is never shown as an
          answer, and an incident is never deleted — closing it records why.
        </MSafeText>
      </div>
    </MSafeThemeScope>
  );
}