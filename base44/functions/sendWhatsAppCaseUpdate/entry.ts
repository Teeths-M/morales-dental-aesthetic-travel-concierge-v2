/**
 * sendWhatsAppCaseUpdate — generic "your case has an update" WhatsApp ping.
 *
 * NOTE: standalone and deliberately uncalled. Nothing in this repo wires it
 * to a CaseRecord.status write today (see bookingState.ts and its callers) —
 * that is a decided scope boundary, not an oversight. It stays safe and
 * dormant until an explicit, reviewed call site is added.
 *
 * LINK-ONLY: this used to hold a 28-entry STATUS_MESSAGES catalog and build
 * a message with "Hello ${patientName}", the raw case status, and "Reply to
 * this message" language — a straight identity + status + inbound-reply leak,
 * everything base44/shared/notify.ts exists to prevent. Fixed to send ONE
 * generic, status-agnostic line via linkOnlySms; the real status lives in the
 * patient's portal, same as every other migrated sender in this repo.
 *
 * Body contract simplified to `{ case_id }` (validated below) rather than the
 * old raw entity-trigger payload `{ data, old_data, changed_fields, event }` —
 * contact info and status are always re-read from the real CaseRecord, never
 * trusted from the request body, so this can't be used as a free WhatsApp-send
 * relay to an arbitrary number via a forged payload.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { linkOnlySms } from '../../shared/notify.ts';
import { isSpanish, toE164, sendWhatsApp } from '../../shared/twilioWhatsApp.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const CASE_UPDATE_COPY = {
  en: "There's an update on your case — open your portal to see it.",
  es: 'Hay una actualización en tu caso — abre tu portal para verla.',
};

const SendWhatsAppCaseUpdateSchema = strictObject({
  case_id: Fields.shortText(100),
});

// WhatsApp helpers (isSpanish, toE164, sendWhatsApp) imported from ../../shared/twilioWhatsApp.ts

Deno.serve(createHandler(async ({ req, base44, body }) => {
  // Cron secret OR admin session. This endpoint had NO guard at all: it is
  // reachable over HTTP like every deployed function, so anyone with the URL
  // could drive it — triggering real notifications, spend and state changes.
  // NOTE: a Base44-dashboard schedule driving this must send X-Cron-Secret.
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const { case_id } = await body<{ case_id: string }>();

  // SECURITY: contact info and status must always come from the real,
  // re-fetched CaseRecord — never from the request body — so this endpoint
  // can't be used as a free WhatsApp-send relay via Morales' own Twilio
  // account to an arbitrary number.
  const caseData = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseData) {
    return ok({ skipped: true, reason: 'Case not found' });
  }

  const patientPhone = toE164(caseData.client_phone);

  // Guard: opt-in required
  if (!caseData?.whatsapp_opt_in) {
    return ok({ skipped: true, reason: 'Patient has not opted in to WhatsApp notifications' });
  }

  // Guard: valid phone
  if (!patientPhone) {
    return ok({ skipped: true, reason: 'No valid E.164 phone number on record' });
  }

  const portalUrl = `${APP_URL}/dashboard`;

  // Guard: Stage 11 blackout check (inline flag + checkNotificationBlackout function)
  if (caseData?.notification_blackout_active) {
    await base44.asServiceRole.entities.NotificationLog.create({
      case_id,
      notification_type: 'sms',
      recipient_role: 'patient',
      recipient_identifier: patientPhone,
      event_trigger: 'sendWhatsAppCaseUpdate',
      suppressed_payload: { message: 'WhatsApp case-update notification suppressed during blackout' },
      suppression_reason: 'SURGICAL_EXECUTION_WINDOW_BLACKOUT',
      blackout_case_status: caseData.status,
      logged_at: new Date().toISOString(),
      replay_status: 'pending',
    });
    return ok({ skipped: true, reason: 'Notification blackout active (Stage 11)', logged: true });
  }

  // Guard: checkNotificationBlackout function (catches cases where flag may not yet be set)
  const blackoutRes = await base44.asServiceRole.functions.invoke('checkNotificationBlackout', {
    case_id,
    notification_type: 'sms',
    recipient_role: 'patient',
    recipient_identifier: patientPhone,
    event_trigger: 'sendWhatsAppCaseUpdate',
    internal_secret: Deno.env.get('CRON_SECRET'),
  }).catch(() => ({ suppressed: false }));

  if (blackoutRes?.suppressed || blackoutRes?.data?.suppressed) {
    return ok({ skipped: true, reason: 'Notification suppressed by checkNotificationBlackout', logged: true });
  }

  // Choose language
  const lang: 'en' | 'es' = isSpanish(caseData) ? 'es' : 'en';

  const res = await sendWhatsApp(patientPhone, linkOnlySms({
    from: 'sendWhatsAppCaseUpdate',
    line: CASE_UPDATE_COPY[lang],
    url: portalUrl,
  }));

  return ok({
    success: !!res.ok,
    case_id,
    language: lang,
  });
}, { name: 'sendWhatsAppCaseUpdate', requireAuth: false, bodySchema: SendWhatsAppCaseUpdateSchema }));
