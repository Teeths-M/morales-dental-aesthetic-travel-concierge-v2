import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

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

    /* This guard failed OPEN. It read:
     *
     *     let user = null;
     *     try { user = await base44.auth.me(); } catch (_) {}
     *     if (user && !['admin','platform_admin'].includes(user.role)) → 403
     *
     * With no session, `user` stays null, `user &&` short-circuits false, and
     * the request sails through. The intent was "anonymous means it's the
     * scheduler" — but every deployed function is reachable over HTTP, so that
     * treats the entire internet as the scheduler. This one drives AI calls,
     * emails and doctor notifications for patients who missed a recovery
     * check-in: it costs money and it messages real people.
     *
     * cronAuthorized proves the caller instead of assuming it: a matching
     * X-Cron-Secret, or an admin session. It fails CLOSED when CRON_SECRET is
     * unset (admin-only), which is the direction a safety endpoint must fail.
     */
    if (!(await cronAuthorized(req, base44))) {
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

      // This is the policy's named example of a non-exempt "missed check-in
      // reminder" — a missed log has many benign explanations and is not a
      // confirmed emergency, so every recipient below is link-only, including
      // the emergency contact. Days-missed/severity stay in RecoverySession
      // (updated above) and the case file, read in-portal.
      const doctorDashboardUrl = `${APP_URL}/doctor-dashboard`;
      const patientDashboardUrl = `${APP_URL}/dashboard`;

      // Email doctor
      if (docEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Recovery Monitor',
          to: docEmail,
          subject: severity === 'escalate' ? '🚨 Missed Recovery Check-In' : '⚠️ Missed Recovery Check-In',
          body: linkOnlyEmail({
            title: 'A patient missed their recovery check-in',
            line: 'One of your patients has not submitted a recovery check-in. Open your dashboard for the case detail and days-missed count.',
            ctaUrl: doctorDashboardUrl,
            ctaLabel: 'Open Doctor Dashboard',
            from: 'checkMissedRecoveryCheckins',
          }),
        }).catch(() => {});
      }

      // SMS doctor if escalated
      if (severity === 'escalate' && docPhone) {
        await sendSms(docPhone, linkOnlySms({
          line: 'A patient has missed recovery check-in for multiple consecutive days. Please open your dashboard and contact them.',
          url: doctorDashboardUrl,
          from: 'checkMissedRecoveryCheckins',
        })).catch(() => {});
      }

      // Email patient reminder
      if (pEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Recovery Team',
          to: pEmail,
          subject: 'Recovery check-in reminder',
          body: linkOnlyEmail({
            title: 'We haven’t heard from you today',
            line: 'Please open the Morales app to submit your recovery check-in and let us know how you’re feeling.',
            ctaUrl: patientDashboardUrl,
            ctaLabel: 'Open My Recovery Check-In',
            from: 'checkMissedRecoveryCheckins',
          }),
        }).catch(() => {});
      }

      // Emergency contact if 2+ consecutive missed/anomaly days
      if (newConsecutive >= 2 && (ecPhone || ecEmail)) {
        const ecLine = 'Your contact has missed multiple recovery check-ins with their care team. If you are able to check on them directly, please do — if this becomes an emergency, contact local services.';
        if (ecPhone) {
          await sendSms(ecPhone, linkOnlySms({ line: ecLine, url: APP_URL, from: 'checkMissedRecoveryCheckins' })).catch(() => {});
        }
        if (ecEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Recovery Monitor',
            to: ecEmail,
            subject: 'A recovery check-in alert for your contact',
            body: linkOnlyEmail({
              title: 'A check-in alert for your contact',
              line: ecLine,
              ctaUrl: APP_URL,
              ctaLabel: 'Learn More',
              from: 'checkMissedRecoveryCheckins',
            }),
          }).catch(() => {});
        }
      }

      // M Local referral — when escalated and a case_id is available, try to match
      // a verified home-country doctor and send them a secure referral portal link.
      //
      // FIX: this previously called `${SUPABASE_URL||BASE44_URL}/functions/v1/...`
      // via raw fetch() — a Supabase edge-function URL convention that doesn't
      // apply here (this backend is Base44), and neither env var is ever set, so
      // `origin` was always '', the fetch always threw on the invalid URL, and
      // the catch below silently swallowed it — M Local referral never actually
      // fired. Use the same base44.asServiceRole.functions.invoke() pattern every
      // other internal caller in this codebase uses.
      if (severity === 'escalate' && session.case_id) {
        try {
          const matchResp = await base44.asServiceRole.functions.invoke('matchLocalDoctor', {
            case_id: session.case_id,
            internal_secret: Deno.env.get('CRON_SECRET'),
          });
          if (matchResp?.data?.matched && matchResp.data.doctor?.id) {
            await base44.asServiceRole.functions.invoke('sendLocalDoctorReferral', {
              case_id: session.case_id,
              local_doctor_id: matchResp.data.doctor.id,
              internal_secret: Deno.env.get('CRON_SECRET'),
            });
          }
        } catch (_) { /* M Local referral is best-effort — never block main cron */ }
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
        prev_hash: await computePrevHash(base44),
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
