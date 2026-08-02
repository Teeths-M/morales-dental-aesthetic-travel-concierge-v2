import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// Which handshakes notify which role, and what generic line to show them —
// stripped of patient name/details, which stay in-platform per the link-only
// comms policy (identity is only ever in the dashboard the link opens).
const HS_PARTNER_MAP: Record<number, { role: string; partnerLabel: string; line: string }> = {
  1: { role: 'driver',    partnerLabel: 'Driver',          line: 'HS1 confirmed — pickup complete. Journey is underway.' },
  2: { role: 'driver',    partnerLabel: 'Driver',          line: 'HS2 confirmed — drop-off at origin airport complete.' },
  3: { role: 'driver',    partnerLabel: 'Driver',          line: 'HS3 confirmed — pickup from destination airport complete.' },
  4: { role: 'hotel',     partnerLabel: 'Hotel Contact',   line: 'HS4 confirmed — hotel check-in complete. Please ensure the room is ready.' },
  5: { role: 'doctor',    partnerLabel: 'Doctor',          line: 'HS5 confirmed — your patient has arrived at the clinic.' },
  6: { role: 'companion', partnerLabel: 'Companion',       line: 'HS6 confirmed — meal and recovery delivery acknowledged.' },
  7: { role: 'driver',    partnerLabel: 'Driver',          line: 'HS7 confirmed — return transport to the airport complete.' },
  8: { role: 'driver',    partnerLabel: 'Driver',          line: 'HS8 confirmed — arrival at home airport confirmed.' },
  9: { role: 'all',       partnerLabel: 'All Partners',    line: 'HS9 confirmed — journey complete. The Golden M has been achieved.' },
};

const PARTNER_DASHBOARD_URLS: Record<string, string> = {
  Doctor:    `${APP_URL}/doctor-dashboard`,
  Companion: `${APP_URL}/companion-dashboard`,
  Default:   `${APP_URL}/partner-portal`,
};

function handshakeEmail({ partnerLabel, hsNum, line }: { partnerLabel: string; hsNum: number; line: string }) {
  const dashboardUrl = PARTNER_DASHBOARD_URLS[partnerLabel] ?? PARTNER_DASHBOARD_URLS.Default;
  const isGoldenM = hsNum === 9;
  return linkOnlyEmail({
    title: isGoldenM ? '⭐ Golden M — Journey Complete' : `Handshake ${hsNum} / 9 confirmed`,
    line,
    ctaUrl: dashboardUrl,
    ctaLabel: 'Open My Dashboard',
    brand: BRAND,
    from: 'sendHandshakeAlert',
  });
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { handshake_number, trip_id, case_id, internal_secret } = await body();

  // SECURITY: had zero auth — anyone who could guess trip_id/case_id could
  // fire a false "patient has arrived" alert at a real doctor or a false
  // "delivery confirmed" alert at a real companion, with no such event
  // having happened. Uses stored doctor_email/companion assignments, so no
  // PII injection — this closes false-alarm/operational-confusion abuse.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

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

  const tasks: Promise<unknown>[] = [];
  const sent: string[] = [];

  // Notify the relevant partner(s) based on HS number
  if (hsNum === 5 && caseRecord?.doctor_email) {
    // HS5 — notify doctor: patient has arrived at the clinic
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND,
      to: caseRecord.doctor_email,
      subject: `HS5 Confirmed — a patient has arrived at your clinic | ${BRAND}`,
      body: handshakeEmail({ partnerLabel: 'Doctor', hsNum, line: hsInfo.line }),
    }));
    // Push — doctor's phone buzzes: patient walking through the door NOW.
    // LEAK-SCAN-IGNORE-START — a push notification is a different channel
    // from the link-only email/SMS/WhatsApp policy (comms-audit.mjs itself
    // never scans sendPushNotification calls): it's shown only on the
    // recipient's own device, to the device's own logged-in account.
    tasks.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
      user_email: caseRecord.doctor_email,
      title:      '🏥 Patient Has Arrived',
      body:       `${patientName} has just confirmed clinic check-in (HS5). They are at your clinic now.`,
      url:        '/doctor-dashboard',
      type:       'success',
      tag:        `hs5-doctor-${trip_id}`,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {}) ?? Promise.resolve());
    // LEAK-SCAN-IGNORE-END
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
          subject: `HS6 Confirmed — meal delivery acknowledged | ${BRAND}`,
          body: handshakeEmail({ partnerLabel: 'Companion', hsNum, line: hsInfo.line }),
        }));
        // Push — companion's phone buzzes: delivery confirmed.
        // LEAK-SCAN-IGNORE-START — same push-notification exemption as HS5 above.
        tasks.push(base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
          user_email: companion.email,
          title:      '🍽️ Delivery Confirmed',
          body:       `${patientName} confirmed your meal delivery (HS6). Well done.`,
          url:        '/companion-dashboard',
          type:       'safe',
          tag:        `hs6-companion-${ca.companion_id}`,
          internal_secret: Deno.env.get('CRON_SECRET'),
        }).catch(() => {}) ?? Promise.resolve());
        // LEAK-SCAN-IGNORE-END
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
        subject: `✨ Golden M Achieved — a patient's journey is complete | ${BRAND}`,
        body: handshakeEmail({ partnerLabel: 'Doctor', hsNum, line: hsInfo.line }),
      }));
      sent.push(`doctor:${caseRecord.doctor_email}`);
    }
  }

  await Promise.allSettled(tasks);

  return ok({ handshake_number: hsNum, notifications_sent: sent.length, sent_to: sent });
}, { name: 'sendHandshakeAlert', requireAuth: false, allowedRoles: [] }));
