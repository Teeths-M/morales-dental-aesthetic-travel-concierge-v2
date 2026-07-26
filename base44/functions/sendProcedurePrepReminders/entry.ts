import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';

/**
 * sendProcedurePrepReminders
 *
 * Run daily (cron). Nudges a patient back to their "M Prep Coach" card at
 * 7 / 3 / 1 days before their confirmed procedure_date, then day-of.
 *
 * Only fires once BOTH are true: the doctor has confirmed the procedure
 * (doctor_confirmation_status === 'CONFIRMED') and a payment has landed
 * (payment_status in the paid set) — this is deliberately narrower than
 * sendTravelCountdownReminders (which fires on departure_date for the whole
 * travel party). This function is patient-only: no third parties, no
 * logistics — it exists purely to pull the patient back to their prep
 * checklist, so there's nothing here for a driver/doctor/agency to act on.
 *
 * Link-only, same policy as every other outbound reminder in this codebase:
 * a generic teaser + a portal link, never a date, an amount or an identity.
 */

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const ACTIVE_STATUSES = ['PMP-25', 'PMP-50', 'Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel'];
const PAID_STATUSES = ['25% Paid', '50% Paid', 'Paid In Full'];

function whenPhrase(daysLeft: number): string {
  if (daysLeft === 0) return 'today';
  if (daysLeft === 1) return 'tomorrow';
  return `in ${daysLeft} days`;
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // CaseRecord.filter doesn't support $in, so load each status separately —
  // same approach sendTravelCountdownReminders already uses.
  const perStatus = await Promise.allSettled(
    ACTIVE_STATUSES.map((s) => base44.asServiceRole.entities.CaseRecord.filter({ status: s }, '-procedure_date', 50).catch(() => [])),
  );
  const cases = perStatus
    .flatMap((r) => (r.status === 'fulfilled' ? (r.value as any[]) : []))
    .filter((c: any) =>
      c.procedure_date
      && c.doctor_confirmation_status === 'CONFIRMED'
      && PAID_STATUSES.includes(c.payment_status),
    );

  const sent: { case_id: string; milestone: string }[] = [];

  for (const c of cases as any[]) {
    const procMs = new Date(c.procedure_date).setUTCHours(0, 0, 0, 0);
    const daysLeft = Math.round((procMs - todayMs) / 86_400_000);

    let milestone: string | null = null;
    let flagField: string | null = null;

    if      (daysLeft === 7 && !c.prep_reminder_7d_sent)     { milestone = '7d'; flagField = 'prep_reminder_7d_sent'; }
    else if (daysLeft === 3 && !c.prep_reminder_3d_sent)     { milestone = '3d'; flagField = 'prep_reminder_3d_sent'; }
    else if (daysLeft === 1 && !c.prep_reminder_1d_sent)     { milestone = '1d'; flagField = 'prep_reminder_1d_sent'; }
    else if (daysLeft === 0 && !c.prep_reminder_day_of_sent) { milestone = '0d'; flagField = 'prep_reminder_day_of_sent'; }

    if (!milestone || !flagField) continue;

    const when = whenPhrase(daysLeft);
    const tasks: Promise<unknown>[] = [];

    if (c.client_email) {
      tasks.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: BRAND, to: c.client_email,
          subject: `Your procedure is ${when} — your prep coach is ready | ${BRAND}`,
          body: linkOnlyEmail({
            from: 'sendProcedurePrepReminders',
            title: `Your procedure is ${when}.`,
            line: 'Your M Prep Coach has your countdown and remaining preparation steps ready in your dashboard.',
            ctaLabel: 'Open My Prep Coach',
            ctaUrl: `${APP_URL}/dashboard`,
          }),
        }),
      );
      // Best-effort push — non-blocking, mirrors how confirmProcedureDate fires
      // sendPreOpInstructions. A missing/failed push never blocks the email.
      base44.asServiceRole.functions?.invoke?.('sendPushNotification', {
        user_email: c.client_email,
        title: '🤖 M Prep Coach',
        body: `Your procedure is ${when}. Tap to see what's left on your checklist.`,
        url: '/dashboard',
      }).catch(() => {});
    }

    tasks.push(base44.asServiceRole.entities.CaseRecord.update(c.id, { [flagField]: true }));

    await Promise.allSettled(tasks);
    sent.push({ case_id: c.id, milestone });
  }

  return ok({ success: true, reminders_sent: sent.length, breakdown: sent });
}, { name: 'sendProcedurePrepReminders', requireAuth: false }));
