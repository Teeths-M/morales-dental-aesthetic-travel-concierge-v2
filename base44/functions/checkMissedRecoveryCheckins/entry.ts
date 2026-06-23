import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── checkMissedRecoveryCheckins — cron/scheduled function ─────────────────────
// Runs every hour via Base44 scheduler.
// Schedule (Base44 cron): 0 * * * *
//
// Finds all active RecoverySessions where the patient has not submitted
// a RecoveryLog for today AND recovery_start_at was ≥ 24 hours ago.
// A missing check-in after 24h = anomaly (same severity treatment as bad metrics).
//
// On missed check-in:
//   1. Increments consecutive_anomaly_days
//   2. Emails doctor + SMS doctor if phone available
//   3. If missed 2+ consecutive days: notifies emergency contact + suggests clinic visit

async function sendSms(to, body) {
  const sid  = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from) return { ok: false, error: 'twilio_not_configured' };
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const r = await resp.json().catch(() => ({}));
  return resp.ok ? { ok: true, sid: r.sid } : { ok: false, error: r.message };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* scheduler */ }
    if (user && !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    // Only look at patients who started recovery ≥ 24 hours ago
    const cutoff24h = new Date(Date.now() - 24 * 3600_000).toISOString();

    const sessions = await base44.asServiceRole.entities.RecoverySession.filter({
      is_active: true,
    }).catch(() => []);

    const missed = (sessions || []).filter(s =>
      s.recovery_start_at < cutoff24h &&
      (!s.last_log_date || s.last_log_date < todayStr)
    );

    if (!missed.length) {
      return Response.json({ success: true, missed_count: 0, checked_at: nowIso });
    }

    const results = [];

    for (const session of missed) {
      const pName  = session.patient_name   || session.patient_email;
      const pEmail = session.patient_email  || '';
      const docEmail = session.doctor_email || Deno.env.get('ADMIN_EMAIL') || '';
      const docPhone = session.doctor_phone || '';
      const ecPhone  = session.emergency_contact_phone || '';
      const ecEmail  = session.emergency_contact_email || '';
      const ecName   = session.emergency_contact_name  || 'Emergency Contact';

      const prevConsecutive  = session.consecutive_anomaly_days || 0;
      const newConsecutive   = prevConsecutive + 1;
      const daysSinceLastLog = session.last_log_date
        ? Math.round((Date.now() - new Date(session.last_log_date).getTime()) / 86400_000)
        : '?';

      const severity = newConsecutive >= 2 ? 'escalate' : 'warning';

      // Pause guard — still update anomaly counters, but suppress all outbound notifications
      const tripPaused = await (async () => {
        try {
          const trips = await base44.asServiceRole.entities.TravelRequest.filter({
            user_email: pEmail, package_status: 'confirmed',
          });
          return (trips || []).some(t => t.paused === true);
        } catch (_) { return false; }
      })();

      // Update session (always — data must stay accurate for recalculation)
      await base44.asServiceRole.entities.RecoverySession.update(session.id, {
        anomaly_status:           severity,
        consecutive_anomaly_days: newConsecutive,
        last_anomaly_at:          nowIso,
      }).catch(() => {});

      // Notifications suppressed while journey is paused — counters still updated above
      if (tripPaused) {
        results.push({ session_id: session.id, patient: pName, skipped: 'trip_paused' });
        continue;
      }

      // Email doctor
      if (docEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Recovery Monitor',
          to: docEmail,
          subject: `${severity === 'escalate' ? '🚨' : '⚠️'} Missed Recovery Check-In — ${pName}`,
          body: `<p>Patient <strong>${pName}</strong> (${pEmail}) has not submitted a recovery check-in today.</p>` +
            `<p>Days since last log: ${daysSinceLastLog} | Consecutive missed/anomaly days: ${newConsecutive}</p>` +
            `<p>Case ID: ${session.case_id || '—'}</p>` +
            `<p>Please attempt to reach the patient to confirm they are well.</p>`,
        }).catch(() => {});
      }

      // SMS doctor if escalated
      if (severity === 'escalate' && docPhone) {
        await sendSms(docPhone,
          `Morales: ${pName} has missed recovery check-in for ${newConsecutive} consecutive days. Please contact them.`
        ).catch(() => {});
      }

      // SMS patient reminder
      if (pEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Recovery Team',
          to: pEmail,
          subject: 'Recovery Check-In Reminder',
          body: `<p>Hi ${pName},</p><p>We noticed you haven't submitted your recovery check-in today. Please open the Morales app or reply to this email to let us know how you're feeling.</p><p>You can also SMS us: RECOVERY <pain 1-10> <mobility 1-5> <appetite 1-5> <GOOD|CONCERNING|BAD></p>`,
        }).catch(() => {});
      }

      // Emergency contact if 2+ consecutive missed/anomaly days
      if (newConsecutive >= 2 && (ecPhone || ecEmail)) {
        const ecMsg = `Morales alert: ${pName} has not been reachable for their post-surgical recovery check-in for ${newConsecutive} days. Please check on them. If there is an emergency, contact local services.`;
        if (ecPhone) await sendSms(ecPhone, ecMsg).catch(() => {});
        if (ecEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Recovery Monitor',
            to: ecEmail,
            subject: `Recovery Alert — ${pName}`,
            body: `<p>${ecMsg}</p><p>If you cannot reach them, we recommend contacting local emergency services or their clinic: ${session.doctor_email || '(see case file)'}.</p>`,
          }).catch(() => {});
        }
      }

      // AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'recovery_missed_checkin',
        resource_type: 'recovery_session',
        resource_id: session.id,
        actor_id: 'system',
        actor_name: 'checkMissedRecoveryCheckins',
        case_id: session.case_id || '',
        details: {
          patient_name: pName,
          days_since_last_log: daysSinceLastLog,
          consecutive_anomaly_days: newConsecutive,
          severity,
        },
        sensitive: true,
        timestamp: nowIso,
      }).catch(() => {});

      results.push({
        session_id: session.id,
        patient: pName,
        consecutive_anomaly_days: newConsecutive,
        severity,
      });
    }

    return Response.json({
      success: true,
      missed_count: missed.length,
      results,
      checked_at: nowIso,
    });

  } catch (err) {
    console.error('[checkMissedRecoveryCheckins]', err);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
