import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationStatusBadge from '@/components/incidents/NotificationStatusBadge';
import IncidentTimeline from '@/components/incidents/IncidentTimeline';

/**
 * IncidentRecovery — the patient's read-only record of their own emergency.
 *
 * Every notification, offer, acceptance and escalation, each with the moment
 * it actually happened. There is deliberately no control on this page: it is
 * evidence, not an interface.
 */
export default function IncidentRecovery() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getIncidentRecovery', { incident_id: id })
      .then((res) => { if (!cancelled) setData(res?.data ?? res); })
      .catch((err) => { if (!cancelled) setError(String(err?.message || err)); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card><CardContent className="p-6 text-sm text-red-700">{error}</CardContent></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">Loading your emergency record…</p>
      </div>
    );
  }

  const incident = data.incident || {};

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Your emergency record</h1>
        <p className="text-sm text-muted-foreground">
          A permanent, timestamped record of what happened and who was contacted.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{incident.type} · {incident.status}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Raised {incident.triggered_at ? new Date(incident.triggered_at).toLocaleString() : '—'}
            {incident.location_label ? ` near ${incident.location_label}` : ''}
          </p>
          {incident.unresolved_reason && (
            <p className="text-red-700">
              No responder could be reached automatically ({String(incident.unresolved_reason).replace(/_/g, ' ')}). The care team was paged.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Who was contacted</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(data.notifications || []).filter((n) => n.recipient_role !== 'responder').map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium capitalize">{String(n.recipient_role).replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted-foreground">{n.channel}</span>
                <NotificationStatusBadge status={n.status} />
              </li>
            ))}
            {(data.notifications || []).length === 0 && (
              <li className="text-sm text-muted-foreground">No notifications were recorded.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Full timeline</CardTitle></CardHeader>
        <CardContent>
          <IncidentTimeline timeline={data.timeline || []} />
        </CardContent>
      </Card>
    </div>
  );
}