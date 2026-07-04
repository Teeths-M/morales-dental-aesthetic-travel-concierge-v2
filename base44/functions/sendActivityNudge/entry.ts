import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
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

      // Log to AuditLog
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
        prev_hash: 'SYSTEM_NUDGE',
      });

      nudged++;
    }

    return Response.json({ nudged, checked: sessions.length });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});