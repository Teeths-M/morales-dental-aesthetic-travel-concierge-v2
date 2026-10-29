import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationStatusBadge from '@/components/incidents/NotificationStatusBadge';
import IncidentTimeline from '@/components/incidents/IncidentTimeline';
import { format } from 'date-fns';

/**
 * IncidentConsole — the minimal admin console for the dispatch machine.
 *
 * Strictly an observer plus two explicit, admin-gated controls. It cannot
 * accept an offer, alter a ranking, or close an incident by hand, because
 * doing those from a UI is exactly the kind of manual override this state
 * machine exists to avoid.
 */
const INCIDENT_TONE = {
  OPEN: 'text-amber-700',
  DISPATCHING: 'text-blue-700',
  ASSIGNED: 'text-emerald-700',
  EN_ROUTE: 'text-emerald-700',
  ARRIVED: 'text-emerald-700',
  UNRESOLVED: 'text-red-700',
  RESOLVED: 'text-muted-foreground',
  DUPLICATE_SUPPRESSED: 'text-muted-foreground',
};

export default function IncidentConsole() {
  const [incidents, setIncidents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadList = useCallback(async () => {
    const rows = await base44.entities.Incident.filter({}, '-created_date', 50).catch(() => []);
    setIncidents(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (incidentId) => {
    if (!incidentId) return;
    const res = await base44.functions.invoke('getIncidentRecovery', { incident_id: incidentId });
    setDetail(res?.data ?? res);
  }, []);

  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  const runSweep = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await base44.functions.invoke('sweepDispatchOffers', {});
      setNotice('Timeout sweep ran.');
      await loadList();
      await loadDetail(selectedId);
    } catch (error) {
      setNotice(`Sweep failed: ${String(error?.message || error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Emergency dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic state machine. Notifications fan out in parallel; offers go out one at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={runSweep}
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run timeout sweep'}
        </button>
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Incidents</CardTitle></CardHeader>
          <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
            {loading && <p className="p-2 text-sm text-muted-foreground">Loading…</p>}
            {!loading && incidents.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No incidents recorded.</p>
            )}
            {incidents.map((incident) => (
              <button
                key={incident.id}
                type="button"
                onClick={() => setSelectedId(incident.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary ${selectedId === incident.id ? 'bg-secondary' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{incident.type}</span>
                  <span className={`text-xs font-semibold ${INCIDENT_TONE[incident.status] || ''}`}>{incident.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {incident.location_label || 'no location'} · {incident.created_date ? format(new Date(incident.created_date), 'dd MMM HH:mm') : ''}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!detail && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Select an incident to inspect it.</CardContent></Card>
          )}

          {detail && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {detail.incident?.type} · {detail.incident?.status}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Triggered: {detail.incident?.triggered_at ? format(new Date(detail.incident.triggered_at), 'dd MMM yyyy HH:mm:ss') : '—'} ({detail.incident?.triggered_at_source})</span>
                    <span>Country: {detail.incident?.country_code || 'none'}</span>
                    <span>Trigger: {detail.incident?.trigger_source}</span>
                    <span>Policy: {detail.incident?.policy_missing ? 'MISSING' : `v${detail.incident?.policy_snapshot?.version || '—'}`}</span>
                    {detail.incident?.unresolved_reason && (
                      <span className="col-span-2 text-red-700">Unresolved: {detail.incident.unresolved_reason}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notification fanout</h3>
                    <ul className="space-y-1">
                      {(detail.notifications || []).map((n) => (
                        <li key={n.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium">{n.recipient_role}</span>
                          <span className="text-xs text-muted-foreground">{n.channel}</span>
                          <NotificationStatusBadge status={n.status} />
                          {n.failure_reason && <span className="text-xs text-red-600">{n.failure_reason}</span>}
                        </li>
                      ))}
                      {(detail.notifications || []).length === 0 && (
                        <li className="text-xs text-muted-foreground">No notifications.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offers (sequential)</h3>
                    <ul className="space-y-1">
                      {(detail.offers || []).map((o) => (
                        <li key={o.id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium">#{o.attempt_number} {o.display_name}</span>
                          <span className="text-muted-foreground">tier {o.verification_tier}</span>
                          <span className="text-muted-foreground">
                            {o.eta_seconds ? `${Math.round(o.eta_seconds / 60)} min` : 'ETA unknown'}
                          </span>
                          <span className="font-semibold">{o.status}</span>
                        </li>
                      ))}
                      {(detail.offers || []).length === 0 && (
                        <li className="text-xs text-muted-foreground">No offers made.</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Audit timeline</CardTitle></CardHeader>
                <CardContent>
                  <IncidentTimeline timeline={detail.timeline || []} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}