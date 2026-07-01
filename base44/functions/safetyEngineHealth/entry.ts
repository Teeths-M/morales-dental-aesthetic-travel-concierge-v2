/**
 * safetyEngineHealth — Dead-man's-switch endpoint for the Silent Safety Escalation Engine.
 *
 * Returns HTTP 200 if runSilentSafetyEscalation has run within the expected window.
 * Returns HTTP 503 if the engine is stale, and fires an admin alert email.
 *
 * Wire an external uptime monitor (UptimeRobot, BetterStack, Freshping, etc.) to ping
 * this endpoint every 5 minutes. When it receives a 503, it pages admin immediately —
 * independent of any system we're monitoring.
 *
 * Auth: admin only. Never expose publicly — this reveals internal system state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Engine is expected to run at most every N minutes.
// If the last heartbeat is older than 2× this value the engine is treated as down.
const EXPECTED_INTERVAL_MINUTES = 15;
const STALE_THRESHOLD_MINUTES = EXPECTED_INTERVAL_MINUTES * 2;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs = await base44.asServiceRole.entities.NotificationLog.filter(
      { message_type: 'safety_engine_heartbeat' }, '-created_at', 1
    );

    const now = new Date();
    const last = logs?.[0];

    if (!last) {
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: '🚨 SAFETY ENGINE — No heartbeat on record',
          body: 'runSilentSafetyEscalation has never completed a run, or heartbeat logging is broken.\n\nPatients with missed check-ins are NOT being escalated. Check the Base44 scheduler immediately.',
        }).catch(() => {});
      }
      return Response.json({
        status: 'never_run',
        stale: true,
        last_run_at: null,
        minutes_since_last_run: null,
        threshold_minutes: STALE_THRESHOLD_MINUTES,
      }, { status: 503 });
    }

    const lastRunAt = new Date(last.created_at);
    const minutesSince = (now.getTime() - lastRunAt.getTime()) / 60000;
    const isStale = minutesSince > STALE_THRESHOLD_MINUTES;

    if (isStale) {
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `🚨 SAFETY ENGINE DOWN — stale for ${Math.round(minutesSince)} minutes`,
          body: `The Silent Safety Escalation Engine has not run for ${Math.round(minutesSince)} minutes.\nExpected every ${EXPECTED_INTERVAL_MINUTES} minutes.\n\nLast successful run: ${lastRunAt.toISOString()}\nLast run stats: ${last.notes || 'unknown'}\n\nPatients with missed check-ins are NOT being escalated. Check the Base44 scheduler immediately.`,
        }).catch(() => {});
      }
    }

    return Response.json({
      status: isStale ? 'stale' : 'ok',
      stale: isStale,
      last_run_at: last.created_at,
      minutes_since_last_run: Math.round(minutesSince),
      threshold_minutes: STALE_THRESHOLD_MINUTES,
      last_run_stats: last.notes || null,
    }, { status: isStale ? 503 : 200 });

  } catch (error) {
    console.error('[safetyEngineHealth]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
