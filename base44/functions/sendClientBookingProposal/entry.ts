import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── sendClientBookingProposal ─────────────────────────────────────────────────
// The "click-and-pay" orchestrator. Once M-Care has confirmed the partner quotas
// and calculated the real package price (calculatePackagePrice), it calls this to
// send the client their one-tap payment link across EVERY channel they have —
// email, SMS, and WhatsApp — on the client's behalf, so the client never waits on
// an admin to push a proposal and gets the link wherever they prefer to receive it.
//
// What it does:
//   1. Loads the CaseRecord (asServiceRole) and verifies the caller owns it.
//   2. Refuses if final_package_price isn't set (>0) — M-Care must price first.
//   3. Ensures a public proposal_token + status 'Proposal-Sent' exist.
//   4. Builds the public /portal/proposal/:token URL (no login wall).
//   5. Dispatches the link via Email (Core.SendEmail) + SMS (Twilio REST inline) +
//      WhatsApp (Twilio WhatsApp API inline, only if whatsapp_opt_in is true).
//   6. Fault-tolerant: Promise.allSettled, logs every channel to NotificationLog,
//      never aborts the whole dispatch on one channel failing.
//   7. Returns the payment_url + per-channel results so M-Care can present the
//      link in chat AND tell the client which channels it reached them on.
//
// Self-contained: Twilio calls are inlined (the env secrets already exist) rather
// than cross-calling sendSmsNotification / sendWhatsAppCaseUpdate, per the
// platform's cross-function bundling limitations.

const b64 = (s: string) => btoa(s);

async function twilioSms(to: string, body: string, whatsapp: boolean): Promise<{ ok: boolean; error?: string; sid?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from) return { ok: false, error: 'Twilio credentials not configured' };
  if (!to) return { ok: false, error: 'No recipient number' };
  const fromAddr = whatsapp ? `whatsapp:${from}` : from;
  const toAddr = whatsapp ? `whatsapp:${to}` : to;
  const params = new URLSearchParams({ From: fromAddr, To: toAddr, Body: body });
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + b64(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.message || `Twilio ${res.status}` };
    return { ok: true, sid: json.sid };
  } catch (e) {
    return { ok: false, error: e?.message || 'Twilio request failed' };
  }
}

Deno.serve(async (req) => {
  let body: any = null;
  try { body = await req.json(); } catch (_) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { case_id } = body || {};
  if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });

  try {
    const base44 = createClientFromRequest(req);

    // Verify the caller owns this case (or is admin). Booking requires auth, so a
    // session must exist. This stops one user from dispatching proposals for another.
    let caller: { email?: string; role?: string } | null = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    if (!caller) return Response.json({ error: 'Authentication required to send a booking proposal.' }, { status: 401 });

    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { caseRecord = null; }
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const isOwner = caseRecord.client_email && caller.email && caseRecord.client_email.toLowerCase() === caller.email.toLowerCase();
    const isAdmin = caller.role === 'admin' || caller.role === 'platform_admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'You can only send a proposal for your own case.' }, { status: 403 });
    }

    // M-Care must have priced the package first.
    if (!caseRecord.final_package_price || caseRecord.final_package_price <= 0) {
      return Response.json({
        ready: false,
        error: 'Package price has not been calculated yet. Call calculatePackagePrice first, then send the proposal.',
      }, { status: 409 });
    }

    // Ensure a public proposal token + Proposal-Sent status exist.
    const now = new Date().toISOString();
    let token = caseRecord.proposal_token;
    const updates: Record<string, unknown> = {};
    if (!token) {
      token = `prop_${case_id}`;
      updates.proposal_token = token;
    }
    if (caseRecord.status !== 'Proposal-Sent' && caseRecord.status !== 'Deposit-Paid' && caseRecord.status !== 'PMP-25' && caseRecord.status !== 'PMP-50' && caseRecord.status !== 'Paid In Full') {
      updates.status = 'Proposal-Sent';
    }
    if (!caseRecord.proposal_sent_at) updates.proposal_sent_at = now;
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.CaseRecord.update(case_id, updates);
    }

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    if (!appUrl) return Response.json({ error: 'APP_URL is not configured.' }, { status: 500 });
    const paymentUrl = `${appUrl}/portal/proposal/${token}`;

    const clientName = caseRecord.client_name || 'there';
    const price = Number(caseRecord.final_package_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const shortMsg = `Morales: Your medical travel package ($${price}) is ready. Tap to review & pay: ${paymentUrl}`;

    // Email body — clean, link-forward, mobile-friendly.
    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#060B16;color:#EEF2F7;padding:32px 24px;border-radius:16px;">
        <p style="font-size:12px;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Morales Concierge</p>
        <h2 style="margin:0 0 16px;font-size:22px;color:#fff;">Your package is ready, ${clientName}.</h2>
        <p style="font-size:15px;line-height:1.6;color:rgba(238,242,247,0.8);margin:0 0 24px;">
          Your complete medical travel package is confirmed and priced at <strong style="color:#D4AF37;">$${price}</strong>.
          Tap below to review everything included and secure your dates with a deposit or full payment.
        </p>
        <a href="${paymentUrl}" style="display:inline-block;background:#D4AF37;color:#060B16;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;">Review &amp; Pay</a>
        <p style="font-size:12px;color:rgba(238,242,247,0.4);margin:24px 0 0;line-height:1.5;">If the button doesn't work, open this link: ${paymentUrl}</p>
      </div>`;

    // ── Dispatch across all available channels (fault-tolerant) ──
    const channels: Record<string, { success: boolean; error?: string; sid?: string }> = {};
    const logWrites: Promise<any>[] = [];

    const logNotification = (entry: Record<string, unknown>) =>
      base44.asServiceRole.entities.NotificationLog.create({
        case_id: case_id,
        recipient_type: 'traveler',
        created_at: now,
        ...entry,
      }).catch(() => null);

    // 1. Email
    if (caseRecord.client_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: caseRecord.client_email,
          subject: `Your Medical Travel Package — Morales Concierge`,
          body: emailHtml,
        });
        channels.email = { success: true };
        logWrites.push(logNotification({
          channel: 'email', recipient_email: caseRecord.client_email,
          message_type: 'general', status: 'sent', notes: 'Booking proposal dispatched on client behalf',
        }));
      } catch (e: any) {
        channels.email = { success: false, error: e?.message || 'Email failed' };
        logWrites.push(logNotification({
          channel: 'email', recipient_email: caseRecord.client_email,
          message_type: 'general', status: 'failed', notes: channels.email.error,
        }));
      }
    } else {
      channels.email = { success: false, error: 'No email on file' };
    }

    // 2. SMS
    if (caseRecord.client_phone) {
      const sms = await twilioSms(caseRecord.client_phone, shortMsg, false);
      channels.sms = { success: sms.ok, error: sms.error, sid: sms.sid };
      logWrites.push(logNotification({
        channel: 'sms', recipient_phone: caseRecord.client_phone,
        message_type: 'general', status: sms.ok ? 'sent' : 'failed',
        notes: sms.ok ? 'Proposal link sent via SMS on client behalf' : sms.error,
      }));
    } else {
      channels.sms = { success: false, error: 'No phone on file' };
    }

    // 3. WhatsApp (only if opted in)
    if (caseRecord.client_phone && caseRecord.whatsapp_opt_in) {
      const wa = await twilioSms(caseRecord.client_phone, shortMsg, true);
      channels.whatsapp = { success: wa.ok, error: wa.error, sid: wa.sid };
      logWrites.push(logNotification({
        channel: 'sms', recipient_phone: caseRecord.client_phone,
        message_type: 'general', status: wa.ok ? 'sent' : 'failed',
        notes: wa.ok ? 'Proposal link sent via WhatsApp on client behalf' : wa.error,
      }));
    } else {
      channels.whatsapp = { success: false, error: caseRecord.whatsapp_opt_in ? 'No phone on file' : 'WhatsApp not opted in' };
    }

    await Promise.allSettled(logWrites);

    const succeeded = Object.values(channels).filter((c) => c.success).length;
    return Response.json({
      success: true,
      ready: true,
      case_id,
      payment_url: paymentUrl,
      channels,
      channels_reached: Object.keys(channels).filter((k) => channels[k].success),
      channels_failed: Object.keys(channels).filter((k) => !channels[k].success),
      summary: `Proposal sent on ${clientName}'s behalf via ${succeeded} channel(s). Present the payment link in chat so they can tap and pay.`,
    });
  } catch (error) {
    console.error('[sendClientBookingProposal]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});