/**
 * generateSafetyIncidentReport
 * Compiles a wilderness/SOS incident timeline report with AI narrative synthesis.
 * Does NOT include sensitive medical/vault data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../_shared/auditHashChain.ts';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

async function aiIncidentNarrative(params: {
  patientName: string; sosType: string; resolution: string | null;
  timeline: Array<{ time: string; event: string; details: string }>;
}): Promise<string | null> {
  if (!ANTHROPIC_KEY || !params.timeline.length) return null;
  const events = params.timeline.slice(0, 12).map(e => `[${e.time}] ${e.event}: ${e.details}`).join('\n');
  const prompt = `Safety incident analyst for medical travel concierge. Incident for patient "${params.patientName}". SOS type: ${params.sosType || 'unknown'}. Resolution: ${params.resolution || 'pending'}.
Timeline:\n${events}

Write a 3-sentence incident summary: (1) what happened, (2) how the response chain performed, (3) one concrete protocol recommendation. Plain text, no headers.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 160, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { sos_event_id, case_id, patient_email } = await req.json();
    if (!sos_event_id && !patient_email) {
      return Response.json({ error: 'sos_event_id or patient_email required.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Gather all incident data in parallel
    const [sosEvents, activitySessions, breadcrumbs, notifLogs, auditLogs] = await Promise.allSettled([
      sos_event_id
        ? base44.asServiceRole.entities.SOSEvent.filter({}, '-triggered_at', 50)
        : Promise.resolve([]),
      patient_email
        ? base44.asServiceRole.entities.ActivitySession.filter({ patient_email }, '-created_date', 20)
        : Promise.resolve([]),
      patient_email && case_id
        ? base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id, patient_email }, '-logged_at', 20)
        : Promise.resolve([]),
      patient_email
        ? base44.asServiceRole.entities.NotificationLog.filter(
            case_id ? { case_id } : {}, '-created_at', 30
          )
        : Promise.resolve([]),
      case_id
        ? base44.asServiceRole.entities.AuditLog.filter({ case_id }, '-timestamp', 20)
        : Promise.resolve([]),
    ]);

    const sosEvent = (sosEvents.value || []).find(e => e.id === sos_event_id) ||
                    (sosEvents.value || [])[0] || null;

    const timeline = [];

    // Activity session start
    for (const session of (activitySessions.value || [])) {
      if (session.scheduled_start_at) {
        timeline.push({
          time: session.scheduled_start_at,
          event: 'Activity Started',
          details: `${session.activity_name} at ${session.location || 'unknown location'} — Risk: ${session.risk_level}`,
        });
      }
    }

    // SOS event
    if (sosEvent) {
      timeline.push({
        time: sosEvent.triggered_at || now,
        event: 'SOS Triggered',
        details: `Type: ${sosEvent.trigger_type} | Location: ${
          sosEvent.latitude ? `${sosEvent.latitude.toFixed(5)}, ${sosEvent.longitude.toFixed(5)}` : 'No GPS'
        } | Status: ${sosEvent.status}`,
      });
    }

    // Breadcrumbs
    for (const crumb of (breadcrumbs.value || [])) {
      timeline.push({
        time: crumb.logged_at,
        event: 'Location Breadcrumb',
        details: `${crumb.place_label || `${crumb.latitude}, ${crumb.longitude}`} — ${crumb.source}`,
      });
    }

    // Notifications
    for (const log of (notifLogs.value || [])) {
      timeline.push({
        time: log.created_at,
        event: 'Notification Sent',
        details: `${log.channel?.toUpperCase()} → ${log.message_type} — Status: ${log.status}`,
      });
    }

    // Sort timeline
    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // AI narrative synthesis — what happened, how the response chain performed, one recommendation
    const narrative_analysis = await aiIncidentNarrative({
      patientName: sosEvent?.patient_name || patient_email || 'Unknown',
      sosType: sosEvent?.trigger_type || 'unknown',
      resolution: sosEvent?.resolution_notes || null,
      timeline,
    });

    const report = {
      generated_at: now,
      generated_by: user.email,
      sos_event_id: sos_event_id || null,
      case_id: case_id || null,
      patient_email: patient_email || sosEvent?.patient_email,
      patient_name: sosEvent?.patient_name || 'Unknown',
      sos_status: sosEvent?.status || 'unknown',
      coordinates: sosEvent?.latitude
        ? { latitude: sosEvent.latitude, longitude: sosEvent.longitude }
        : null,
      google_maps_url: sosEvent?.latitude
        ? `https://www.google.com/maps/search/?api=1&query=${sosEvent.latitude},${sosEvent.longitude}`
        : null,
      notifications_sent: sosEvent?.notifications_sent || [],
      resolution_notes: sosEvent?.resolution_notes || null,
      resolved_at: sosEvent?.resolved_at || null,
      timeline,
      narrative_analysis,
      note: 'This report does not include sensitive medical, vault, or financial data.',
    };

    // Log this report generation
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'data_export',
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name,
      resource_type: 'SOSEvent',
      resource_id: sos_event_id || '',
      case_id: case_id || '',
      details: { action: 'incident_report_generated', sos_event_id },
      sensitive: false,
      timestamp: now,
      prev_hash: await computePrevHash(base44),
    }).catch(() => {});

    return Response.json({ report, success: true });

  } catch (error) {
    console.error('[generateSafetyIncidentReport]', error);
    return Response.json({ error: 'Internal error generating report.' }, { status: 500 });
  }
});