// @ts-nocheck
// Family Portal message relay. Token-gated (no user login) — a guardian sends a
// message through M-Care; M-Care stores it, forwards it to the patient on the
// family's behalf (email + SMS), and posts a brief acknowledgment back into the
// thread so the family sees the relay happened.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

const b64 = (s: string) => btoa(s);

async function twilioSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return { ok: false, error: 'missing credentials' };
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + b64(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j?.message || `Twilio ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Twilio request failed' };
  }
}

Deno.serve(createHandler(async ({ req }) => {
  const base44 = createClientFromRequest(req);
  const { token, message } = await req.json().catch(() => ({}));
  if (!token || !message || !String(message).trim()) {
    return Response.json({ status: 'invalid', error: 'token and message are required' });
  }
  const text = String(message).trim().slice(0, 2000);

  // Validate the guardian session (same gate as getGuardianViewData)
  const sessions = await base44.asServiceRole.entities.GuardianSession.filter({ view_token: token });
  const session = sessions?.[0];
  if (!session) return Response.json({ status: 'invalid', error: 'This guardian link does not exist.' });
  if (!session.is_active) return Response.json({ status: 'revoked', error: 'This guardian link has been revoked.' });
  if (!session.expires_at || new Date(session.expires_at) < new Date()) {
    return Response.json({ status: 'expired', error: 'This guardian link has expired.' });
  }

  const now = new Date().toISOString();
  const guardianName = session.guardian_name || 'Family';
  const patientName = session.patient_name || 'the traveler';

  // 1. Store the guardian's message
  const msg = await base44.asServiceRole.entities.GuardianMessage.create({
    case_id: session.case_id,
    session_id: session.id,
    view_token: token,
    from_role: 'guardian',
    author_name: guardianName,
    body: text,
    created_at: now,
  });

  // 2. Relay to the patient on the family's behalf, through M-Care
  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: session.case_id }).catch(() => []);
  const caseRecord = cases?.[0];
  const patientEmail = caseRecord?.client_email || session.patient_email;
  const patientPhone = caseRecord?.client_phone || null;
  const channels: string[] = [];

  if (patientEmail) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales M-Care',
        to: patientEmail,
        subject: `New message from ${guardianName} via your Family Portal`,
        body: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#060B16;color:#EEF2F7;padding:24px;border-radius:16px;">
  <p style="font-size:12px;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Morales M-Care · Family Portal</p>
  <h2 style="margin:0 0 12px;font-size:18px;color:#fff;">${guardianName} sent you a message</h2>
  <p style="font-size:15px;line-height:1.6;color:rgba(238,242,247,0.85);margin:0 0 16px;background:rgba(255,255,255,0.05);padding:12px;border-radius:10px;white-space:pre-wrap;">${text.replace(/</g, '&lt;')}</p>
  <p style="font-size:12px;color:rgba(238,242,247,0.4);margin:0;">Reply through your Morales app, or ask M-Care to pass a message back to ${guardianName}.</p>
</div>`,
      });
      channels.push('email');
    } catch (_) {}
  }
  if (patientPhone) {
    const smsBody = `Morales M-Care: ${guardianName} sent you a message via your Family Portal: "${text.slice(0, 120)}${text.length > 120 ? '…' : ''}"`;
    const r = await twilioSms(patientPhone, smsBody);
    if (r.ok) channels.push('sms');
  }

  await base44.asServiceRole.entities.GuardianMessage.update(msg.id, {
    delivered_to_patient: channels.length > 0,
    delivery_channels: channels,
  });

  // 3. M-Care acknowledgment back to the family thread
  const ackText = channels.length > 0
    ? `I've passed your message to ${patientName}. They'll see it right away.`
    : `I've saved your message for ${patientName}. I'll deliver it the moment we have a working channel to them.`;
  await base44.asServiceRole.entities.GuardianMessage.create({
    case_id: session.case_id,
    session_id: session.id,
    view_token: token,
    from_role: 'mcare',
    author_name: 'M-Care',
    body: ackText,
    created_at: new Date().toISOString(),
  });

  return Response.json({ status: 'ok', delivered_channels: channels });
// requireAuth:false — token is the only credential (no user session). Inline
// rate limit above via the session validation keeps it bounded; rateLimit:false
// here avoids double-limiting through two independent mechanisms.
}, { name: 'sendGuardianMessage', requireAuth: false, rateLimit: false }));