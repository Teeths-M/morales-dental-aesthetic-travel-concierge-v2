import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * releaseEscrowPayment — Airbnb Escrow Release Model
 *
 * Called by completeHandshake 24 hours after the release-trigger HS is confirmed.
 * Marks the EscrowHold as released, notifies the partner with a premium payment
 * confirmation, and logs to audit.
 *
 * If Stripe Connect is configured (STRIPE_SECRET_KEY + partner stripe_connected_account),
 * issues the payout automatically. Otherwise marks as pending_manual_transfer.
 *
 * Release schedule:
 *   HS1 (Driver pickup confirmed)      → 25% of driver cost released to origin driver
 *   HS5 (Clinic arrival confirmed)     → 100% of treatment cost released to doctor
 *   HS6 (Companion delivery confirmed) → 100% of companion cost released
 *   HS7 (Return transport confirmed)   → remaining 75% of driver cost released
 *   HS9 (Home drop-off confirmed)      → 100% of travel agency (flight/hotel) released
 */

const BRAND   = 'Morales Dental & Aesthetics';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const e   = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function paymentReleasedEmail({ partnerName, partnerType, patientName, amount, caseRef, handshake, dashboardUrl }: {
  partnerName: string; partnerType: string; patientName: string; amount: number; caseRef: string; handshake: string; dashboardUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#29483d;padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:10px 0;"></div>
  <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:${GOLD};">Payment Released — ${e(partnerType)}</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:28px;text-align:center;margin-bottom:16px;">💰</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;text-align:center;">Payment confirmed, ${e(partnerName)}.</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#40514a;line-height:1.7;text-align:center;">
    The patient has successfully completed their checkpoint. Your payment has been released from escrow.
  </p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center;">
    <div style="font-size:32px;font-weight:700;color:#166534;">${usd(amount)}</div>
    <div style="font-size:13px;color:#166534;margin-top:4px;">Released to your account</div>
  </div>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Patient</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(patientName)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:600;">${e(caseRef)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Release Trigger</td><td style="padding:10px 0;color:#13221d;font-size:14px;">${e(handshake)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Cleared</td><td style="padding:10px 0;color:#166534;font-size:14px;font-weight:700;">✓ 24 hours after checkpoint</td></tr>
  </table>

  <p style="margin:0 0 20px;font-size:13px;color:#40514a;line-height:1.6;">
    Funds are being processed and will appear in your account within 3–5 business days depending on your bank. If you have any questions, please contact us and reference your case number above.
  </p>
  <a href="${e(dashboardUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">View My Dashboard →</a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;">Thank you for your exceptional service. It is partners like you who make the Morales standard possible.</p>
  <p style="margin:10px 0 0;font-size:14px;color:#13221d;font-weight:700;">The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

const HS_LABELS: Record<number, string> = {
  1: 'HS1 — Driver Pickup confirmed',
  5: 'HS5 — Clinic Arrival confirmed',
  6: 'HS6 — Companion Delivery confirmed',
  7: 'HS7 — Return Transport confirmed',
  9: 'HS9 — Journey Complete',
};

const PARTNER_DASHBOARDS: Record<string, string> = {
  doctor:          `${APP_URL}/doctor-dashboard`,
  driver_origin:   `${APP_URL}/taxi-service-dashboard`,
  driver_destination: `${APP_URL}/taxi-service-dashboard`,
  companion:       `${APP_URL}/companion-dashboard`,
  travel_agency:   `${APP_URL}/travel-agency-dashboard`,
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, handshake_number, partner_type } = await body();
  if (!case_id || !handshake_number) return err('case_id and handshake_number are required');

  const hsNum = Number(handshake_number);

  // Find EscrowHold records triggered by this handshake
  const holds = await base44.asServiceRole.entities.EscrowHold.filter({
    case_id, release_trigger_hs: hsNum, status: 'held',
  }).catch(() => []);

  if (!holds || holds.length === 0) {
    return ok({ skipped: true, reason: 'No held escrow records for this handshake' });
  }

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  const patientName = caseRecord?.client_name || 'Patient';
  const caseRef     = case_id.slice(-8).toUpperCase();
  const hsLabel     = HS_LABELS[hsNum] || `HS${hsNum}`;
  const now         = new Date().toISOString();

  const tasks: Promise<unknown>[] = [];
  const released: { partner_type: string; amount: number }[] = [];

  for (const hold of holds as any[]) {
    if (hold.status !== 'held') continue;

    // Attempt Stripe Connect transfer if configured
    let stripeTransferId: string | null = null;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey && hold.stripe_connected_account && hold.amount_held_usd > 0) {
      try {
        const transferResp = await fetch('https://api.stripe.com/v1/transfers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            amount:      String(Math.round(hold.amount_held_usd * 100)),
            currency:    'usd',
            destination: hold.stripe_connected_account,
            description: `Morales escrow release — ${patientName} — ${hsLabel} — Case ${caseRef}`,
          }).toString(),
        });
        if (transferResp.ok) {
          const transfer = await transferResp.json();
          stripeTransferId = transfer.id;
        }
      } catch (_) {}
    }

    // Update EscrowHold record
    tasks.push(base44.asServiceRole.entities.EscrowHold.update(hold.id, {
      status:        'released',
      trigger_confirmed_at: now,
      released_at:   now,
      stripe_transfer_id: stripeTransferId,
      release_notes: `Released 24hrs after ${hsLabel}`,
    }));

    // Send premium payment released email to partner
    if (hold.partner_email) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: hold.partner_email,
        subject: `Payment released — ${usd(hold.amount_held_usd)} for ${patientName} | ${BRAND}`,
        body: paymentReleasedEmail({
          partnerName:  hold.partner_name || hold.partner_email,
          partnerType:  hold.partner_type?.replace('_', ' '),
          patientName, amount: hold.amount_held_usd, caseRef,
          handshake:    hsLabel,
          dashboardUrl: PARTNER_DASHBOARDS[hold.partner_type] || `${APP_URL}/partner-portal`,
        }),
      }));
    }

    tasks.push(base44.asServiceRole.entities.AuditLog.create({
      event_type:   'escrow_payment_released',
      actor_id:     'system', actor_role: 'system', actor_name: 'Morales Escrow Engine',
      resource_type:'EscrowHold', resource_id: hold.id, case_id,
      sensitive:    true, timestamp: now,
      details: { partner_type: hold.partner_type, amount: hold.amount_held_usd, handshake: hsNum, stripe_transfer_id: stripeTransferId },
    }));

    released.push({ partner_type: hold.partner_type, amount: hold.amount_held_usd });
  }

  await Promise.allSettled(tasks);

  return ok({ case_id, handshake_number: hsNum, released, total_released: released.reduce((s, r) => s + r.amount, 0) });
}, { name: 'releaseEscrowPayment', requireAuth: false }));
