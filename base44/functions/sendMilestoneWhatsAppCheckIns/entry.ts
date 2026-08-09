/**
 * sendMilestoneWhatsAppCheckIns — the Traveler Guardian WhatsApp sender.
 *
 * activateTravelerGuardian schedules six milestone SoloCheckIn records
 * (landed, arrived_at_hotel, pre_procedure, post_procedure, departure,
 * home_safe). Until now nothing actually SENT them — scheduleSoloCheckIns
 * only handles time-based email rounds and ignores milestone_type. This cron
 * closes that gap: for every milestone check-in whose scheduled_time has
 * arrived and that hasn't been sent yet, it delivers the check-in via
 * WhatsApp (with an email fallback when the traveler hasn't opted in or has
 * no valid phone), marks it sent, and logs the notification. The existing
 * escalation ladder (runSafetyMonitor / escalateSoloCheckIn) takes over if the
 * traveler doesn't respond.
 *
 * LINK-ONLY: the outbound WhatsApp/email body used to interpolate the
 * patient's name (email greeting) and carry per-milestone medical-status text
 * ("Your procedure is complete", "Heading home today?") straight into the
 * message — exactly the identity/status disclosure base44/shared/notify.ts
 * exists to prevent. Both channels now route through linkOnlySms/linkOnlyEmail
 * with one generic, milestone-agnostic line; the actual stage lives in-portal
 * behind the confirm link, same as every other migrated sender in this repo.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { isSpanish, toE164, sendWhatsApp } from '../../shared/twilioWhatsApp.ts';

const BRAND = 'Morales Medical Travel Safety';

// Generic, non-milestone-specific copy — no medical/journey status leaves the
// platform. milestone_type is still recorded on SoloCheckIn/NotificationLog
// (in-platform data, not an outbound body) so the portal can show the real
// per-stage detail once the traveler taps through.
const CHECKIN_COPY = {
  en: {
    title: 'A safety check-in is waiting for you.',
    line: "You have a Traveler Guardian check-in ready. Tap to confirm you're safe:",
    cta: "I'm Safe — Confirm Now",
  },
  es: {
    title: 'Tienes un check-in de seguridad pendiente.',
    line: 'Tienes un check-in de Traveler Guardian listo. Toca para confirmar que estás bien:',
    cta: 'Estoy Bien — Confirmar',
  },
};

// WhatsApp helpers (isSpanish, toE164, sendWhatsApp) imported from ../../shared/twilioWhatsApp.ts

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const now = new Date();
  const appUrl = (Deno.env.get('APP_URL') || 'https://morales.app').replace(/\/$/, '');

  // Pull pending check-ins and keep only due, unsent milestone ones.
  const pending = await base44.asServiceRole.entities.SoloCheckIn.filter(
    { status: 'pending' },
    'scheduled_time',
    200,
  ).catch(() => []);

  const due = (pending as any[]).filter(c =>
    c.milestone_type &&
    !c.sent_time &&
    c.scheduled_time &&
    new Date(c.scheduled_time).getTime() <= now.getTime()
  );

  let sentWhatsApp = 0;
  let sentEmail = 0;
  let skipped = 0;
  const logWrites: Promise<any>[] = [];

  const logNotification = (entry: Record<string, unknown>) =>
    base44.asServiceRole.entities.NotificationLog.create({
      created_at: now.toISOString(),
      ...entry,
    }).catch(() => null);

  for (const checkIn of due) {
    let caseRecord: any = null;
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(checkIn.case_id); } catch (_) { caseRecord = null; }
    if (!caseRecord) { skipped++; continue; }

    // Respect the surgical-execution blackout — don't ping mid-procedure.
    if (caseRecord.notification_blackout_active) { skipped++; continue; }

    const milestone = checkIn.milestone_type as string;
    const lang: 'en' | 'es' = isSpanish(caseRecord) ? 'es' : 'en';
    const copy = CHECKIN_COPY[lang];

    // One-time confirm token (reuses the existing CheckInToken flow).
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const rawToken = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    try {
      await base44.asServiceRole.entities.CheckInToken.create({
        check_in_id: checkIn.id,
        token_hash: tokenHash,
        expires_at: tokenExpiresAt,
        used_at: null,
        created_at: now.toISOString(),
      });
    } catch (_) { /* best-effort */ }
    const confirmLink = `${appUrl}/check-in/${checkIn.id}?token=${rawToken}`;

    const phone = toE164(caseRecord.client_phone);
    const optedIn = !!caseRecord.whatsapp_opt_in;
    const updateFields: any = { sent_time: now.toISOString() };
    let channel: 'whatsapp' | 'email' = 'email';

    if (optedIn && phone) {
      const body = linkOnlySms({
        from: 'sendMilestoneWhatsAppCheckIns',
        line: copy.line,
        url: confirmLink,
      });
      const res = await sendWhatsApp(phone, body);
      if (res.ok) {
        channel = 'whatsapp';
        sentWhatsApp++;
        updateFields.response_method = 'whatsapp';
        logWrites.push(logNotification({
          case_id: checkIn.case_id,
          channel: 'whatsapp',
          recipient_phone: phone,
          message_type: 'milestone_checkin',
          status: 'sent',
          milestone_type: milestone,
          notes: `Traveler Guardian milestone check-in sent via WhatsApp`,
          logged_at: now.toISOString(),
        }));
      } else {
        // WhatsApp failed — fall back to email so the milestone isn't lost.
        channel = 'email';
        logWrites.push(logNotification({
          case_id: checkIn.case_id,
          channel: 'whatsapp',
          recipient_phone: phone,
          message_type: 'milestone_checkin',
          status: 'failed',
          milestone_type: milestone,
          notes: res.error || 'WhatsApp send failed; falling back to email',
          logged_at: now.toISOString(),
        }));
      }
    }

    if (channel === 'email' && caseRecord.client_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: caseRecord.client_email,
          subject: `Traveler Guardian check-in | ${BRAND}`,
          body: linkOnlyEmail({
            from: 'sendMilestoneWhatsAppCheckIns',
            title: copy.title,
            line: copy.line,
            ctaLabel: copy.cta,
            ctaUrl: confirmLink,
          }),
        });
        sentEmail++;
        updateFields.response_method = 'app';
        logWrites.push(logNotification({
          case_id: checkIn.case_id,
          channel: 'email',
          recipient_email: caseRecord.client_email,
          message_type: 'milestone_checkin',
          status: 'sent',
          milestone_type: milestone,
          notes: optedIn ? 'WhatsApp failed or no phone — milestone sent via email fallback' : 'WhatsApp not opted in — milestone sent via email',
          logged_at: now.toISOString(),
        }));
      } catch (_) {
        skipped++;
        continue;
      }
    } else if (channel === 'email' && !caseRecord.client_email) {
      skipped++;
      continue;
    }

    try {
      await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, updateFields);
    } catch (_) { /* still counted */ }
  }

  await Promise.allSettled(logWrites);

  return ok({
    success: true,
    run_at: now.toISOString(),
    due: due.length,
    sent_whatsapp: sentWhatsApp,
    sent_email: sentEmail,
    skipped,
  });
}, { name: 'sendMilestoneWhatsAppCheckIns', requireAuth: false }));
