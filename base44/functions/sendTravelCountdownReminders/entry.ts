import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * sendTravelCountdownReminders
 *
 * Run daily (cron). Sends countdown communications to ALL parties involved
 * in an upcoming journey — patient, travel agency, driver, companion, doctor.
 *
 * Works for both booking types:
 *   medical_package — patient + doctor + travel + driver + companion
 *   travel_only     — patient + travel agency + driver only
 *
 * Milestone schedule:
 *   14 days — gentle awareness, set expectations
 *    7 days — action items, request final confirmations
 *    3 days — high-readiness briefing for all parties
 *    1 day  — final briefing + SMS to patient and driver
 *    Day of — go time: SMS to patient, driver, and key contacts
 */

const BRAND   = 'Morales Medical Travel Safety';
const GOLD    = '#D4AF37';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── SMS helper (Twilio) ───────────────────────────────────────────────────────
async function sms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

// ── Premium email template ────────────────────────────────────────────────────
function countdownEmail({ eyebrow, headline, subline, recipientName, sections, ctaLabel, ctaUrl, footer }: {
  eyebrow: string; headline: string; subline: string; recipientName: string;
  sections: { label: string; items: string[] }[];
  ctaLabel?: string; ctaUrl?: string; footer: string;
}) {
  const sectionsHtml = sections.map(s => `
  <div style="margin-bottom:20px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;">${e(s.label)}</div>
    <ul style="margin:0;padding-left:20px;">
      ${s.items.map(item => `<li style="font-size:14px;color:#40514a;line-height:1.9;padding:2px 0;">${e(item)}</li>`).join('')}
    </ul>
  </div>`).join('');

  return `<!doctype html><html><body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dde5df;border-radius:22px;overflow:hidden;">
<tr><td style="background:#060B16;padding:28px 32px;">
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">${BRAND}</div>
  <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:10px 0;"></div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">${e(eyebrow)}</div>
</td></tr>
<tr><td style="padding:32px 32px 0;">
  <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#13221d;line-height:1.2;">${e(headline)}</h1>
  <p style="margin:0 0 24px;font-size:15px;color:#40514a;line-height:1.7;">${e(subline)}</p>
  <div style="border-top:1px solid #e7ede9;padding-top:24px;">
    ${sectionsHtml}
  </div>
  ${ctaLabel && ctaUrl ? `
  <div style="margin:24px 0 0;">
    <a href="${e(ctaUrl)}" style="display:inline-block;background:#29483d;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;">${e(ctaLabel)} →</a>
  </div>` : ''}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #e7ede9;margin-top:28px;">
  <p style="margin:0;font-size:13px;color:#64746d;line-height:1.6;">${e(footer)}</p>
  <p style="margin:12px 0 0;font-size:14px;color:#13221d;font-weight:700;">The Morales Concierge Team</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Format date nicely ────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ── Build all reminder dispatches for a given milestone ───────────────────────
async function buildMilestoneDispatches(base44: any, c: any, daysLeft: number): Promise<Promise<unknown>[]> {
  const tasks: Promise<unknown>[] = [];
  const patientName  = c.client_name || 'Valued Patient';
  const firstName    = patientName.split(' ')[0];
  const depDate      = fmtDate(c.departure_date);
  const depShort     = fmtShort(c.departure_date);
  const caseRef      = c.id.slice(-8).toUpperCase();
  const isMedical    = c.booking_type !== 'travel_only';
  const procedures   = isMedical ? ((c.procedures || []).join(', ') || 'Procedure') : null;
  const dest         = c.procedure_country || c.destination_country || 'your destination';

  // ── 1. Patient reminder ───────────────────────────────────────────────────
  if (c.client_email) {
    const milestones: Record<number, { eyebrow: string; headline: string; subline: string; sections: any[]; smsMsg: string }> = {
      14: {
        eyebrow:  `14 Days Until Departure · ${caseRef}`,
        headline: `${firstName}, your journey begins in 14 days.`,
        subline:  `We are carefully preparing every detail of your experience in ${dest}. Here is how to make the most of the time remaining.`,
        sections: [
          { label: 'Before you travel', items: [
            'Ensure your passport is valid for at least 6 months beyond your return date',
            'Confirm your travel insurance is active and covers your destination',
            isMedical ? 'Avoid blood-thinning medications unless prescribed — confirm with your doctor' : null,
            'Arrange for any necessary vaccinations or health checks',
            isMedical ? 'Prepare a list of your current medications for the clinical team' : null,
            'Download the Morales app and ensure your emergency contacts are saved',
          ].filter(Boolean) as string[] },
          { label: 'Your journey at a glance', items: [
            `Departure date: ${depDate}`,
            `Destination: ${dest}`,
            isMedical ? `Procedure: ${procedures}` : null,
            `Case reference: ${caseRef}`,
          ].filter(Boolean) as string[] },
        ],
        smsMsg: `Hi ${firstName}, your Morales journey to ${dest} is 14 days away. Your concierge team is preparing everything. Questions? We're here 24/7. — ${BRAND}`,
      },
      7: {
        eyebrow:  `7 Days to Departure · ${caseRef}`,
        headline: `One week to go, ${firstName}.`,
        subline:  `Your travel date is ${depShort}. This is your 7-day preparation briefing — please review and complete the items below.`,
        sections: [
          { label: 'Action items — please complete this week', items: [
            'Confirm your driver has your home address and departure time',
            'Ensure your travel documents are packed and accessible',
            isMedical ? 'Begin any pre-procedure dietary adjustments as advised by your doctor' : null,
            'Download any required airline apps and check in when available (24–48 hrs before)',
            'Contact your concierge if you have any last-minute questions or changes',
          ].filter(Boolean) as string[] },
          { label: 'Your concierge has confirmed', items: [
            '✓ Flights and hotel — booked and confirmed',
            '✓ Ground transfers — scheduled',
            isMedical ? '✓ Clinical team — briefed on your arrival' : null,
            isMedical ? '✓ Recovery companion — notified and prepared' : null,
          ].filter(Boolean) as string[] },
        ],
        smsMsg: `Hi ${firstName}, one week until your Morales journey to ${dest}! Everything is confirmed. Your driver, hotel, and ${isMedical ? 'clinical team are' : 'transfer are'} ready. We're here if you need us. — ${BRAND}`,
      },
      3: {
        eyebrow:  `3 Days to Departure · ${caseRef}`,
        headline: `${firstName}, you leave in 3 days.`,
        subline:  `This is your comprehensive pre-travel briefing. Please read this carefully and contact your concierge with any final questions.`,
        sections: [
          { label: 'Final checklist', items: [
            '☐ Passport and ID packed',
            '☐ Travel insurance documents saved on your phone',
            '☐ Flight details and hotel booking confirmation printed or saved',
            isMedical ? '☐ Medication list prepared for the clinic' : null,
            '☐ Driver pickup confirmed (time and address)',
            '☐ Emergency contact informed of your travel plans',
            '☐ Local currency or travel card arranged',
          ].filter(Boolean) as string[] },
          { label: 'What happens when you arrive', items: [
            `Your driver will meet you at ${dest} airport`,
            isMedical ? 'Your companion will be at your hotel within 2 hours of check-in' : null,
            isMedical ? `Your clinic appointment is scheduled — your doctor will confirm the final time` : null,
            'Your Morales concierge is available 24/7 on WhatsApp throughout your stay',
          ].filter(Boolean) as string[] },
        ],
        smsMsg: `${firstName}, your journey to ${dest} is in 3 days. Final reminder: driver, hotel, and all arrangements are confirmed. Save your concierge WhatsApp for any day-of questions. — ${BRAND}`,
      },
      1: {
        eyebrow:  `Tomorrow Is Your Day · ${caseRef}`,
        headline: `${firstName}, tomorrow your journey begins.`,
        subline:  `Your departure is ${depDate}. This is your final briefing from the Morales Concierge team. We are honoured to be part of this chapter of your journey.`,
        sections: [
          { label: 'Tomorrow — what to expect', items: [
            'Your driver will contact you 30 minutes before pickup',
            'Arrive at the airport at least 2.5 hours before your flight',
            isMedical ? 'Your companion will receive your arrival details and be prepared' : null,
            'Your concierge is online 24/7 — do not hesitate to reach out',
          ].filter(Boolean) as string[] },
          { label: 'Carry with you', items: [
            'Passport and valid ID',
            'Booking confirmations (digital or printed)',
            isMedical ? 'Medication list and any prescription documentation' : null,
            'Travel insurance policy number',
            'Your Morales concierge WhatsApp number',
          ].filter(Boolean) as string[] },
        ],
        smsMsg: `${firstName}, tomorrow is your Morales journey day! Your driver is confirmed. Rest well tonight — everything is in place. We'll be with you every step of the way. — ${BRAND}`,
      },
    };

    const m = milestones[daysLeft];
    if (m) {
      tasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: c.client_email,
          subject: `${daysLeft === 1 ? 'Tomorrow is your day' : `${daysLeft} days to go`} — ${patientName} | ${BRAND}`,
          body: countdownEmail({ ...m, recipientName: patientName, ctaLabel: 'View My Journey', ctaUrl: `${APP_URL}/dashboard/journey`, footer: 'This is an automated reminder from your Morales Concierge team. Reply to this email or contact us on WhatsApp any time.' }),
        })
      );
      // SMS on 1 day and day-of only (don't spam)
      if ((daysLeft === 1 || daysLeft === 3) && c.client_phone) {
        tasks.push(sms(c.client_phone, m.smsMsg));
      }
    }
  }

  // ── 2. Travel Agency reminder ─────────────────────────────────────────────
  const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }).catch(() => []);
  const agency = (agencies as any[]).find((a: any) => a.id === c.travel_vendor_id) ?? (agencies as any[])[0];
  if (agency?.email) {
    const agencyMessages: Record<number, { headline: string; sections: any[] }> = {
      14: {
        headline: `14-day advance notice: ${patientName} departs ${depShort}`,
        sections: [{ label: 'Please confirm this week', items: [
          `All flights are ticketed and confirmed for ${patientName}`,
          'Hotel reservation is booked and confirmed',
          'Booking references shared with patient',
          'Any visa documentation has been handled or advised',
        ]}],
      },
      7: {
        headline: `7-day check-in: ${patientName} departs ${depShort}`,
        sections: [{ label: 'Please confirm by end of week', items: [
          'All flight and hotel bookings are active — no changes pending',
          `Patient (${patientName}) has received all confirmation documents`,
          'Any dietary or accessibility requirements flagged to the hotel',
          'Emergency contacts available should any issue arise with bookings',
        ]}],
      },
      3: {
        headline: `3-day notice: ${patientName} travels on ${depShort}`,
        sections: [{ label: 'Final confirmation required', items: [
          `Confirm all bookings remain active for ${patientName}`,
          'Forward hotel emergency contact number to Morales concierge',
          'Alert hotel of patient arrival time if known',
          'Standby for any last-minute accommodation requests',
        ]}],
      },
      1: {
        headline: `Tomorrow: ${patientName} travels — final confirmation`,
        sections: [{ label: 'Last action items', items: [
          `${patientName} departs tomorrow — please ensure all is in place`,
          'Hotel check-in details confirmed and accessible to patient',
          'Available today for any urgent changes',
        ]}],
      },
    };
    const am = agencyMessages[daysLeft];
    if (am) {
      tasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: agency.email,
          subject: `${daysLeft}-day reminder: ${patientName} — ${caseRef} | ${BRAND}`,
          body: countdownEmail({
            eyebrow:  `Travel Reminder · ${daysLeft} Days`,
            headline: am.headline,
            subline:  `This is a courtesy reminder from ${BRAND} regarding patient ${patientName} (Case ${caseRef}). Please review the items below and confirm your readiness.`,
            recipientName: agency.agency_name || agency.email,
            sections: am.sections,
            ctaLabel: 'View Partner Portal', ctaUrl: `${APP_URL}/travel-agency-dashboard`,
            footer: `This reminder is part of the ${BRAND} coordinated travel protocol. All partners receive this reminder simultaneously to keep every party synchronised.`,
          }),
        })
      );
    }
  }

  // ── 3. Driver/Chauffeur reminder ──────────────────────────────────────────
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver = (drivers as any[]).find((d: any) => d.id === c.origin_driver_id || d.id === c.destination_driver_id) ?? (drivers as any[])[0];
  if (driver?.email) {
    const driverMessages: Record<number, { headline: string; sections: any[] }> = {
      14: {
        headline: `Advance notice: ${patientName} — pickup in 14 days`,
        sections: [{ label: 'Your scheduled service', items: [
          `Patient: ${patientName}`,
          `Departure date: ${depDate}`,
          `Pickup location: ${c.client_pickup_address || 'Address to be confirmed'}`,
          'Please contact Morales if any conflict with your availability',
        ]}],
      },
      7: {
        headline: `7-day reminder: Pickup confirmed for ${patientName}`,
        sections: [{ label: 'Please confirm this week', items: [
          `Your vehicle is available on ${depDate}`,
          'Review the pickup address and planned route',
          `Patient ${patientName} may have special requirements — see your portal for details`,
          'Contact Morales if any schedule conflict arises',
        ]}],
      },
      3: {
        headline: `3-day notice: ${patientName} — pickup on ${depShort}`,
        sections: [{ label: 'Driver readiness checklist', items: [
          '☐ Vehicle confirmed clean and ready',
          '☐ Route to pickup address confirmed',
          `☐ Patient phone saved: ${c.client_phone || 'available in your portal'}`,
          '☐ Any mobility assistance equipment prepared',
          `☐ Airport drop-off terminal confirmed`,
        ]}],
      },
      1: {
        headline: `Tomorrow: ${patientName} pickup`,
        sections: [{ label: 'Final driver brief', items: [
          `${patientName} departs tomorrow — please confirm pickup time with the patient today`,
          `Pickup address: ${c.client_pickup_address || 'confirm via portal'}`,
          'Contact the Morales concierge immediately if any issue arises',
          'Have the patient\'s name displayed upon arrival',
        ]}],
      },
    };
    const dm = driverMessages[daysLeft];
    if (dm) {
      tasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: driver.email,
          subject: `${daysLeft}-day driver reminder: ${patientName} | ${BRAND}`,
          body: countdownEmail({
            eyebrow:  `Driver Reminder · ${daysLeft} Days`,
            headline: dm.headline,
            subline:  `This is a coordinated reminder from ${BRAND}. All parties involved in ${patientName}'s journey are receiving simultaneous updates to ensure complete synchronisation.`,
            recipientName: driver.driver_name || driver.company_name || driver.email,
            sections: dm.sections,
            ctaLabel: 'View Transfer Portal', ctaUrl: `${APP_URL}/taxi-service-dashboard`,
            footer: 'Please do not hesitate to contact the Morales concierge team if you have any questions or need to advise of any changes.',
          }),
        })
      );
      // SMS driver on 1 day before
      if (daysLeft === 1 && driver.phone) {
        tasks.push(sms(driver.phone, `Morales reminder: ${patientName} pickup is TOMORROW. Please confirm with the patient today and have the route ready. — ${BRAND}`));
      }
    }
  }

  // ── 4. Companion reminder (medical only) ─────────────────────────────────
  if (isMedical && c.companion_assignment_id) {
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ id: c.companion_assignment_id }).catch(() => []);
    const assignment = (assignments as any[])[0];
    if (assignment?.companion_id) {
      const companion = await base44.asServiceRole.entities.Companion.get(assignment.companion_id).catch(() => null);
      if (companion?.email) {
        const companionMessages: Record<number, { headline: string; items: string[] }> = {
          14: { headline: `Patient brief: ${patientName} arrives in 14 days`, items: [
            'Review the patient dietary and recovery brief in your dashboard',
            `Patient: ${patientName} · Procedure: ${procedures}`,
            'Confirm your availability and service dates with the Morales team',
          ]},
          7: { headline: `7 days: Prepare for ${patientName}'s arrival`, items: [
            'Review the AI recovery meal plan in your companion portal',
            `Patient ${patientName} arrives on ${depShort} — prepare the first recovery meal`,
            'Confirm your contact details are current in the system',
            'Reach out to the Morales team with any questions about the patient\'s brief',
          ]},
          3: { headline: `3 days: ${patientName} needs you — final preparation`, items: [
            `${patientName} arrives in 3 days — please prepare all recovery materials`,
            'Review dietary restrictions and allergen requirements one final time',
            'Ensure you have the hotel and clinic addresses saved',
            'The Morales concierge will send you a day-of arrival brief',
          ]},
          1: { headline: `Tomorrow: Your patient ${patientName} arrives`, items: [
            `${patientName} travels tomorrow — please be ready from arrival day`,
            'First contact: Check in with the patient within 2 hours of hotel check-in',
            'Recovery meal #1 should be prepared for the evening',
            'Morales concierge is on standby 24/7 if you need support',
          ]},
        };
        const cm = companionMessages[daysLeft];
        if (cm) {
          tasks.push(
            base44.asServiceRole.integrations.Core.SendEmail({
              from_name: BRAND, to: companion.email,
              subject: `${daysLeft}-day companion brief: ${patientName} | ${BRAND}`,
              body: countdownEmail({
                eyebrow:  `Companion Reminder · ${daysLeft} Days`,
                headline: cm.headline,
                subline:  `This is your ${daysLeft}-day coordinated reminder from ${BRAND}. All parties in ${patientName}'s care team are receiving this update simultaneously.`,
                recipientName: companion.full_name || companion.email,
                sections: [{ label: 'Your action items', items: cm.items }],
                ctaLabel: 'Open Companion Dashboard', ctaUrl: `${APP_URL}/companion-dashboard`,
                footer: 'Your compassionate care is central to what makes a Morales journey exceptional. Thank you for your dedication.',
              }),
            })
          );
        }
      }
    }
  }

  // ── 5. Doctor reminder (medical only) ────────────────────────────────────
  if (isMedical && c.doctor_email) {
    const doctorMessages: Record<number, string[]> = {
      14: [`Patient ${patientName} is scheduled for ${procedures} and departs for ${dest} on ${depDate}`, 'Please review the patient\'s medical history and pre-procedure notes', 'Confirm clinic availability and procedure room booking', 'The patient\'s full medical brief is available in your dashboard'],
      7:  [`${patientName} arrives in 7 days for ${procedures}`, 'Please confirm the procedure date and time with the Morales concierge', 'Ensure pre-operative instructions have been communicated to the patient', 'Contact the Morales team if any clinical concern has arisen'],
      3:  [`Final 3-day clinical reminder: ${patientName} arrives ${depShort}`, 'Confirm all pre-operative requirements are in place', 'Clinic team briefed and procedure room confirmed', 'Patient emergency contact available in your dashboard'],
      1:  [`${patientName} arrives TOMORROW for ${procedures}`, 'Final clinical preparation complete', 'Patient has received pre-operative instructions', 'Morales concierge available 24/7 if any clinical update is needed'],
    };
    const di = doctorMessages[daysLeft];
    if (di) {
      tasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: c.doctor_email,
          subject: `${daysLeft}-day clinical reminder: ${patientName} | ${BRAND}`,
          body: countdownEmail({
            eyebrow:  `Clinical Reminder · ${daysLeft} Days`,
            headline: `${daysLeft}-day notice: ${patientName} arrives ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}`,
            subline:  `This is your ${daysLeft}-day coordinated clinical reminder from ${BRAND}. Your patient ${patientName} is scheduled for ${procedures} in ${dest}.`,
            recipientName: 'Doctor',
            sections: [{ label: 'Pre-arrival checklist', items: di }],
            ctaLabel: 'Open Doctor Dashboard', ctaUrl: `${APP_URL}/doctor-dashboard`,
            footer: 'All partners in this patient\'s care team are receiving this update simultaneously to ensure complete synchronisation.',
          }),
        })
      );
    }
  }

  return tasks;
}

// ── Day-of messages ───────────────────────────────────────────────────────────
async function buildDayOfDispatches(base44: any, c: any): Promise<Promise<unknown>[]> {
  const tasks: Promise<unknown>[] = [];
  const firstName = (c.client_name || 'Valued Patient').split(' ')[0];
  const dest      = c.procedure_country || c.destination_country || 'your destination';

  if (c.client_phone) {
    tasks.push(sms(c.client_phone, `Today is your Morales journey day, ${firstName}. Your driver is confirmed and ready. Safe travels to ${dest} — we'll be with you every step. — ${BRAND}`));
  }
  if (c.client_email) {
    tasks.push(base44.asServiceRole.integrations.Core.SendEmail({
      from_name: BRAND, to: c.client_email,
      subject: `Today is your day, ${firstName}. Safe travels. | ${BRAND}`,
      body: countdownEmail({
        eyebrow: `Departure Day · ${c.id.slice(-8).toUpperCase()}`,
        headline: `Today is the day, ${firstName}.`,
        subline: `Your Morales journey to ${dest} begins today. Everything is in place. We wish you a safe and comfortable journey.`,
        recipientName: c.client_name,
        sections: [{ label: 'Today\'s brief', items: [
          'Your driver will contact you 30 minutes before pickup',
          'Check in online with your airline if you haven\'t already',
          'Your hotel and all transfers are confirmed',
          'Your Morales concierge is available on WhatsApp throughout your entire journey',
          'Emergency number: save your concierge contact before you leave',
        ]}],
        ctaLabel: 'Track My Journey', ctaUrl: `${APP_URL}/dashboard/journey`,
        footer: 'We are honoured to be part of your journey. Safe travels.',
      }),
    }));
  }
  // Driver day-of SMS
  const drivers = await base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }).catch(() => []);
  const driver = (drivers as any[]).find((d: any) => d.id === c.origin_driver_id) ?? (drivers as any[])[0];
  if (driver?.phone) {
    tasks.push(sms(driver.phone, `Morales: TODAY is ${c.client_name}'s pickup day. Please confirm arrival 30 mins before pickup. Patient phone: ${c.client_phone || 'in your portal'}. — ${BRAND}`));
  }
  return tasks;
}

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44  = createClientFromRequest(req);
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
