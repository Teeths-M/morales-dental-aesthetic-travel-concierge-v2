import { createHandler, ok, err } from '../_shared/createHandler.ts';

const BRAND   = 'Morales Dental & Aesthetics';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function sendSms(to: string, message: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return;
  const form = new URLSearchParams({ To: to, From: from, Body: message });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }).catch(() => {});
}

function goldenMEmail({ clientName, procedures, duration, caseRef }: {
  clientName: string; procedures: string; duration: string; caseRef: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">

<tr><td style="padding:48px 32px 32px;text-align:center;">
  <img src="https://moralesdentalandaesthetics.com/morales-m-mark.png" width="90" alt="M"
    style="display:block;margin:0 auto 20px;filter:drop-shadow(0 0 24px rgba(212,175,55,0.8));" />
  <div style="width:200px;height:1px;background:linear-gradient(to right,transparent,${GOLD},#F0D060,${GOLD},transparent);margin:0 auto 20px;box-shadow:0 0 8px rgba(212,175,55,0.6);"></div>
  <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-bottom:16px;">Journey Complete</div>
  <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:400;color:#fff;line-height:1.2;">
    Welcome home, ${e(clientName)}.
  </h1>
  <p style="margin:16px 0 0;font-size:16px;color:rgba(255,255,255,0.65);line-height:1.6;">
    All 9 handshakes confirmed. The Golden M is yours.
  </p>
</td></tr>

<tr><td style="padding:0 32px 32px;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:16px;overflow:hidden;margin-bottom:28px;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #2A3F4A;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;">Journey Summary</div>
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:45%;">Handshakes confirmed</td><td style="padding:6px 0;color:#fff;font-size:14px;font-weight:700;">9 / 9</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Procedure(s)</td><td style="padding:6px 0;color:#fff;font-size:13px;">${e(procedures)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Journey duration</td><td style="padding:6px 0;color:#fff;font-size:13px;">${e(duration)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Case reference</td><td style="padding:6px 0;color:${GOLD};font-size:13px;font-weight:700;">${e(caseRef)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 20px;background:#D4AF3710;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;font-style:italic;">
        "We are honoured to have walked this journey beside you. Your trust in us means everything. We will be here whenever you need us again."
      </p>
      <p style="margin:10px 0 0;font-size:12px;color:${GOLD};">— The Morales Concierge Team</p>
    </td></tr>
  </table>

  <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.7;text-align:center;">
    Your post-surgery care reminders will continue for the next 30 days.<br/>
    Your assigned companion is available via WhatsApp if you have any questions.
  </p>

  <div style="text-align:center;">
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:14px;font-weight:700;">
      View Journey Summary →
    </a>
  </div>

  <p style="margin:28px 0 0;font-size:12px;color:#475569;text-align:center;">
    This is an automated message. Case ${e(caseRef)} · ${BRAND}
  </p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { trip_id } = await body();
  if (!trip_id) return err('trip_id is required');

  const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id).catch(() => null);
  if (!trip) return err('Trip not found');

  const caseRecord = trip.case_id
    ? await base44.asServiceRole.entities.CaseRecord.get(trip.case_id).catch(() => null)
    : null;

  const clientName  = trip.client_name || caseRecord?.client_name || 'Valued Patient';
  const clientEmail = trip.user_email  || caseRecord?.client_email;
  const clientPhone = trip.user_phone  || caseRecord?.client_phone;
  const procedures  = (caseRecord?.procedures || []).join(', ') || 'Your procedure(s)';
  const caseRef     = (trip.case_id || trip.id || '').slice(-8).toUpperCase();

  // Calculate journey duration
  const hs1 = trip.handshake_timestamps?.['1'];
  const hs9 = trip.handshake_timestamps?.['9'];
  let duration = 'Journey complete';
  if (hs1 && hs9) {
    const ms   = new Date(hs9).getTime() - new Date(hs1).getTime();
    const days = Math.floor(ms / 86_400_000);
    const hrs  = Math.floor((ms % 86_400_000) / 3_600_000);
    duration   = days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : `${hrs} hour${hrs !== 1 ? 's' : ''}`;
  }

  const tasks: Promise<unknown>[] = [];

  if (clientEmail) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: clientEmail,
      subject: `Welcome home — The Golden M is yours. ✨ | ${BRAND}`,
      body: goldenMEmail({ clientName, procedures, duration, caseRef }),
    }));

    // Golden M push — the biggest celebration buzz of the whole journey
    tasks.push(
      base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
        user_email: clientEmail,
        title:      '⭐ The Golden M Is Yours',
        body:       `Welcome home, ${clientName.split(' ')[0]}. All 9 checkpoints complete. Journey done. Thank you for trusting Morales.`,
        url:        '/dashboard',
        type:       'golden_m',
        tag:        `golden-m-${trip_id}`,
        urgent:     false,
      }).catch(() => {}) ?? Promise.resolve()
    );
  }

  if (clientPhone) {
    tasks.push(sendSms(clientPhone,
      `✨ Welcome home, ${clientName.split(' ')[0]}. Your Morales journey is complete — all 9 handshakes confirmed. The Golden M is yours. Thank you for trusting us. — ${BRAND}`
    ));
  }

  // Write audit log
  tasks.push(base44.asServiceRole.entities.AuditLog.create({
    event_type: 'golden_m_notification_sent',
    related_id: trip_id,
    details: { client_name: clientName, duration, procedures },
  }).catch(() => {}));

  await Promise.allSettled(tasks);

  return ok({ sent_to: clientEmail || 'no email', sms: !!clientPhone, duration });
}, { name: 'sendGoldenMNotification', requireAuth: false }));
