import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function bookingEmail({ clientName, procedures, departureDate, destination, caseRef }: {
  clientName: string; procedures: string; departureDate: string;
  destination: string; caseRef: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#060B16;padding:32px;text-align:center;">
  <img src="${APP_URL}/morales-m-mark.png" width="64" alt="M" style="display:block;margin:0 auto 16px;" />
  <div style="font-family:Georgia,serif;font-size:24px;color:#fff;letter-spacing:0.04em;">${BRAND}</div>
  <div style="width:160px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:14px auto 0;"></div>
  <div style="margin-top:10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">Booking Confirmed</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#060B16;">Your journey begins, ${e(clientName)}.</h1>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#40514a;">
    We are honoured to be part of your health journey. Your booking request has been received and our concierge team is already preparing everything for your care abroad.
  </p>

  <table width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e7ede9;border-bottom:1px solid #e7ede9;margin-bottom:28px;">
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;width:40%;">Case Reference</td><td style="padding:10px 0;color:#060B16;font-size:14px;font-weight:700;">${e(caseRef)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Procedure(s)</td><td style="padding:10px 0;color:#060B16;font-size:14px;font-weight:600;">${e(procedures)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Destination</td><td style="padding:10px 0;color:#060B16;font-size:14px;font-weight:600;">${e(destination)}</td></tr>
    <tr><td style="padding:10px 0;color:#64746d;font-size:13px;">Departure Date</td><td style="padding:10px 0;color:#060B16;font-size:14px;font-weight:600;">${e(departureDate)}</td></tr>
  </table>

  <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#060B16;">What happens next:</p>
  <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
    ${[
      ['Your assigned doctor reviews your consultation', '24 hrs'],
      ['Travel agency prepares your flight & hotel package', '48 hrs'],
      ['Chauffeur assigned for all local transfers', '48 hrs'],
      ['Recovery companion briefed on your dietary needs', '72 hrs'],
      ['Secure document vault link sent to your email', '72 hrs'],
      ['Pre-departure check-in call from your concierge', '5 days'],
    ].map(([step, time]) => `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:32px;">
        <div style="width:22px;height:22px;background:#060B16;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:${GOLD};">✓</div>
      </td>
      <td style="padding:8px 0;font-size:13px;color:#40514a;line-height:1.5;">${step}</td>
      <td style="padding:8px 0;text-align:right;font-size:12px;color:#64746d;white-space:nowrap;">${time}</td>
    </tr>`).join('')}
  </table>

  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#060B16;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">
    View My Journey →
  </a>

  <!-- MedGuard protection notice -->
  <div style="margin:28px 0 0;padding:18px 20px;background:#060B1612;border:1px solid #D4AF3730;border-radius:14px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font-size:20px;">🛡️</span>
      <span style="font-size:13px;font-weight:700;color:#060B16;letter-spacing:0.5px;">Protected by MedGuard™</span>
    </div>
    <p style="margin:0;font-size:13px;color:#40514a;line-height:1.6;">
      From the moment your journey begins, <strong>MedGuard™</strong> monitors your safety in real time.
      Our behavioral prediction engine watches for signs of risk — missed check-ins, GPS silence,
      late-night risk patterns — and dispatches your concierge or security team automatically,
      before you ever need to ask for help.
      <br/><br/>
      <em>You are never alone on a Morales journey.</em>
    </p>
  </div>

  <p style="margin:20px 0 0;font-size:13px;color:#64746d;line-height:1.6;">
    Questions? Reach us on WhatsApp anytime. Your dedicated concierge is available 24/7.<br/>
    This is an automated confirmation. Please do not reply to this email.
  </p>
  <p style="margin:14px 0 0;font-size:14px;color:#060B16;font-weight:700;">The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, consultation_id, internal_secret } = await body();

  // SECURITY: had zero auth and no real caller could be found anywhere in
  // the repo — anyone with a case_id/consultation_id could re-trigger a
  // real "booking confirmed" email + push at a real patient repeatedly.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!case_id && !consultation_id) return err('case_id or consultation_id is required');

  let caseRecord: any = null;
  if (case_id) {
    caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  } else {
    const rows = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id }).catch(() => []);
    caseRecord = rows[0] ?? null;
  }
  if (!caseRecord) return err('Case not found');

  const clientEmail = caseRecord.client_email;
  if (!clientEmail) return err('No client email on case');

  const clientName   = caseRecord.client_name || 'Valued Patient';
  const procedures   = (caseRecord.procedures || []).join(', ') || 'Procedure TBC';
  const destination  = caseRecord.procedure_country || caseRecord.destination_country || 'Your destination';
  const caseRef      = caseRecord.id?.slice(-8).toUpperCase() || 'N/A';
  const departureDate = caseRecord.departure_date
    ? new Date(caseRecord.departure_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'To be confirmed';

  // Sync departure_date from Consultation if not already on CaseRecord
  // This enables sendTravelCountdownReminders to query by departure_date.
  if (!caseRecord.departure_date && caseRecord.consultation_id) {
    const consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null);
    if (consultation?.preferred_date) {
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        departure_date: consultation.preferred_date,
        procedure_date: consultation.preferred_date,
      }).catch(() => {});
    }
  }

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND,
    to: clientEmail,
    subject: `Your Morales journey is confirmed — ${caseRef}`,
    body: bookingEmail({ clientName, procedures, departureDate, destination, caseRef }),
  });

  // Push notification — device buzz on booking confirmation
  base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
    user_email: clientEmail,
    title:      '✈️ Booking Confirmed',
    body:       `Your journey to ${destination} is confirmed. Case ${caseRef}.`,
    url:        '/dashboard',
    type:       'booking',
    tag:        `booking-${caseRecord.id}`,
    internal_secret: Deno.env.get('CRON_SECRET'),
  }).catch(() => {});

  return ok({ sent_to: clientEmail, case_ref: caseRef });
}, { name: 'sendBookingConfirmation', requireAuth: false, allowedRoles: [] }));
