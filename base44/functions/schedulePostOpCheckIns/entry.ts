/**
 * schedulePostOpCheckIns
 *
 * Called when Handshake 9 (home drop-off) is confirmed — the Golden M moment.
 * Creates 4 PostOpCheckIn records scheduled at Day 3, 7, 14, and 30 post-return.
 * Each record includes a one-time response token so the patient can respond
 * without logging in (same pattern as Guardian tokens).
 *
 * Also sends the Day 3 notification immediately since it's the most time-sensitive.
 */
import { createHandler, ok, err } from '../_shared/createHandler.ts';

function generateToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CHECK_IN_DAYS = [3, 7, 14, 30] as const;

const QUESTIONS: Record<number, { subject: string; question: string }> = {
  3:  { subject: '🌿 Day 3 Recovery Check-In — How are you doing?',        question: 'You\'re 3 days home. How is your recovery going so far?' },
  7:  { subject: '💛 One Week Post-Procedure — Quick Check-In',             question: 'It\'s been one week since your procedure. How are you feeling?' },
  14: { subject: '✨ Two-Week Recovery Milestone — Tell Us How You\'re Doing', question: 'Two weeks in — are you starting to see and feel the results?' },
  30: { subject: '🏆 One Month Post-Procedure — Your Morales Journey Continues', question: 'One month on — how has your life changed since your procedure?' },
};

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, trip_id } = await body();

  if (!case_id) return err('case_id is required');

  // Load case to get patient details
  const caseRec = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRec) return err('Case not found', 404);

  const patientEmail  = caseRec.client_email || caseRec.user_email || '';
  const patientName   = caseRec.client_name  || '';
  const procedure     = (caseRec.procedures  || []).join(', ') || 'your procedure';
  const doctorEmail   = caseRec.doctor_email || '';
  const now           = new Date();
  const appUrl        = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  const created: number[] = [];

  for (const day of CHECK_IN_DAYS) {
    // Check if already scheduled (idempotent)
    const existing = await base44.asServiceRole.entities.PostOpCheckIn.filter({
      case_id, day,
    }).catch(() => []);
    if (existing.length > 0) continue;

    const scheduledAt = new Date(now.getTime() + day * 24 * 60 * 60 * 1000).toISOString();
    const token       = generateToken();

    await base44.asServiceRole.entities.PostOpCheckIn.create({
      case_id,
      patient_email:  patientEmail,
      patient_name:   patientName,
      procedure,
      doctor_email:   doctorEmail,
      day,
      scheduled_at:   scheduledAt,
      status:         'pending',
      response_token: token,
    });

    created.push(day);

    // Send Day 3 notification immediately — others are sent by a daily cron
    if (day === 3 && patientEmail) {
      const q    = QUESTIONS[3];
      const link = `${appUrl}/recovery-check-in/${token}`;
      const GOLD = '#D4AF37';

      const html = `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="background:#0C1A1D;padding:24px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">Morales Dental &amp; Aesthetics</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Post-Procedure Recovery</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">
    Day 3 — How are you doing, ${patientName.split(' ')[0] || 'there'}?
  </h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.6);">
    You've been home for 3 days since your <strong style="color:#fff;">${procedure}</strong>. Your care doesn't stop at the Golden M — we're with you through every step of recovery.
  </p>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.5);">
    Take 60 seconds to let us know how you're feeling. Your doctor can see your response and will follow up if needed.
  </p>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="${link}" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:700;">
      Share My Recovery Status →
    </a>
  </div>
  <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
    This link is personal to you and expires after submission.<br/>
    No login required. Takes under 60 seconds.
  </p>
</td></tr>
</table></td></tr></table></body></html>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales — Recovery Care',
        to:        patientEmail,
        subject:   q.subject,
        body:      html,
      }).catch(() => {});

      await base44.asServiceRole.entities.PostOpCheckIn.filter({ case_id, day: 3 })
        .then(([rec]) => rec && base44.asServiceRole.entities.PostOpCheckIn.update(rec.id, {
          notification_sent_at: new Date().toISOString(),
        })).catch(() => {});
    }
  }

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    event_type:  'post_op_checkins_scheduled',
    actor_email: user?.email || 'system',
    resource_id: case_id,
    details:     { days_scheduled: created, patient_email: patientEmail, procedure },
    timestamp:   now.toISOString(),
  }).catch(() => {});

  return ok({ success: true, scheduled_days: created, already_existed: CHECK_IN_DAYS.filter(d => !created.includes(d)) });
}, { name: 'schedulePostOpCheckIns', requireAuth: true }));
