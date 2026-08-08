// @ts-nocheck
// Family Portal feed — token-gated (no user login). Returns the journey
// notifications timeline (milestones, check-ins, escalations, status changes)
// plus the guardian↔M-Care↔traveler message thread, for a GuardianSession.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

const MILESTONE_LABELS: Record<string, string> = {
  landed: 'Landed safely',
  arrived_at_hotel: 'Arrived at hotel',
  pre_procedure: 'Pre-procedure check-in',
  post_procedure: 'Procedure complete',
  departure: 'Departing for home',
  home_safe: 'Home safe',
};

Deno.serve(createHandler(async ({ req }) => {
  const base44 = createClientFromRequest(req);
  const { token } = await req.json().catch(() => ({}));
  if (!token) return Response.json({ status: 'invalid', error: 'Token required' });

  // Validate session (service role — public endpoint)
  const sessions = await base44.asServiceRole.entities.GuardianSession.filter({ view_token: token });
  const session = sessions?.[0];
  if (!session) return Response.json({ status: 'invalid', error: 'This guardian link does not exist.' });
  if (!session.is_active) return Response.json({ status: 'revoked', error: 'This guardian link has been revoked.' });
  if (!session.expires_at || new Date(session.expires_at) < new Date()) {
    return Response.json({ status: 'expired', error: 'This guardian link has expired.' });
  }

  const caseId = session.case_id;
  const notifs: any[] = [];

  // 1. SoloCheckIns — milestones + acknowledgements + escalations
  try {
    const checkins = await base44.asServiceRole.entities.SoloCheckIn.filter({ case_id: caseId }, '-scheduled_time', 30);
    for (const ci of checkins) {
      if (ci.milestone_type) {
        const ts = ci.acknowledged_at || ci.sent_time || ci.scheduled_time;
        notifs.push({
          kind: 'milestone',
          title: MILESTONE_LABELS[ci.milestone_type] || ci.milestone_type,
          detail: ci.status === 'acknowledged'
            ? `${session.patient_name} confirmed they're safe`
            : 'Scheduled check-in',
          time: ts,
          ts: ts ? new Date(ts).getTime() : 0,
        });
      } else if (ci.status === 'acknowledged') {
        const ts = ci.acknowledged_at || ci.scheduled_time;
        notifs.push({
          kind: 'checkin',
          title: 'Safety check-in confirmed',
          detail: `${session.patient_name} checked in and is safe`,
          time: ts,
          ts: ts ? new Date(ts).getTime() : 0,
        });
      } else if (ci.status && String(ci.status).startsWith('escalated')) {
        const ts = ci.last_escalated_at || ci.scheduled_time;
        notifs.push({
          kind: 'escalation',
          title: 'Check-in overdue — escalation active',
          detail: 'Morales is actively checking on them',
          time: ts,
          ts: ts ? new Date(ts).getTime() : 0,
        });
      }
    }
  } catch (_) {}

  // 2. CaseRecord timeline_log — journey status transitions
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: caseId });
    const c = cases?.[0];
    if (c?.timeline_log && Array.isArray(c.timeline_log)) {
      for (const entry of c.timeline_log) {
        const t = entry?.timestamp || entry?.time || entry?.date || entry?.created_date;
        notifs.push({
          kind: 'status',
          title: entry?.title || entry?.action || entry?.status || 'Journey update',
          detail: entry?.note || entry?.description || '',
          time: t,
          ts: t ? new Date(t).getTime() : 0,
        });
      }
    }
  } catch (_) {}

  notifs.sort((a, b) => b.ts - a.ts);
  const notifications = notifs.slice(0, 25).map(({ time, ...rest }) => ({ ...rest, time }));

  // 3. Message thread
  let messages: any[] = [];
  try {
    messages = await base44.asServiceRole.entities.GuardianMessage.filter({ view_token: token }, 'created_at', 50);
  } catch (_) {}

  return Response.json({
    status: 'ok',
    patient_name: session.patient_name,
    guardian_name: session.guardian_name,
    notifications,
    messages: (messages || []).map((m) => ({
      id: m.id,
      from_role: m.from_role,
      author_name: m.author_name,
      body: m.body,
      delivered: m.delivered_to_patient,
      created_at: m.created_at,
    })),
  });
}, { name: 'getGuardianFeed', requireAuth: false, rateLimit: false }));