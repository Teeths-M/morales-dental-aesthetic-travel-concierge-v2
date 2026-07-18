import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../_shared/notify.ts';

/**
 * sendTravelCountdownReminders
 *
 * Run daily (cron). Tells every party involved in an upcoming journey that a
 * milestone has arrived and that their brief is waiting in their portal.
 *
 * Works for both booking types:
 *   medical_package — patient + doctor + travel + driver + companion
 *   travel_only     — patient + travel agency + driver only
 *
 * Milestone schedule: 14 / 7 / 3 / 1 days, then day-of.
 *
 * ── Link-only (policy, 2026-07-18) ──────────────────────────────────────────
 * This function used to be the platform's largest leak. It sent, by email and
 * SMS, to third parties: the patient's full name, their procedure list, their
 * departure date, their pickup address and their phone number — including an
 * SMS to a driver reading "TODAY is <name>'s pickup day. Patient phone: <num>",
 * and an email to a doctor reading "Patient <name> is scheduled for <procedure>
 * and departs on <date>". Anyone holding the handset, or reading over a
 * shoulder, learned that a named person was travelling abroad for surgery.
 *
 * Every recipient now gets the same thing: which milestone, and a link. The
 * checklists that used to be inlined here live in each portal, where they are
 * behind a login and can be kept current without a redeploy.
 *
 * `linkOnlyEmail` / `linkOnlySms` throw if a body carries an amount, a date, a
 * phone number, an email or an ID — so a future edit cannot quietly re-leak.
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// ── SMS helper (Twilio) ───────────────────────────────────────────────────────
async function sms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

/**
 * How near the journey is, in words. Deliberately relative ("in 3 days") and
 * never the actual date — a date plus a destination is most of a travel
 * itinerary, and the guard rejects `YYYY-MM-DD` anyway.
 */
function whenPhrase(daysLeft: number): string {
  if (daysLeft === 0) return 'today';
  if (daysLeft === 1) return 'tomorrow';
  return `in ${daysLeft} days`;
}

// ── Build all reminder dispatches for a given milestone ───────────────────────
async function buildMilestoneDispatches(base44: any, c: any, daysLeft: number): Promise<Promise<unknown>[]> {
  const tasks: Promise<unknown>[] = [];
  const isMedical = c.booking_type !== 'travel_only';
  const when = whenPhrase(daysLeft);

  // ── 1. Patient ────────────────────────────────────────────────────────────
  if (c.client_email) {
    tasks.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: c.client_email,
        // No name in the subject: inbox previews are visible on a lock screen.
        subject: `Your journey ${when} — your briefing is ready | ${BRAND}`,
        body: linkOnlyEmail({
          from: 'sendTravelCountdownReminders/patient',
          title: `Your journey begins ${when}.`,
          line: 'Your preparation briefing and checklist for this milestone are ready in your Morales dashboard.',
          ctaLabel: 'View My Journey',
          ctaUrl: `${APP_URL}/dashboard/journey`,
        }),
      }),
    );
    // SMS at the two closest milestones only — don't spam.
    if ((daysLeft === 1 || daysLeft === 3) && c.client_phone) {
      tasks.push(sms(c.client_phone, linkOnlySms({
        from: 'sendTravelCountdownReminders/patient',
        line: `Your Morales journey begins ${when}. Your briefing is ready.`,
        url: `${APP_URL}/dashboard/journey`,
      })));
    }
  }

  // ── 2. Travel agency ──────────────────────────────────────────────────────
  const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []);
  const agency = (agencies as any[]).find((a: any) => a.id === c.travel_vendor_id) ?? (agencies as any[])[0];
  if (agency?.email) {
    tasks.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: agency.email,
        subject: `A booking milestone needs your confirmation | ${BRAND}`,
        body: linkOnlyEmail({
          from: 'sendTravelCountdownReminders/agency',
          title: `A journey you are coordinating departs ${when}.`,
          line: 'Confirmations are outstanding for this milestone. Open your portal to review the booking and confirm.',
          ctaLabel: 'Open Agency Portal',
          ctaUrl: `${APP_URL}/travel-agency-dashboard`,
        }),
      }),
    );
  }

  // ── 3. Driver / chauffeur ─────────────────────────────────────────────────
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver = (drivers as any[]).find((d: any) => d.id === c.origin_driver_id || d.id === c.destination_driver_id) ?? (drivers as any[])[0];
  if (driver?.email) {
    tasks.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: driver.email,
        subject: `A scheduled pickup needs your confirmation | ${BRAND}`,
        body: linkOnlyEmail({
          from: 'sendTravelCountdownReminders/driver',
          title: `You have a pickup scheduled ${when}.`,
          line: 'The pickup address, timing and any assistance requirements are in your transfer portal. Please confirm your availability there.',
          ctaLabel: 'View Transfer Portal',
          ctaUrl: `${APP_URL}/taxi-service-dashboard`,
        }),
      }),
    );
    if (daysLeft === 1 && driver.phone) {
      tasks.push(sms(driver.phone, linkOnlySms({
        from: 'sendTravelCountdownReminders/driver',
        line: 'You have a Morales pickup tomorrow. Please confirm in your portal.',
        url: `${APP_URL}/taxi-service-dashboard`,
      })));
    }
  }

  // ── 4. Companion (medical only) ───────────────────────────────────────────
  if (isMedical && c.companion_assignment_id) {
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ id: c.companion_assignment_id }).catch(() => []);
    const assignment = (assignments as any[])[0];
    if (assignment?.companion_id) {
      const companion = await base44.asServiceRole.entities.Companion.get(assignment.companion_id).catch(() => null);
      if (companion?.email) {
        tasks.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: companion.email,
            subject: `A care assignment milestone is due | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'sendTravelCountdownReminders/companion',
              title: `An assignment you are supporting begins ${when}.`,
              line: 'Your recovery brief, dietary requirements and preparation steps are in your companion dashboard.',
              ctaLabel: 'Open Companion Dashboard',
              ctaUrl: `${APP_URL}/companion-dashboard`,
            }),
          }),
        );
      }
    }
  }

  // ── 5. Doctor (medical only) ──────────────────────────────────────────────
  if (isMedical && c.doctor_email) {
    tasks.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BRAND, to: c.doctor_email,
        // Was: "<N>-day clinical reminder: <patient name>" — the subject line
        // alone disclosed that a named person was your surgical patient.
        subject: `A scheduled case needs clinical review | ${BRAND}`,
        body: linkOnlyEmail({
          from: 'sendTravelCountdownReminders/doctor',
          title: `A patient in your care arrives ${when}.`,
          line: 'The clinical brief, medical history and pre-procedure checklist are in your doctor dashboard.',
          ctaLabel: 'Open Doctor Dashboard',
          ctaUrl: `${APP_URL}/doctor-dashboard`,
        }),
      }),
    );
  }

  return tasks;
}

// ── Day-of messages ───────────────────────────────────────────────────────────
async function buildDayOfDispatches(base44: any, c: any): Promise<Promise<unknown>[]> {
  const tasks: Promise<unknown>[] = [];

  if (c.client_phone) {
    tasks.push(sms(c.client_phone, linkOnlySms({
      from: 'sendTravelCountdownReminders/dayof-patient',
      line: 'Today is your Morales journey day. Everything is confirmed — your brief is ready.',
      url: `${APP_URL}/dashboard/journey`,
    })));
  }
  if (c.client_email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: c.client_email,
      subject: `Today is your day. Safe travels. | ${BRAND}`,
      body: linkOnlyEmail({
        from: 'sendTravelCountdownReminders/dayof-patient',
        title: 'Today is the day.',
        line: 'Your journey begins today and everything is in place. Your departure brief and live journey view are in your dashboard.',
        ctaLabel: 'Track My Journey',
        ctaUrl: `${APP_URL}/dashboard/journey`,
      }),
    }));
  }
  // Driver day-of. Was an SMS carrying the patient's name AND phone number.
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver = (drivers as any[]).find((d: any) => d.id === c.origin_driver_id) ?? (drivers as any[])[0];
  if (driver?.phone) {
    tasks.push(sms(driver.phone, linkOnlySms({
      from: 'sendTravelCountdownReminders/dayof-driver',
      line: 'You have a Morales pickup today. Passenger contact and route are in your portal.',
      url: `${APP_URL}/taxi-service-dashboard`,
    })));
  }
  return tasks;
}

// ── Main ──────────────────────────────────────────────────────────────────────
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
    const today   = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Load all active cases with departure dates
    const ACTIVE_STATUSES = ['Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress'];
    const allCases = await base44.asServiceRole.entities.CaseRecord.filter(
      { status: ACTIVE_STATUSES[0] }, '-departure_date', 50
    ).catch(() => []);
    // Also load other statuses (CaseRecord filter doesn't support $in easily, so load multiple)
    const moreCases = await Promise.allSettled(
      ACTIVE_STATUSES.slice(1).map(s => base44.asServiceRole.entities.CaseRecord.filter({ status: s }, '-departure_date', 50).catch(() => []))
    );
    const cases = [
      ...allCases,
      ...moreCases.flatMap(r => r.status === 'fulfilled' ? r.value as any[] : []),
    ].filter((c: any) => c.departure_date);

    const sent: { case_id: string; milestone: string; parties: number }[] = [];

    for (const c of cases as any[]) {
      const depMs   = new Date(c.departure_date).setUTCHours(0, 0, 0, 0);
      const daysLeft = Math.round((depMs - todayMs) / 86_400_000);

      let milestone: string | null = null;
      let flagField: string | null = null;

      if      (daysLeft === 14 && !c.travel_reminder_14d_sent)    { milestone = '14d'; flagField = 'travel_reminder_14d_sent'; }
      else if (daysLeft === 7  && !c.travel_reminder_7d_sent)     { milestone = '7d';  flagField = 'travel_reminder_7d_sent'; }
      else if (daysLeft === 3  && !c.travel_reminder_3d_sent)     { milestone = '3d';  flagField = 'travel_reminder_3d_sent'; }
      else if (daysLeft === 1  && !c.travel_reminder_1d_sent)     { milestone = '1d';  flagField = 'travel_reminder_1d_sent'; }
      else if (daysLeft === 0  && !c.travel_reminder_day_of_sent) { milestone = '0d';  flagField = 'travel_reminder_day_of_sent'; }

      if (!milestone || !flagField) continue;

      const tasks = daysLeft === 0
        ? await buildDayOfDispatches(base44, c)
        : await buildMilestoneDispatches(base44, c, daysLeft);

      tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { [flagField]: true }));

      const results = await Promise.allSettled(tasks);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      sent.push({ case_id: c.id, milestone, parties: succeeded - 1 }); // -1 for the CaseRecord update
      console.log(`[sendTravelCountdownReminders] case=${c.id} milestone=${milestone} dispatches=${tasks.length - 1}`);
    }

    return Response.json({ success: true, reminders_sent: sent.length, breakdown: sent });
  } catch (error) {
    console.error('[sendTravelCountdownReminders]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
