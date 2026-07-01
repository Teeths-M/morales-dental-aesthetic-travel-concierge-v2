import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * sendPaymentReminders
 *
 * Cron-style function — run daily.
 * Sends payment balance reminders at 7 days, 3 days, and 1 day before due date.
 *
 * Reminder tone escalation:
 * - 7-day: Warm reminder — "just a heads up"
 * - 3-day: Friendly follow-up
 * - 1-day: Urgent — includes SMS fallback
 */

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const usd = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const e   = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

function reminderEmail({ clientName, caseRef, daysUntilDue, balanceDue, payUrl, tone }: {
  clientName: string; caseRef: string; daysUntilDue: number; balanceDue: number; payUrl: string;
  tone: 'warm' | 'friendly' | 'urgent';
}) {
  const subjects: Record<string, string> = {
    warm:     `A quick reminder about your remaining balance | ${BRAND}`,
    friendly: `Your balance payment is due in ${daysUntilDue} days | ${BRAND}`,
    urgent:   `Action needed: Balance due tomorrow | ${BRAND}`,
  };
  const intros: Record<string, string> = {
    warm:     `Just a gentle heads up — your journey package balance of <strong>${usd(balanceDue)}</strong> is due in ${daysUntilDue} days. There's no rush today, but we wanted to make sure you had this on your radar.`,
    friendly: `Your remaining balance of <strong>${usd(balanceDue)}</strong> is due in <strong>${daysUntilDue} days</strong>. Paying now ensures all your partners remain confirmed and your journey stays on track.`,
    urgent:   `Your journey package balance of <strong>${usd(balanceDue)}</strong> is due <strong>tomorrow</strong>. Please complete your payment today to ensure all your partners remain confirmed for your trip.`,
  };
  const ctaColors: Record<string, string> = { warm: '#29483d', friendly: '#29483d', urgent: '#b91c1c' };

  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:${tone === 'urgent' ? '#7f1d1d' : '#29483d'};padding:28px 32px;color:#fff;">
  <div style="font-family:Georgia,serif;font-size:22px;">${BRAND}</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#d9c19b;">
    ${tone === 'urgent' ? '⚡ Balance Due Tomorrow' : tone === 'friendly' ? 'Friendly Reminder' : 'Payment Reminder'}
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;">Hi ${e(clientName)},</h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;">${intros[tone]}</p>
  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:24px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Case Reference</td><td style="padding:10px 0;color:#13221d;font-size:14px;font-weight:700;">${e(caseRef)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Balance Due</td><td style="padding:10px 0;color:#13221d;font-size:16px;font-weight:700;">${usd(balanceDue)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Days Remaining</td><td style="padding:10px 0;color:${tone === 'urgent' ? '#b91c1c' : '#13221d'};font-size:14px;font-weight:700;">${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</td></tr>
  </table>
  <a href="${e(payUrl)}" style="display:inline-block;background:${ctaColors[tone]};color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">
    Pay ${usd(balanceDue)} Now →
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    ${tone === 'urgent' ? 'If you have already made payment, please disregard this message.' : 'Questions? Reply to this email or reach your concierge on WhatsApp.'}
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
    const today   = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Load all cases with outstanding balance (50% paid, next_payment_due set)
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { payment_status: '50% Paid' }, '-next_payment_due', 100
    ).catch(() => []);

    const sent: { case_id: string; days: number; type: string }[] = [];

    for (const c of cases as any[]) {
      if (!c.next_payment_due || !c.client_email) continue;

      const dueMs   = new Date(c.next_payment_due).setUTCHours(0, 0, 0, 0);
      const daysLeft = Math.round((dueMs - todayMs) / 86_400_000);
      const caseRef  = c.id.slice(-8).toUpperCase();
      const balance  = Number(c.amount_remaining || c.package_price_first_installment || 0);
      // 1-click payment URL — routes to PaymentCheckout, includes Stripe customer ID for saved-card flow
      const oneClickSuffix = c.stripe_customer_id ? `&customer=${c.stripe_customer_id}` : '';
      const payUrl   = `${APP_URL}/portal-hub/checkout/${c.id}?type=balance${oneClickSuffix}`;

      const tasks: Promise<unknown>[] = [];

      // 7-day reminder
      if (daysLeft === 7 && !c.payment_reminder_7d_sent) {
        tasks.push(
          base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: c.client_email,
            subject: `A quick note about your journey balance | ${BRAND}`,
            body: reminderEmail({ clientName: c.client_name, caseRef, daysUntilDue: 7, balanceDue: balance, payUrl, tone: 'warm' }),
          }),
          base44.asServiceRole.entities.CaseRecord.update(c.id, { payment_reminder_7d_sent: true })
        );
        sent.push({ case_id: c.id, days: 7, type: 'email' });
      }

      // 3-day reminder
      if (daysLeft === 3 && !c.payment_reminder_3d_sent) {
        tasks.push(
          base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: c.client_email,
            subject: `Your balance is due in 3 days | ${BRAND}`,
            body: reminderEmail({ clientName: c.client_name, caseRef, daysUntilDue: 3, balanceDue: balance, payUrl, tone: 'friendly' }),
          }),
          base44.asServiceRole.entities.CaseRecord.update(c.id, { payment_reminder_3d_sent: true })
        );
        sent.push({ case_id: c.id, days: 3, type: 'email' });
      }

      // 1-day reminder + SMS
      if (daysLeft === 1 && !c.payment_reminder_1d_sent) {
        tasks.push(
          base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: c.client_email,
            subject: `Action needed: Balance due tomorrow | ${BRAND}`,
            body: reminderEmail({ clientName: c.client_name, caseRef, daysUntilDue: 1, balanceDue: balance, payUrl, tone: 'urgent' }),
          }),
          base44.asServiceRole.entities.CaseRecord.update(c.id, { payment_reminder_1d_sent: true })
        );
        // SMS fallback — last resort
        if (c.client_phone) {
          tasks.push(sendSms(c.client_phone,
            `Hi ${c.client_name?.split(' ')[0]}, your Morales journey balance of ${usd(balance)} is due tomorrow. Pay now: ${payUrl} — ${BRAND}`
          ));
          sent.push({ case_id: c.id, days: 1, type: 'email+sms' });
        } else {
          sent.push({ case_id: c.id, days: 1, type: 'email' });
        }
      }

      if (tasks.length > 0) await Promise.allSettled(tasks);
    }

    console.log(`[sendPaymentReminders] ${sent.length} reminders sent`);
    return Response.json({ success: true, reminders_sent: sent.length, breakdown: sent });
  } catch (error) {
    console.error('[sendPaymentReminders]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
