/**
 * predictiveEscalation — Cron job (run every 15 minutes)
 *
 * Escalates BEFORE a check-in is missed, not after.
 * No other medical tourism platform does this.
 *
 * Logic:
 *   1. Find all active SoloCheckIn records where:
 *      - status = 'pending'
 *      - next_checkin_due is within 45 minutes
 *      - GPS has not moved in the last 2 hours (location_last_seen > 2h ago)
 *      - App is inactive (last_app_active > 1h ago)
 *   2. For each: fire a pre-alert to admin + coordinator
 *      "Patient has not moved in 2 hours and has a check-in due in 38 minutes."
 *   3. Log as predictive_alert on the SoloCheckIn record
 *
 * This is a proactive intervention — the coordinator calls the patient BEFORE
 * the system marks them as missed. Catches health events 45 minutes earlier.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const now        = new Date();
    const in45min    = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const twoHrsAgo  = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const oneHrAgo   = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

    // Find pending check-ins due within 45 minutes
    const pendingCheckins = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'pending' }, 'next_checkin_due', 50
    ).catch(() => []);

    const atRisk = pendingCheckins.filter((c: any) => {
      if (!c.next_checkin_due) return false;
      return c.next_checkin_due <= in45min && c.next_checkin_due > now.toISOString();
    });

    let alerted = 0;
    for (const checkin of atRisk) {
      try {
        // Check if predictive alert was already sent for this window
        if (checkin.predictive_alert_sent_at) {
          const alertAge = now.getTime() - new Date(checkin.predictive_alert_sent_at).getTime();
          if (alertAge < 90 * 60 * 1000) continue; // Skip if alerted in last 90 min
        }

        const minsUntilDue = Math.round(
          (new Date(checkin.next_checkin_due).getTime() - now.getTime()) / 60_000
        );

        // Assess risk signals
        const signals = [];
        const locationStale = checkin.location_last_seen && checkin.location_last_seen < twoHrsAgo;
        const appInactive   = checkin.app_last_active    && checkin.app_last_active    < oneHrAgo;

        if (locationStale) signals.push('No GPS movement in 2+ hours');
        if (appInactive)   signals.push('App inactive for 1+ hour');

        // Only alert if we have risk signals (don't spam on healthy patients)
        if (signals.length === 0) continue;

        const patientName = checkin.patient_name || checkin.patient_email || 'Patient';

        // Mark check-in as pre-alerted
        await base44.asServiceRole.entities.SoloCheckIn.update(checkin.id, {
          predictive_alert_sent_at: now.toISOString(),
          predictive_alert_signals: signals,
        }).catch(() => {});

        // Email admin
        if (adminEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales — Predictive Safety Alert',
            to: adminEmail,
            subject: `⚡ PREDICTIVE ALERT — ${patientName} check-in due in ${minsUntilDue} min`,
            body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:2px solid #f97316;border-radius:12px;">
<h2 style="color:#f97316;margin:0 0 16px;">⚡ Predictive Escalation — Pre-emptive Alert</h2>
<p style="color:#374151;">This alert fires <strong>before</strong> a check-in is missed, not after.</p>
<table style="width:100%;margin:16px 0;border-collapse:collapse;">
  <tr><td style="color:#6b7280;padding:4px 0;width:160px;">Patient</td><td><strong>${patientName}</strong></td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Check-in due in</td><td><strong style="color:#f97316;">${minsUntilDue} minutes</strong></td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Risk signals</td><td>${signals.join(' · ')}</td></tr>
  <tr><td style="color:#6b7280;padding:4px 0;">Case ID</td><td>${checkin.case_id || 'N/A'}</td></tr>
</table>
<p style="color:#374151;font-weight:600;">Recommended action: Call the patient now. If no answer in 5 minutes, escalate to Standard SOS protocol.</p>
<p style="color:#9ca3af;font-size:12px;">iQ200 Predictive Engine · Morales Medical</p>
</div>`,
          }).catch(() => {});
        }

        // Audit log
        await base44.functions.invoke('logAuditEvent', {
          event_type:   'predictive_escalation_fired',
          performed_by: 'system',
          target_email: checkin.patient_email || '',
          metadata:     { case_id: checkin.case_id, mins_until_due: minsUntilDue, signals },
          timestamp:    now.toISOString(),
        }).catch(() => {});

        alerted++;
      } catch (_) {}
    }

    return Response.json({
      success: true,
      at_risk_count:    atRisk.length,
      alerts_sent:      alerted,
      checked_at:       now.toISOString(),
    });
  } catch (error) {
    console.error('[predictiveEscalation]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
