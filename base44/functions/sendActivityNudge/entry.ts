import { createHandler, ok } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Find sessions scheduled to start in the next 1-2 hours without a nudge sent
  const sessions = await base44.asServiceRole.entities.ActivitySession.filter({ status: 'registered' });

  const toNudge = sessions.filter(s => {
    if (!s.scheduled_start_at || s.nudge_sent_at) return false;
    const start = new Date(s.scheduled_start_at);
    return start >= oneHourFromNow && start <= twoHoursFromNow;
  });

  let nudged = 0;
  for (const session of toNudge) {
    const msg = `⚠️ Activity Reminder: Your ${session.activity_name} is in ~1 hour. Before you go: confirm your harness/gear is secured. Open your safety checklist in the app now.`;

    // Send SMS if phone available
    if (session.patient_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: session.patient_email,
        subject: `⚠️ Pre-Activity Safety Nudge — ${session.activity_name}`,
        body: `<p>${msg}</p><p><a href="${Deno.env.get('APP_URL')}/dashboard/adventure">Open My Safety Checklist →</a></p>`,
      });
    }

    await base44.asServiceRole.entities.ActivitySession.update(session.id, {
      nudge_sent_at: now.toISOString(),
    });

    // Log to AuditLog — computes a real hash-chain link, matching logAuditEvent's pattern.
    let prevHash = 'GENESIS';
    try {
      const lastEntries = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
      if (lastEntries?.length > 0) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(lastEntries[0])));
        prevHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {
      prevHash = 'GENESIS_FALLBACK';
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'partner_notified',
      actor_id: session.patient_id || 'system',
      actor_role: 'system',
      actor_name: 'Activity Nudge System',
      resource_type: 'ActivitySession',
      resource_id: session.id,
      resource_name: session.activity_name,
      case_id: session.case_id,
      details: { nudge_type: 'pre_activity_1hr', message: msg },
      sensitive: false,
      timestamp: now.toISOString(),
      prev_hash: prevHash,
    });

    nudged++;
  }

  return ok({ nudged, checked: sessions.length });
}, { name: 'sendActivityNudge', requireAuth: false }));
