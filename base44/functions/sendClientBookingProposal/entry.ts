import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';

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

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { case_id } = await body();
    if (!case_id) return err('case_id is required');

    // Verify the caller owns this case (or is admin). This stops one user from
    // dispatching proposals for another.
    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { caseRecord = null; }
    if (!caseRecord) return err('Case not found', 404);

    const isOwner = caseRecord.client_email && user.email && caseRecord.client_email.toLowerCase() === user.email.toLowerCase();
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    if (!isOwner && !isAdmin) {
      return err('You can only send a proposal for your own case.', 403);
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
    if (!appUrl) return err('APP_URL is not configured.', 500);
    const paymentUrl = `${appUrl}/portal/proposal/${token}`;

    const clientName = caseRecord.client_name || 'there';

    // Link-only per shared/notify.ts: the whole point of this function is a
    // real "click-and-pay" link, so a link is exactly right here — but the
    // dollar amount and client name were being embedded directly in the
    // email/SMS/WhatsApp body, which is exactly what assertLinkOnly's
    // LEAK_PATTERNS exist to catch. Every other patient-facing sender in this
    // codebase routes through linkOnlyEmail/linkOnlySms; this one didn't.
    const shortMsg = linkOnlySms({
      line: 'Your Morales travel package is ready to review and pay.',
      url: paymentUrl,
      from: 'sendClientBookingProposal',
    });

    const emailHtml = linkOnlyEmail({
      title: 'Your travel package is ready.',
      line: 'Review everything included and secure your dates with a deposit or full payment.',
      ctaUrl: paymentUrl,
      ctaLabel: 'Review & Pay',
      from: 'sendClientBookingProposal',
    });

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
    return ok({
      success: true,
      ready: true,
      case_id,
      payment_url: paymentUrl,
      channels,
      channels_reached: Object.keys(channels).filter((k) => channels[k].success),
      channels_failed: Object.keys(channels).filter((k) => !channels[k].success),
      summary: `Proposal sent on ${clientName}'s behalf via ${succeeded} channel(s). Present the payment link in chat so they can tap and pay.`,
    });
}, { name: 'sendClientBookingProposal' }));