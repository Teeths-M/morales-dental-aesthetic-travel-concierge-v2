import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getIncidentRecovery — the patient's read-only record of their own emergency.
 *
 * Returns every notification, every offer, every acceptance and every
 * escalation, each with the timestamp of when it actually happened. Strictly
 * read-only: this function performs no writes at all, so opening the page can
 * never advance or alter an incident.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

    const url = new URL(req.url);
    const incidentId = url.searchParams.get('incident_id') || (await req.json().catch(() => ({})))?.incident_id;

    if (!incidentId) return Response.json({ error: 'incident_id is required' }, { status: 400 });

    const incident = await base44.asServiceRole.entities.Incident.get(incidentId).catch(() => null);
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    const owns = incident.patient_email === user.email || incident.patient_id === user.id;
    if (!isAdmin && !owns) return Response.json({ error: 'Not permitted' }, { status: 403 });

    const [notifications, offers, audit] = await Promise.all([
      base44.asServiceRole.entities.IncidentNotification.filter({ incident_id: incidentId }, 'queued_at', 200).catch(() => []),
      base44.asServiceRole.entities.DispatchOffer.filter({ incident_id: incidentId }, 'attempt_number', 50).catch(() => []),
      base44.asServiceRole.entities.IncidentAuditEvent.filter({ incident_id: incidentId }, 'sequence', 500).catch(() => []),
    ]);

    // One merged timeline. Timestamps are the ones actually recorded — for a
    // queued offline action that is the original moment, not the flush.
    const timeline = [
      ...(notifications as any[]).map((n) => ({
        at: n.sent_at || n.queued_at,
        kind: 'notification',
        label: `${n.recipient_role} · ${n.channel}`,
        status: n.status,
        detail: n.failure_reason || null,
      })),
      ...(offers as any[]).map((o) => ({
        at: o.accepted_at || o.responded_at || o.offered_at,
        kind: 'offer',
        label: `Responder ${o.attempt_number}: ${o.display_name}`,
        status: o.status,
        detail: o.eta_seconds ? `about ${Math.round(o.eta_seconds / 60)} min away` : o.eta_source,
      })),
      ...(audit as any[]).map((a) => ({
        at: a.timestamp,
        kind: 'audit',
        label: `${a.subject_type}: ${a.from_state || '—'} → ${a.to_state}`,
        status: a.to_state,
        detail: a.actor,
      })),
    ]
      .filter((t) => !!t.at)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return Response.json({
      incident,
      notifications,
      offers,
      audit,
      timeline,
    });
  } catch (error) {
    console.error('[getIncidentRecovery]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});