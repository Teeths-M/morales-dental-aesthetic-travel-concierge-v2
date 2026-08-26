import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

/**
 * sweepVirtualConsultationReminders — hourly (freshness-cron.yml's hourly
 * tier — a consultation is time-of-day scheduled, unlike travel-date
 * milestones, which is why this runs hourly rather than daily like
 * sendTravelCountdownReminders). 24h / 1h / device-test-nudge ladder, each
 * gated on its own idempotent flag, link-only throughout. Per-record
 * failures are isolated so one bad record can't abort the sweep.
 */

const BRAND = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

async function sms(to: string, msg: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID'), auth = Deno.env.get('TWILIO_AUTH_TOKEN'), from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !auth || !from || !to) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: msg }).toString(),
  }).catch(() => {});
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const now = Date.now();
  const upcoming = await base44.asServiceRole.entities.VirtualConsultation.filter({ status: 'confirmed' }, '-scheduled_at', 200).catch(() => []);
  const also = await base44.asServiceRole.entities.VirtualConsultation.filter({ status: 'device_check_complete' }, '-scheduled_at', 200).catch(() => []);
  const consultations = [...(upcoming as any[]), ...(also as any[])];

  const sent: string[] = [];

  for (const vc of consultations) {
    try {
      if (!vc.scheduled_at) continue;
      const msUntil = new Date(vc.scheduled_at).getTime() - now;
      if (msUntil < 0) continue; // already past — no-show handling is a separate concern

      const hoursUntil = msUntil / (60 * 60 * 1000);

      if (hoursUntil <= 24 && hoursUntil > 23 && !vc.reminder_24h_sent) {
        await Promise.allSettled([
          vc.client_email && base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: vc.client_email,
            subject: `Your consultation is tomorrow | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'sweepVirtualConsultationReminders/24h-patient',
              title: 'Your virtual consultation is tomorrow.',
              line: 'Meet the real care team, understand every step, and proceed only when you are confident. Please complete your device test before it starts.',
              ctaLabel: 'Open My Consultation', ctaUrl: `${APP_URL}/dashboard`,
            }),
          }),
          vc.doctor_email && base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: vc.doctor_email,
            subject: `A virtual consultation is tomorrow | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'sweepVirtualConsultationReminders/24h-doctor',
              title: 'You have a virtual consultation tomorrow.',
              line: 'Details are in your doctor dashboard.',
              ctaLabel: 'Open Doctor Dashboard', ctaUrl: `${APP_URL}/doctor-dashboard`,
            }),
          }),
          base44.asServiceRole.entities.VirtualConsultation.update(vc.id, { reminder_24h_sent: true }),
        ]);
        sent.push(`${vc.id}:24h`);
      } else if (hoursUntil <= 1 && hoursUntil > 0.75 && !vc.reminder_1h_sent) {
        await Promise.allSettled([
          vc.client_email && sms(await patientPhone(base44, vc.client_email), linkOnlySms({
            from: 'sweepVirtualConsultationReminders/1h-patient',
            line: 'Your Morales virtual consultation starts in about an hour.',
            url: `${APP_URL}/dashboard`,
          })),
          base44.asServiceRole.entities.VirtualConsultation.update(vc.id, { reminder_1h_sent: true }),
        ]);
        if (vc.case_id && vc.client_email) {
          await logJourneyEvent(base44, {
            case_id: vc.case_id, client_email: vc.client_email,
            event_type: 'virtual_consultation_reminder', source: 'sweepVirtualConsultationReminders',
            message_text: 'Your virtual consultation starts in about an hour. If you haven\'t already, please complete your device test.',
            priority: 'medium', action_taken: 'Sent 1-hour reminder',
          });
        }
        sent.push(`${vc.id}:1h`);
      } else if (hoursUntil <= 2 && !vc.device_test_nudge_sent && !vc.device_test_completed_by_patient_at) {
        await Promise.allSettled([
          vc.client_email && base44.asServiceRole.integrations.Core.SendEmail({
            from_name: BRAND, to: vc.client_email,
            subject: `Complete your device test before your consultation | ${BRAND}`,
            body: linkOnlyEmail({
              from: 'sweepVirtualConsultationReminders/device-test',
              title: 'A quick device test before your consultation.',
              line: 'Check your camera and microphone now so there are no surprises when your consultation starts.',
              ctaLabel: 'Test My Device', ctaUrl: `${APP_URL}/dashboard`,
            }),
          }),
          base44.asServiceRole.entities.VirtualConsultation.update(vc.id, { device_test_nudge_sent: true }),
        ]);
        sent.push(`${vc.id}:device_test`);
      }
    } catch (e) {
      console.error('[sweepVirtualConsultationReminders] vc', vc?.id, e);
    }
  }

  return ok({ success: true, checked: consultations.length, sent });
}, { name: 'sweepVirtualConsultationReminders', requireAuth: false, rateLimit: false }));

// Best-effort phone lookup — VirtualConsultation itself has no phone field
// (it's a booking record, not a contact-info record); the patient's real
// phone lives on Consultation.
async function patientPhone(base44: any, clientEmail: string): Promise<string> {
  const rows = await base44.asServiceRole.entities.Consultation.filter({ email: clientEmail }, '-created_date', 1).catch(() => []);
  return (rows as any[])[0]?.phone || '';
}
