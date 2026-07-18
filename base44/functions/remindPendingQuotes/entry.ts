import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';

/**
 * remindPendingQuotes — chases doctors who were invited to quote but haven't yet
 * submitted (or haven't even opened the request). 3-stage escalation, LINK-ONLY.
 *
 * Unlike the legacy sendQuoteReminders (travel/chauffeur, and it embeds patient
 * names), this covers the DOCTOR marketplace and honours the on-platform foundation:
 * the outbound body carries NO patient data — only a teaser + a secure portal link.
 *
 * Cadence (per DoctorQuote, keyed off created_date):
 *   24–48h → stage 1 email    ("a patient is waiting")
 *   48–72h → stage 2 email    (gentle follow-up)
 *   72h+   → stage 3 WhatsApp/SMS (final nudge), else email
 *
 * Scheduled by GitHub Actions (see freshness-cron pattern) or an admin run.
 * requireAuth:false + cron/admin guard. Bounded batch for credits.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');
const BRAND = 'Morales Medical Travel Safety';
const BATCH = 40;
const HR = 3600_000;

async function sendWhatsAppOrSms(to: string, message: string): Promise<boolean> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  const waFrom = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
  if (!sid?.startsWith('AC') || !auth || !to) return false;
  const useWa = !!waFrom;
  const body = new URLSearchParams({
    To: useWa ? `whatsapp:${to}` : to,
    From: useWa ? `whatsapp:${waFrom}` : (from || ''),
    Body: message,
  });
  if (!useWa && !from) return false;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch(() => null);
  return !!res && res.ok;
}

function reminderEmail(portalUrl: string, stage: number): string {
  const line = stage === 1
    ? 'A patient is waiting on your quote. It only takes a couple of minutes in your portal.'
    : 'Just a gentle follow-up — a patient is still hoping to hear back from you. Your quote keeps their care on track.';
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;padding:28px;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#0C1A1D;border:1px solid #2A3F4A;border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px;">
  <div style="font-size:24px;font-weight:900;color:#D4AF37;margin-bottom:14px;">M</div>
  <p style="font-size:16px;color:#fff;margin:0 0 10px;font-weight:700;">You have a pending pricing request.</p>
  <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 22px;line-height:1.6;">${line}</p>
  <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8C85C);color:#060B16;font-size:14px;font-weight:800;padding:13px 30px;border-radius:99px;text-decoration:none;">Open My Portal →</a>
  <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:22px 0 0;">Patient details stay in your portal — nothing private is sent by message.</p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const now = Date.now();
  const pending = await base44.asServiceRole.entities.DoctorQuote.filter(
    { status: 'pending' }, 'created_date', 300,
  ).catch(() => []);

  let sent = 0, skipped = 0;
  const tasks: Promise<unknown>[] = [];

  for (const q of pending as any[]) {
    if (sent >= BATCH) break;
    const created = new Date(q.created_date || q.created_at || 0).getTime();
    const age = now - created;
    if (!created || age < 24 * HR) { skipped++; continue; }

    const stage = age < 48 * HR ? 1 : age < 72 * HR ? 2 : 3;
    if ((q.reminder_stage || 0) >= stage) { skipped++; continue; } // already reminded at this stage

    const doctor = q.doctor_id
      ? await base44.asServiceRole.entities.Doctor.get(q.doctor_id).catch(() => null)
      : null;
    const portalUrl = `${APP_URL}/doctor-dashboard?request=${q.request_id}`;

    // Quiet-hours guard (best-effort — never blocks the fail-safe path).
    const blackout = await base44.functions.invoke('checkNotificationBlackout', {
      case_id: q.case_id || '', notification_type: stage === 3 ? 'sms' : 'email',
      recipient_role: 'doctor', recipient_identifier: q.doctor_email || '',
      event_trigger: `remindPendingQuotes_stage${stage}`,
      payload: { quote_id: q.id },
    }).catch(() => ({ data: { suppressed: false } }));
    if (blackout?.data?.suppressed) { skipped++; continue; }

    if (stage === 3 && doctor?.phone) {
      tasks.push(sendWhatsAppOrSms(doctor.phone,
        `${BRAND}: You have a pending patient pricing request. Please review it in your portal: ${portalUrl}`));
    } else if (q.doctor_email) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: q.doctor_email,
        subject: `Reminder: a patient is waiting on your quote — ${BRAND}`,
        body: reminderEmail(portalUrl, stage === 3 ? 2 : stage),
      }));
    } else { skipped++; continue; }

    tasks.push(base44.asServiceRole.entities.DoctorQuote.update(q.id, { reminder_stage: stage }).catch(() => {}));
    sent++;
  }

  await Promise.allSettled(tasks);
  console.log(`[remindPendingQuotes] sent=${sent} skipped=${skipped} scanned=${(pending as any[]).length}`);
  return ok({ success: true, reminders_sent: sent, skipped });
}, { name: 'remindPendingQuotes', requireAuth: false }));
