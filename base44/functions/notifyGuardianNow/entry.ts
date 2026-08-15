/**
 * notifyGuardianNow
 *
 * Traveler-initiated, immediate guardian alert — additive to (never a
 * replacement for) the existing system-driven 2h/3h/5h/9h SoloCheckIn
 * escalation ladder (scheduleSoloCheckIns/escalateSoloCheckIn). This is the
 * "M-Care, let my guardian know right now" path.
 *
 * Consent model:
 *  - An active GuardianSession already exists for the case -> that session
 *    IS the consent (the traveler already ran generateGuardianLink). Send
 *    through it immediately, regardless of is_confirmed_emergency.
 *  - No active session, and this is a routine (non-emergency) call -> never
 *    silently create a guardian relationship. Return needs_consent:true so
 *    the caller (M-Care) offers generateGuardianLink instead.
 *  - No active session, but is_confirmed_emergency:true -> auto-create one,
 *    mirroring triggerSOS's real precedent for a genuine emergency. Unlike
 *    triggerSOS's own auto-created session (which hardcodes an empty
 *    guardian_email and therefore notifies nobody), this populates
 *    guardian_email/guardian_phone from CaseRecord.emergency_contact_email/
 *    emergency_contact_number when present, so the alert can actually reach
 *    someone.
 *
 * is_confirmed_emergency must only ever be set true by a deterministic,
 * traveler-confirmed distress event (MCareOrb.jsx's handleDistressConfirm) —
 * never by the LLM's own judgment call.
 */
import { createHandler, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { linkOnlyEmail, linkOnlySms } from '../../shared/notify.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

const bodySchema = strictObject({
  case_id: Fields.shortText(100),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  location_label: Fields.optionalText(200),
  is_confirmed_emergency: z.boolean().optional().default(false),
  message_context: Fields.optionalText(300),
});

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => chars[b % chars.length]).join('');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id, latitude, longitude, is_confirmed_emergency, message_context } = await body();

  // Ownership check — same pattern as generateGuardianLink.
  const cases = await base44.entities.CaseRecord.filter({ id: case_id });
  const caseRecord = cases[0];
  if (!caseRecord || caseRecord.client_email !== user.email) {
    return err('Case not found or access denied.', 403);
  }

  const now = new Date();
  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  // ── Find an existing active session ────────────────────────────────────
  let session: any = null;
  try {
    const sessions = await base44.asServiceRole.entities.GuardianSession.filter({ case_id, is_active: true });
    session = sessions.find((s: any) => new Date(s.expires_at) > now) || null;
  } catch (_) { /* best-effort — falls through to the no-session branches below */ }

  let autoCreated = false;
  if (!session) {
    if (!is_confirmed_emergency) {
      return Response.json({
        success: false,
        needs_consent: true,
        message: 'No guardian link is set up for this case yet.',
      });
    }

    // Confirmed-emergency auto-create, mirroring triggerSOS's real precedent —
    // but populated from the case's real emergency-contact fields so it can
    // actually notify someone (triggerSOS's own version leaves these blank).
    const token = generateToken(32);
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    session = await base44.asServiceRole.entities.GuardianSession.create({
      case_id,
      patient_email: user.email,
      patient_name: caseRecord.client_name || user.full_name || user.email,
      guardian_name: 'Emergency Contact',
      guardian_email: caseRecord.emergency_contact_email || '',
      guardian_phone: caseRecord.emergency_contact_number || '',
      view_token: token,
      expires_at: expiresAt,
      is_active: true,
      view_count: 0,
      shared_data_scope: ['case_status', 'journey_stage', 'location'],
      created_at: now.toISOString(),
    });
    autoCreated = true;
  }

  const guardianUrl = `${appUrl}/guardian/${session.view_token}`;

  // ── Send the alert — link-only, real detail stays in the portal map ────
  let emailSent = false;
  let smsSent = false;

  if (session.guardian_email) {
    try {
      const html = linkOnlyEmail({
        title: is_confirmed_emergency ? 'Urgent: a location update is waiting for you' : 'A new location update is waiting for you',
        line: `${caseRecord.client_name || 'Your traveler'} wants you to see their current status right now.`,
        ctaUrl: guardianUrl,
        ctaLabel: 'View Live Status',
        from: 'notifyGuardianNow',
      });
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Medical Safe-T',
        to: session.guardian_email,
        subject: is_confirmed_emergency ? 'Urgent update from your traveler' : 'Location update from your traveler',
        body: html,
      });
      emailSent = true;
    } catch (_) { /* best-effort */ }
  }

  if (session.guardian_phone) {
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const smsBody = linkOnlySms({
          line: is_confirmed_emergency ? 'Urgent: your traveler wants you to see their current status.' : 'Your traveler wants you to see their current status.',
          url: guardianUrl,
          from: 'notifyGuardianNow',
        });
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: twilioFrom, To: session.guardian_phone, Body: smsBody }),
        });
        smsSent = true;
      } catch (_) { /* best-effort */ }
    }
  }

  // Real, current-known location, kept in LiveLocation for GuardianView to
  // render on its map — never interpolated into the email/SMS body itself.
  // Same field shape triggerSOS already writes (user_id is required).
  if (latitude != null && longitude != null) {
    try {
      const existing = await base44.asServiceRole.entities.LiveLocation.filter({ case_id }, '-updated_at', 1);
      const liveData = {
        case_id,
        user_id: user.id,
        user_email: user.email,
        latitude,
        longitude,
        source: 'gps',
        updated_at: now.toISOString(),
        is_active: true,
        stale_after: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        stale_alerted_15m: false,
        stale_alerted_30m: false,
      };
      if (existing[0]) {
        await base44.asServiceRole.entities.LiveLocation.update(existing[0].id, liveData);
      } else {
        await base44.asServiceRole.entities.LiveLocation.create(liveData);
      }
    } catch (_) { /* best-effort */ }
  }

  const notified = emailSent || smsSent;
  await logJourneyEvent(base44, {
    case_id,
    client_email: user.email,
    event_type: 'guardian_alert_sent',
    source: 'notifyGuardianNow',
    message_text: notified
      ? "I've let your guardian know — they can see your live status now."
      : "I tried to reach your guardian but couldn't send the alert. I've flagged this for the team.",
    priority: is_confirmed_emergency ? 'high' : 'medium',
    action_taken: `email_sent=${emailSent} sms_sent=${smsSent} auto_created=${autoCreated} context=${message_context || ''}`,
    tool_result: { email_sent: emailSent, sms_sent: smsSent, auto_created: autoCreated },
    user_action_required: !notified,
    escalation_occurred: !notified,
  });

  return Response.json({
    success: true,
    notified,
    email_sent: emailSent,
    sms_sent: smsSent,
    auto_created: autoCreated,
    guardian_name: session.guardian_name,
  });
}, {
  name: 'notifyGuardianNow',
  requireAuth: true,
  bodySchema,
  rateLimit: { max: 5, windowSeconds: 600 },
}));
