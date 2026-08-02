import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';

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

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sendSms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
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
      const payUrl  = `${APP_URL}/portal-hub/checkout/${c.id}?type=full`;

      // Package price, deposit, card last-4 and patient identity all stay in
      // the checkout portal the link opens — never in the notification body.
      // ── Stage 1 — 2-hour warm recovery ───────────────────────────────────
      if (age >= HR_2 && !c.abandoned_1_sent) {
        if (c.client_email) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: c.client_email,
            subject: 'Your Morales package is still waiting for you',
            body: linkOnlyEmail({
              title: 'Your package is still waiting',
              line: 'Everything is reserved for you — your doctor, your travel, and your partners are standing by. Complete your booking before it expires.',
              ctaUrl: payUrl,
              ctaLabel: 'Complete My Booking',
              brand: BRAND,
              from: 'checkAbandonedBookings',
            }),
          }));
        }
        if (c.client_phone) {
          tasks.push(sendSms(c.client_phone, linkOnlySms({
            line: 'Your confirmed Morales package is still waiting — complete your booking before it expires.',
            url: payUrl,
            from: 'checkAbandonedBookings',
          })));
        }
        tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { abandoned_1_sent: true }));
        acted.push({ case_id: c.id, action: 'stage1_recovery' });
      }

      // ── Stage 2 — 24-hour firm reminder ──────────────────────────────────
      else if (age >= HR_24 && !c.abandoned_2_sent) {
        if (c.client_email) {
          tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: c.client_email,
            subject: 'Final notice: your package expires in 24 hours',
            body: linkOnlyEmail({
              title: 'Your package expires in 24 hours',
              line: 'We’ve been holding your confirmed quotes from your doctor, travel agency and driver. If payment is not received within 24 hours, these reservations will be released.',
              ctaUrl: payUrl,
              ctaLabel: 'Secure My Booking Now',
              brand: BRAND,
              from: 'checkAbandonedBookings',
            }),
          }));
        }
        if (c.client_phone) {
          tasks.push(sendSms(c.client_phone, linkOnlySms({
            line: 'Your Morales package expires in 24 hours. If payment is not received, your confirmed quotes will be released.',
            url: payUrl,
            from: 'checkAbandonedBookings',
          })));
        }
        tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { abandoned_2_sent: true }));
        acted.push({ case_id: c.id, action: 'stage2_final_notice' });
      }

      // ── Stage 3 — 48-hour quota release ──────────────────────────────────
      else if (age >= HR_48 && !c.quotas_released_at) {
        const releasedAt = new Date().toISOString();

        // Notify all 4 partners that quotes are released — patient identity
        // stays in the admin/partner dashboard, never in this notification.
        const [agencies, drivers] = await Promise.all([
          base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []),
          base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []),
        ]);
        const agency  = (agencies as any[])[0];
        const driver  = (drivers as any[])[0];

        const releaseNotice = linkOnlyEmail({
          title: 'A reserved slot has been released',
          line: 'A reserved package was released because payment was not completed within the required window. No further action is needed on your part.',
          ctaUrl: `${APP_URL}/partner-portal`,
          ctaLabel: 'Open My Portal',
          brand: BRAND,
          from: 'checkAbandonedBookings',
        });

        if (agency?.email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: agency.email, subject: 'Quote released — reserved slot no longer held', body: releaseNotice }));
        if (driver?.email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: driver.email, subject: 'Transfer quote released — reserved slot no longer held', body: releaseNotice }));
        if (c.doctor_email) tasks.push(base44.asServiceRole.integrations.Core.SendEmail({ from_name: BRAND, to: c.doctor_email, subject: 'Case released — reserved slot no longer held', body: releaseNotice }));

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
