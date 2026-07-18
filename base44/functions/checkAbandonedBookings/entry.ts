import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';

/**
 * checkAbandonedBookings — Expedia Abandonment Recovery Model
 *
 * Run every 2 hours. Recovers patients who opened the Pay Now email
 * but didn't complete payment.
 *
 * Stage 1 (≥ 2hr):  Warm email + SMS — "Your package is still waiting"
 * Stage 2 (≥ 24hr): Firm email + SMS — "Your package expires tomorrow"
 * Stage 3 (≥ 48hr): Release quotas — notify all 4 partners, reset pipeline
 */

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';
const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function aiRecoveryMessage(stage: 1 | 2, firstName: string, procedure: string, destination: string): Promise<{ headline: string; subline: string } | null> {
  if (!ANTHROPIC_KEY) return null;
  const tone = stage === 1 ? 'warm and reassuring' : 'firm and urgent — package expires in 24 hours';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU, max_tokens: 120,
        messages: [{ role: 'user', content: `Medical travel concierge. ${firstName} hasn't completed booking for ${procedure || 'their procedure'} in ${destination || 'their destination'}. Write a ${tone} recovery message. Return JSON: {"headline":"1 compelling sentence addressed to ${firstName}","subline":"2 sentences explaining what they stand to lose or miss if they don't complete"}` }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const m = (d.content?.[0]?.text || '').trim().match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function abandonedEmail({ stage, clientName, packageFull, packageTerms, firstInstall, caseRef, payUrl, last4, aiHeadline, aiSubline }: {
  stage: 1 | 2; clientName: string; packageFull: number; packageTerms: number;
  firstInstall: number; caseRef: string; payUrl: string; last4?: string;
  aiHeadline?: string; aiSubline?: string;
}) {
  const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const firstName = clientName.split(' ')[0];

  const config = stage === 1 ? {
    eyebrow: 'Your Package Is Waiting',
    headline: aiHeadline || `${firstName}, your Morales package is still available.`,
    subline: aiSubline || 'We noticed you haven\'t completed your booking yet. Everything is reserved for you — your doctor is confirmed, your travel is ready, and your partners are standing by. All that\'s missing is your payment.',
    urgency: '',
    ctaLabel: 'Complete My Booking',
  } : {
    eyebrow: 'Final Notice — Package Expires Tomorrow',
    headline: aiHeadline || `${firstName}, your package expires in 24 hours.`,
    subline: aiSubline || 'We\'ve been holding your confirmed quotes from your doctor, travel agency, and driver. If payment is not received within 24 hours, we will be required to release these reservations back to the pool.',
    urgency: `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:0 12px 12px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">⚠️ Your reserved spots expire in less than 24 hours.</p>
    </div>`,
    ctaLabel: 'Secure My Booking Now',
  };

  return `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="padding:32px;text-align:center;border-bottom:1px solid #2A3F4A;">
  <img src="${APP_URL}/morales-m-mark.png" width="52" alt="M" style="display:block;margin:0 auto 12px;filter:drop-shadow(0 0 10px rgba(212,175,55,0.6));" />
  <div style="font-family:Georgia,serif;font-size:20px;color:#fff;">${BRAND}</div>
  <div style="width:100px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:10px auto;"></div>
  <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">${e(config.eyebrow)}</div>
</td></tr>
<tr><td style="padding:28px 32px;">
  <h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;line-height:1.2;">${e(config.headline)}</h1>
  <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;">${e(config.subline)}</p>
  ${config.urgency}

  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:14px;padding:18px;margin-bottom:20px;">
    <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${GOLD};margin-bottom:12px;">Your Reserved Package</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:13px;color:#94a3b8;">Case reference</span>
      <span style="font-size:13px;font-weight:700;color:#fff;">${e(caseRef)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:13px;color:#94a3b8;">Pay in Full</span>
      <span style="font-size:14px;font-weight:700;color:#fff;">${usd(packageFull)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:13px;color:#94a3b8;">50% Deposit</span>
      <span style="font-size:14px;font-weight:700;color:#60a5fa;">${usd(firstInstall)} today</span>
    </div>
    ${last4 ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #2A3F4A;font-size:12px;color:#94a3b8;">💳 Saved card ending ${e(last4)} — no re-entry needed</div>` : ''}
  </div>

  <a href="${e(payUrl)}" style="display:block;text-align:center;background:${GOLD};color:#060B16;text-decoration:none;padding:14px;border-radius:999px;font-size:14px;font-weight:700;margin-bottom:10px;">
    ${e(config.ctaLabel)} →
  </a>
  <a href="${e(`${payUrl}&option=50pct`)}" style="display:block;text-align:center;background:transparent;color:rgba(255,255,255,0.5);text-decoration:none;padding:10px;border-radius:999px;font-size:13px;border:1px solid #2A3F4A;">
    Or pay ${usd(firstInstall)} deposit instead
  </a>
  <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
    Questions? Reply to this email or reach us on WhatsApp — we're here around the clock.
  </p>
  <p style="margin:10px 0 0;font-size:13px;color:#fff;font-weight:700;text-align:center;">The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);

    // Cron secret OR admin session. This endpoint had NO guard at all: it is
    // reachable over HTTP like every deployed function, so anyone with the URL
    // could drive it — triggering real notifications, spend and state changes.
    // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const now     = Date.now();
    const HR_2    = 2  * 60 * 60 * 1000;
    const HR_24   = 24 * 60 * 60 * 1000;
    const HR_48   = 48 * 60 * 60 * 1000;

    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { payment_status: 'Pending' }, '-pay_now_email_sent_at', 100
    ).catch(() => []);

    const acted: { case_id: string; action: string }[] = [];

    for (const c of cases as any[]) {
      if (!c.pay_now_email_sent_at || c.quotas_released_at) continue;

      const age     = now - new Date(c.pay_now_email_sent_at).getTime();
      const tasks: Promise<unknown>[] = [];
      const caseRef = c.id.slice(-8).toUpperCase();
      const payUrl  = `${APP_URL}/portal-hub/checkout/${c.id}?type=full`;
      const firstName = (c.client_name || 'Valued Patient').split(' ')[0];

      // ── Stage 1 — 2-hour warm recovery ───────────────────────────────────
      if (age >= HR_2 && !c.abandoned_1_sent) {
        const aiMsg1 = await aiRecoveryMessage(1, firstName, (c.procedures as string[] | undefined)?.[0] || '', c.procedure_country || '');
        if (c.client_email) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: c.client_email,
            subject: `${firstName}, your Morales package is still waiting for you | ${BRAND}`,
            body: abandonedEmail({ stage: 1, clientName: c.client_name, packageFull: c.package_price_full, packageTerms: c.package_price_terms, firstInstall: c.package_price_first_installment, caseRef, payUrl, last4: c.stripe_payment_method_last4, aiHeadline: aiMsg1?.headline, aiSubline: aiMsg1?.subline }),
          }));
        }
        if (c.client_phone) {
          tasks.push(sendSms(c.client_phone, `Hi ${firstName}, your confirmed Morales package is still waiting. Complete your booking before it expires: ${payUrl} — ${BRAND}`));
        }
        tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { abandoned_1_sent: true }));
        acted.push({ case_id: c.id, action: 'stage1_recovery' });
      }

      // ── Stage 2 — 24-hour firm reminder ──────────────────────────────────
      else if (age >= HR_24 && !c.abandoned_2_sent) {
        const aiMsg2 = await aiRecoveryMessage(2, firstName, (c.procedures as string[] | undefined)?.[0] || '', c.procedure_country || '');
        if (c.client_email) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: c.client_email,
            subject: `Final notice: Your package expires in 24 hours — ${caseRef} | ${BRAND}`,
            body: abandonedEmail({ stage: 2, clientName: c.client_name, packageFull: c.package_price_full, packageTerms: c.package_price_terms, firstInstall: c.package_price_first_installment, caseRef, payUrl, last4: c.stripe_payment_method_last4, aiHeadline: aiMsg2?.headline, aiSubline: aiMsg2?.subline }),
          }));
        }
        if (c.client_phone) {
          tasks.push(sendSms(c.client_phone, `${firstName}, your Morales package expires in 24 hours. If payment is not received, your confirmed quotes will be released. Secure your journey: ${payUrl} — ${BRAND}`));
        }
        tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { abandoned_2_sent: true }));
        acted.push({ case_id: c.id, action: 'stage2_final_notice' });
      }

      // ── Stage 3 — 48-hour quota release ──────────────────────────────────
      else if (age >= HR_48 && !c.quotas_released_at) {
        const releasedAt = new Date().toISOString();

        // Notify all 4 partners that quotes are released
        const [agencies, drivers] = await Promise.all([
          base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []),
          base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []),
        ]);
        const agency  = (agencies as any[])[0];
        const driver  = (drivers as any[])[0];
        const patientName = c.client_name;

        const releaseMsg = `Hi, we're writing to let you know that the reserved package for patient ${patientName} (Ref: ${caseRef}) has been released as payment was not completed within the required window. No further action is needed on your part. We appreciate your time and availability. — ${BRAND}`;

        if (agency?.email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: agency.email, subject: `Quote released — ${patientName} | ${BRAND}`, body: `<p>${releaseMsg}</p>` }));
        if (driver?.email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: driver.email, subject: `Transfer quote released — ${patientName} | ${BRAND}`, body: `<p>${releaseMsg}</p>` }));
        if (c.doctor_email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: c.doctor_email, subject: `Case released — ${patientName} | ${BRAND}`, body: `<p>${releaseMsg}</p>` }));

        tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, {
          quotas_released_at: releasedAt,
          status: 'Doctor-Pending', // Reset to allow re-entry
          all_quotas_confirmed: false,
          itinerary_status:       'PENDING',
          transfer_status:        'PENDING',
          companion_quote_status: 'PENDING',
          clinic_quote_status:    'PENDING',
        }));

        acted.push({ case_id: c.id, action: 'quotas_released' });
      }

      if (tasks.length > 0) await Promise.allSettled(tasks);
    }

    console.log(`[checkAbandonedBookings] processed ${cases.length} cases, acted on ${acted.length}`);
    return Response.json({ success: true, acted });
  } catch (error) {
    console.error('[checkAbandonedBookings]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
