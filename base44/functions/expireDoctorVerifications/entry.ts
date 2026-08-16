import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

// Scheduled daily — expires overdue verifications and sends 30-day renewal reminders.
// Was gated on an admin session only (base44.auth.me() + role check), so no
// scheduler could ever call it -- a cron request has no user session and
// would always 403. cronAuthorized accepts a cron secret OR an admin
// session, so the admin-triggered path keeps working exactly as before and a
// real scheduler can now drive it too.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    const allActive = await base44.asServiceRole.entities.DoctorVerification.filter(
      { verification_status: 'verified' }, '-expires_at', 200
    );

    let expired = 0;
    let reminded = 0;

    for (const rec of allActive) {
      if (!rec.expires_at) continue;

      // Expire if past expiry date
      if (rec.expires_at < nowISO) {
        await base44.asServiceRole.entities.DoctorVerification.update(rec.id, {
          verification_status: 'expired',
          last_checked_at: nowISO
        });
        expired++;

        if (rec.doctor_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: rec.doctor_email,
            subject: '⚠️ Your Doctor Verification Has Expired — Morales Platform',
            body: `<h2>Verification Expired</h2><p>Dear Dr. ${rec.doctor_name},</p><p>Your medical license verification on the Morales Platform expired on ${new Date(rec.expires_at).toLocaleDateString()}.</p><p>You have been temporarily removed from patient search results.</p><p>Please <a href="${Deno.env.get('APP_URL') || ''}/doctor-dashboard">re-verify your license</a> to restore your profile.</p>`
          });
        }
        continue;
      }

      // Send 30-day renewal reminder (only once)
      if (rec.expires_at <= in30Days && !rec.renewal_reminder_sent_at) {
        await base44.asServiceRole.entities.DoctorVerification.update(rec.id, {
          renewal_reminder_sent_at: nowISO
        });
        reminded++;

        if (rec.doctor_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: rec.doctor_email,
            subject: '🔔 Your Doctor Verification Expires Soon — Action Required',
            body: `<h2>Verification Renewal Required</h2><p>Dear Dr. ${rec.doctor_name},</p><p>Your medical license verification expires on <strong>${new Date(rec.expires_at).toLocaleDateString()}</strong>.</p><p>Please log in and re-verify your license before it expires to avoid interruption to patient referrals.</p><p><a href="${Deno.env.get('APP_URL') || ''}/doctor-dashboard" style="background:#15803d;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Renew Verification →</a></p>`
          });
        }
      }
    }

    return Response.json({ success: true, expired, reminded, checked: allActive.length });
  } catch (error) {
    console.error('[expireDoctorVerifications]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});