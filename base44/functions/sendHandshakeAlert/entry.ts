import { createHandler, ok, err } from '../_shared/createHandler.ts';

const BRAND   = 'Morales Dental & Aesthetics';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Which handshakes notify which role, and what message to show them
const HS_PARTNER_MAP: Record<number, { role: string; partnerLabel: string; message: string; icon: string }> = {
  1: { role: 'driver',    partnerLabel: 'Driver',          icon: '🚗', message: 'HS1 confirmed — your patient has been picked up from home. Journey is underway.' },
  2: { role: 'driver',    partnerLabel: 'Driver',          icon: '✈️', message: 'HS2 confirmed — patient dropped off at origin airport. Great work.' },
  3: { role: 'driver',    partnerLabel: 'Driver',          icon: '🛬', message: 'HS3 confirmed — patient collected from destination airport. Transfer complete.' },
  4: { role: 'hotel',     partnerLabel: 'Hotel Contact',   icon: '🏨', message: 'HS4 confirmed — patient has checked in to their hotel. Please ensure their room is ready and comfort items are in place.' },
  5: { role: 'doctor',    partnerLabel: 'Doctor',          icon: '🏥', message: 'HS5 confirmed — your patient has arrived at the clinic. Please proceed with your consultation protocol.' },
  6: { role: 'companion', partnerLabel: 'Companion',       icon: '🍽️', message: 'HS6 confirmed — meal and recovery delivery acknowledged. Excellent care.' },
  7: { role: 'driver',    partnerLabel: 'Driver',          icon: '🚕', message: 'HS7 confirmed — return transport from hotel to airport complete.' },
  8: { role: 'driver',    partnerLabel: 'Driver',          icon: '🛫', message: 'HS8 confirmed — patient has arrived at their home airport. Nearly there!' },
  9: { role: 'all',       partnerLabel: 'All Partners',    icon: '⭐', message: 'HS9 confirmed — patient safely home. Journey complete. Golden M achieved. Thank you for being part of this patient\'s care.' },
};

const PARTNER_DASHBOARD_URLS: Record<string, string> = {
  Doctor:    `${APP_URL}/doctor-dashboard`,
  Companion: `${APP_URL}/companion-dashboard`,
  Default:   `${APP_URL}/partner-portal`,
};

function handshakeEmail({ partnerName, partnerLabel, icon, hsNum, patientName, message, completedAt, caseRef }: {
  partnerName: string; partnerLabel: string; icon: string; hsNum: number;
  patientName: string; message: string; completedAt: string; caseRef: string;
}) {
  const dashboardUrl = PARTNER_DASHBOARD_URLS[partnerLabel] ?? PARTNER_DASHBOARD_URLS.Default;
  const isGoldenM = hsNum === 9;
  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:${isGoldenM ? '#060B16' : '#29483d'};padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:12px auto;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">
    ${isGoldenM ? '⭐ Golden M — Journey Complete' : `Handshake ${hsNum} / 9 — Confirmed`}
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:32px;text-align:center;margin-bottom:16px;">${icon}</div>
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#13221d;text-align:center;">
    ${isGoldenM ? 'Journey Complete' : `HS${hsNum} Confirmed`}
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#40514a;text-align:center;">
    Dear ${e(partnerName)}, <strong>${e(patientName)}</strong>'s journey milestone has been recorded.
  </p>

  <div style="background:#f8faf9;border:1px solid #e7ede9;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#40514a;">${e(message)}</p>
    <div style="display:flex;gap:16px;margin-top:14px;">
      <div><div style="font-size:11px;color:#64746d;text-transform:uppercase;letter-spacing:1px;">Patient</div>
        <div style="font-size:14px;font-weight:700;color:#13221d;">${e(patientName)}</div></div>
      <div><div style="font-size:11px;color:#64746d;text-transform:uppercase;letter-spacing:1px;">Case Ref</div>
        <div style="font-size:14px;font-weight:700;color:#13221d;">${e(caseRef)}</div></div>
      <div><div style="font-size:11px;color:#64746d;text-transform:uppercase;letter-spacing:1px;">Completed</div>
        <div style="font-size:14px;font-weight:700;color:#13221d;">${e(completedAt)}</div></div>
    </div>
  </div>

  ${isGoldenM ? `<div style="background:${GOLD}18;border:1px solid ${GOLD}44;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#13221d;font-style:italic;">
      "Thank you for the exceptional care you provided. Your professionalism made this patient's journey safe and memorable."
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#64746d;">— The Morales Concierge Team</p>
  </div>` : ''}

  <a href="${dashboardUrl}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">
    Open My Dashboard →
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#64746d;">This is an automated handshake notification from ${BRAND}. You are receiving this as a registered partner.</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { handshake_number, trip_id, case_id } = await body();
  if (!handshake_number || !trip_id) return err('handshake_number and trip_id are required');

  const hsNum = Number(handshake_number);
  const hsInfo = HS_PARTNER_MAP[hsNum];
  if (!hsInfo) return err(`Invalid handshake_number: ${hsNum}`);

  const trip = await base44.asServiceRole.entities.TravelRequest.get(trip_id).catch(() => null);
  if (!trip) return err('Trip not found');

  const caseRecord = (case_id || trip.case_id)
    ? await base44.asServiceRole.entities.CaseRecord.get(case_id || trip.case_id).catch(() => null)
    : null;

  const patientName  = trip.client_name || caseRecord?.client_name || 'Patient';
  const caseRef      = (case_id || trip.case_id || trip.id || '').slice(-8).toUpperCase();
  const completedAt  = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const tasks: Promise<unknown>[] = [];
  const sent: string[] = [];

  // Notify the relevant partner(s) based on HS number
  if (hsNum === 5 && caseRecord?.doctor_email) {
    // HS5 — notify doctor: patient has arrived at the clinic
    const doctor = await base44.asServiceRole.entities.Doctor.filter({ email: caseRecord.doctor_email }).then(r => r[0]).catch(() => null);
    const partnerName = doctor?.full_name || caseRecord.doctor_email;
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: caseRecord.doctor_email,
      subject: `HS5 Confirmed — ${patientName} has arrived at your clinic | ${BRAND}`,
      body: handshakeEmail({ partnerName, partnerLabel: 'Doctor', icon: '🏥', hsNum, patientName, message: hsInfo.message, completedAt, caseRef }),
    }));
    // Push — doctor's phone buzzes: patient walking through the door NOW
    tasks.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: caseRecord.doctor_email,
      title:      '🏥 Patient Has Arrived',
      body:       `${patientName} has just confirmed clinic check-in (HS5). They are at your clinic now.`,
      url:        '/doctor-dashboard',
      type:       'success',
      tag:        `hs5-doctor-${trip_id}`,
    }).catch(() => {}) ?? Promise.resolve());
    sent.push(`doctor:${caseRecord.doctor_email}`);
  }

  if (hsNum === 6) {
    // HS6 — notify companion: meal delivery acknowledged
    const companionAssignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ case_id: case_id || trip.case_id }).catch(() => []);
    for (const ca of companionAssignments) {
      const companion = ca.companion_id ? await base44.asServiceRole.entities.Companion.get(ca.companion_id).catch(() => null) : null;
      if (companion?.email) {
        tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND,
          to: companion.email,
          subject: `HS6 Confirmed — Meal delivery acknowledged for ${patientName} | ${BRAND}`,
          body: handshakeEmail({ partnerName: companion.full_name || companion.email, partnerLabel: 'Companion', icon: '🍽️', hsNum, patientName, message: hsInfo.message, completedAt, caseRef }),
        }));
        // Push — companion's phone buzzes: delivery confirmed
        tasks.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
          user_email: companion.email,
          title:      '🍽️ Delivery Confirmed',
          body:       `${patientName} confirmed your meal delivery (HS6). Well done.`,
          url:        '/companion-dashboard',
          type:       'safe',
          tag:        `hs6-companion-${ca.companion_id}`,
        }).catch(() => {}) ?? Promise.resolve());
        sent.push(`companion:${companion.email}`);
      }
    }
  }

  if (hsNum === 9) {
    // HS9 — notify all involved partners
    if (caseRecord?.doctor_email) {
      tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND,
        to: caseRecord.doctor_email,
        subject: `✨ Golden M Achieved — ${patientName}'s journey is complete | ${BRAND}`,
        body: handshakeEmail({ partnerName: 'Doctor', partnerLabel: 'Doctor', icon: '⭐', hsNum, patientName, message: hsInfo.message, completedAt, caseRef }),
      }));
      sent.push(`doctor:${caseRecord.doctor_email}`);
    }
  }

  await Promise.allSettled(tasks);

  return ok({ handshake_number: hsNum, notifications_sent: sent.length, sent_to: sent });
}, { name: 'sendHandshakeAlert', requireAuth: false }));
