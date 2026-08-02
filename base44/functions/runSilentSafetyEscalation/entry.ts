/**
 * runSilentSafetyEscalation — Silent Safety Escalation State Machine
 *
 * Safe to run on a schedule; idempotent per check-in record.
 *
 * Escalation ladder (configurable thresholds below):
 *  T+15m  → SMS reminder to traveler with check-in link
 *  T+30m  → Voice call to traveler (Twilio)
 *  T+60m  → Guardian / emergency contact alert with tracking link
 *  T+120m → Private security dispatch
 *  T+180m → Admin police-escalation task created (no auto-police contact)
 *
 * Also runs if live location signal is stale >30 minutes with no check-in.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { linkOnlyEmail, emergencyDispatch } from '../../shared/notify.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';

// ── Configurable thresholds (minutes after missed check-in) ─────────────────
// context_type on SoloCheckIn overrides these defaults per-checkpoint.
// Flight legs get longer windows; local transfers get tighter ones.
const THRESHOLDS = {
  SMS_REMINDER_MIN:      15,
  VOICE_CALL_MIN:        30,
  GUARDIAN_ALERT_MIN:    60,
  SECURITY_DISPATCH_MIN: 120,
  POLICE_ESCALATION_MIN: 180,
  STALE_SIGNAL_GUARDIAN_MIN: 30,
};

const CONTEXT_OVERRIDES: Record<string, Partial<typeof THRESHOLDS>> = {
  // On a flight: phone off, no check-in expected — give 5h before SMS
  flight_leg: {
    SMS_REMINDER_MIN:      300,
    VOICE_CALL_MIN:        360,
    GUARDIAN_ALERT_MIN:    420,
    SECURITY_DISPATCH_MIN: 480,
    POLICE_ESCALATION_MIN: 600,
  },
  // Local transfer: driver → clinic → hotel. Tight windows.
  local_transfer: {
    SMS_REMINDER_MIN:      15,
    VOICE_CALL_MIN:        25,
    GUARDIAN_ALERT_MIN:    45,
    SECURITY_DISPATCH_MIN: 90,
    POLICE_ESCALATION_MIN: 180,
  },
  // Post-procedure recovery: patient may be sedated. Give 2h before escalation.
  post_procedure: {
    SMS_REMINDER_MIN:      120,
    VOICE_CALL_MIN:        150,
    GUARDIAN_ALERT_MIN:    180,
    SECURITY_DISPATCH_MIN: 240,
    POLICE_ESCALATION_MIN: 360,
  },
  // Hotel night — already sleep-gated by isLocalSleepHours but extend for night check-ins
  hotel_night: {
    SMS_REMINDER_MIN:      60,
    VOICE_CALL_MIN:        90,
    GUARDIAN_ALERT_MIN:    120,
    SECURITY_DISPATCH_MIN: 180,
    POLICE_ESCALATION_MIN: 360,
  },
};

function getThresholds(contextType?: string): typeof THRESHOLDS {
  const override = contextType ? CONTEXT_OVERRIDES[contextType] : null;
  return override ? { ...THRESHOLDS, ...override } : THRESHOLDS;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function minutesSince(isoTs) {
  if (!isoTs) return Infinity;
  return (Date.now() - new Date(isoTs).getTime()) / 60000;
}

function generateToken(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logNotification(base44, {
  channel, case_id, recipient_type, recipient_phone, recipient_email,
  message_type, provider_message_id, status, escalation_level, notes,
}) {
  try {
    await base44.asServiceRole.entities.NotificationLog.create({
      channel: channel || 'sms',
      case_id: case_id || '',
      recipient_type: recipient_type || 'traveler',
      recipient_phone: recipient_phone || '',
      recipient_email: recipient_email || '',
      message_type: message_type || 'safety_reminder',
      provider_message_id: provider_message_id || '',
      status: status || 'sent',
      escalation_level: escalation_level || 1,
      notes: notes || '',
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
}

async function logDispatchFailure(base44, { case_id, escalation_level, failure_reason }) {
  try {
    await base44.asServiceRole.entities.DispatchFailureLog.create({
      case_id: case_id || '',
      escalation_level: escalation_level || 1,
      failure_reason: failure_reason || 'unknown',
      status: 'logged',
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
}

async function getLatestLiveLocation(base44, caseId) {
  try {
    const locs = await base44.asServiceRole.entities.LiveLocation.filter({ case_id: caseId, is_active: true }, '-updated_at', 1);
    return locs?.[0] ?? null;
  } catch (_) { return null; }
}

async function getLatestBreadcrumb(base44, caseId) {
  try {
    const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id: caseId, is_purged: false }, '-logged_at', 1);
    return crumbs?.[0] ?? null;
  } catch (_) { return null; }
}

function buildLocationString(loc) {
  if (!loc) return 'Unknown';
  if (loc.latitude != null && loc.longitude != null) {
    return `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}`;
  }
  return [loc.city, loc.country, loc.place_label].filter(Boolean).join(', ') || 'Unknown';
}

function buildMapsUrl(loc) {
  if (!loc || loc.latitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}&travelmode=driving`;
}

async function ensureGuardianLink(base44, caseId, patientEmail, patientName, emergencyContact) {
  const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
  try {
    const existing = await base44.asServiceRole.entities.GuardianSession.filter({ case_id: caseId, is_active: true });
    const valid = existing.find(s =>
      new Date(s.expires_at) > new Date() &&
      (s.shared_data_scope?.includes('location') || !s.shared_data_scope)
    );
    if (valid) return `${appUrl}/guardian/${valid.view_token}`;

    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.GuardianSession.create({
      case_id: caseId,
      patient_email: patientEmail,
      patient_name: patientName,
      guardian_name: 'Emergency Contact',
      guardian_email: emergencyContact || '',
      view_token: token,
      expires_at: expiresAt,
      is_active: true,
      view_count: 0,
      shared_data_scope: ['case_status', 'journey_stage', 'location'],
      created_at: new Date().toISOString(),
    });
    return `${appUrl}/guardian/${token}`;
  } catch (_) { return null; }
}

async function buildCheckInLink(base44, checkInId, caseId) {
  const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
  try {
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const rawToken = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.CheckInToken.create({
      check_in_id: checkInId,
      case_id: caseId,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
    return `${appUrl}/check-in/${checkInId}?token=${rawToken}`;
  } catch (_) {
    return `${appUrl}/dashboard`;
  }
}

async function sendSms(twilioSid, twilioAuth, from, to, body, caseId) {
  if (!twilioSid || !twilioAuth || !from || !to) return { success: false, reason: 'provider_not_configured' };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return { success: false, reason: txt };
    }
    const json = await resp.json().catch(() => ({}));
    return { success: true, sid: json.sid };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[runSilentSafetyEscalation] SMS timed out after 5s for case:', caseId);
      return { success: false, reason: 'timeout' };
    }
    console.error('[runSilentSafetyEscalation] SMS failed:', err?.message);
    return { success: false, reason: err.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function makeVoiceCall(twilioSid, twilioAuth, from, to, twiml) {
  if (!twilioSid || !twilioAuth || !from || !to) return { success: false, reason: 'provider_not_configured' };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Twiml: twiml }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return { success: false, reason: txt };
    }
    const json = await resp.json().catch(() => ({}));
    return { success: true, sid: json.sid };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow both admin-gated manual invocations and scheduled (cron-secret) runs.
    // This engine fires real SMS/voice calls and can dispatch private security —
    // an unauthenticated caller must never be able to trigger the platform-wide
    // sweep on demand.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

    // Fetch all active (non-resolved, non-acknowledged) check-ins
    const [pending, esc2h, esc3h, esc5h] = await Promise.all([
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'pending' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_2h' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_3h' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_5h' }, '-scheduled_time', 100),
    ]);

    const allActive = [...pending, ...esc2h, ...esc3h, ...esc5h];

    // Filter out paused, completed, and future check-ins
    const workable = allActive.filter(ci => {
      if (ci.is_paused_medical) return false;
      // Never pause escalation at tier 5h or 9h — life-critical
      const isHighTierEscalation = ci.status === 'escalated_5h' || ci.status === 'escalated_9h';
      if (!isHighTierEscalation && ci.pause_until && new Date(ci.pause_until) > now) {
        return false; // Skip for low tiers only
      }
      // Only escalate check-ins that are actually overdue (scheduled time is past)
      const scheduledTime = ci.scheduled_time ? new Date(ci.scheduled_time) : null;
      if (scheduledTime && scheduledTime > now) return false;
      return true;
    });

    const results = {
      processed: 0,
      sms_sent: 0,
      voice_attempted: 0,
      guardian_alerted: 0,
      security_dispatched: 0,
      police_escalated: 0,
      skipped: allActive.length - workable.length,
    };

    // Batch load all case records upfront to avoid N+1 queries in the loop
    const allCaseIds = [...new Set(workable.map(ci => ci.case_id).filter(Boolean))];
    const caseRecordMap = new Map();

    if (allCaseIds.length > 0) {
      // Load in batches of 50
      for (let i = 0; i < allCaseIds.length; i += 50) {
        const batch = allCaseIds.slice(i, i + 50);
        const batchCases = await base44.asServiceRole.entities.CaseRecord.filter(
          { id: { $in: batch } }, '-created_date', 50
        ).catch(() => []);
        for (const c of (batchCases || [])) {
          caseRecordMap.set(c.id, c);
        }
      }
    }

    for (const ci of workable) {
      results.processed++;
      const overdueMins = minutesSince(ci.scheduled_time);
      // Context-aware thresholds: flight legs, local transfers, and post-procedure
      // windows each have different escalation cadences — not one-size-fits-all.
      const T = getThresholds(ci.context_type);

      // Load case for contact info from pre-fetched map (best-effort, don't crash if missing)
      let caseRecord = caseRecordMap.get(ci.case_id) || null;

      // Skip if case is in a procedure window (surgical pause)
      if (caseRecord && (
        caseRecord.status === 'Procedure-In-Progress' ||
        caseRecord.status === 'SURGICAL_EXECUTION_WINDOW' ||
        caseRecord.notification_blackout_active
      )) continue;

      const emergencyContact = caseRecord?.emergency_contact || '';
      const patientName = ci.user_name || caseRecord?.client_name || ci.user_email;
      const patientPhone = ci.user_phone || caseRecord?.client_phone || '';

      // ── Get latest location (LiveLocation first, breadcrumb fallback) ──────
      const [liveLoc, crumbLoc] = await Promise.all([
        getLatestLiveLocation(base44, ci.case_id),
        getLatestBreadcrumb(base44, ci.case_id),
      ]);
      const bestLoc = liveLoc || crumbLoc;
      const locStr = buildLocationString(bestLoc);
      const mapsUrl = buildMapsUrl(bestLoc);

      // ── STEP 1: SMS reminder (T+15m) ────────────────────────────────────
      if (overdueMins >= T.SMS_REMINDER_MIN && !ci.traveler_sms_sent_at && ci.status === 'pending') {
        const checkInLink = await buildCheckInLink(base44, ci.id, ci.case_id);
        const smsBody = `Morales Safety: We haven't heard from you. Reply SAFE or tap to confirm: ${checkInLink}`;

        let smsSid = null;
        let smsStatus = 'sent';

        if (patientPhone) {
          const smsResult = await sendSms(twilioSid, twilioAuth, twilioFrom, patientPhone, smsBody, ci.case_id);
          smsStatus = smsResult.success ? 'sent' : (smsResult.reason === 'provider_not_configured' ? 'provider_not_configured' : 'failed');
          smsSid = smsResult.sid || null;
        } else {
          smsStatus = 'no_phone';
        }

        // Fallback: email if no phone. Own name dropped for consistency with the
        // link-only policy even though this is the traveler's own check-in.
        if (!patientPhone && ci.user_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: ci.user_email,
              subject: `⚠️ Morales Safety Check-In Required`,
              body: linkOnlyEmail({
                title: 'A safety check-in is due',
                line: 'We have not received your scheduled safety check-in. Please open the link to let us know you are safe.',
                ctaUrl: checkInLink,
                ctaLabel: "I'm Safe — Confirm Now",
                from: 'runSilentSafetyEscalation',
              }),
            });
          } catch (_) {}
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          traveler_sms_sent_at: now.toISOString(),
        });

        await logNotification(base44, {
          channel: patientPhone ? 'sms' : 'email',
          case_id: ci.case_id,
          recipient_type: 'traveler',
          recipient_phone: patientPhone,
          recipient_email: ci.user_email,
          message_type: 'safety_reminder',
          provider_message_id: smsSid || '',
          status: smsStatus,
          escalation_level: 1,
          notes: `Overdue by ${Math.round(overdueMins)}min`,
        });

        results.sms_sent++;
      }

      // ── STEP 2: Voice call (T+30m) ───────────────────────────────────────
      if (overdueMins >= T.VOICE_CALL_MIN && !ci.traveler_voice_call_at &&
          (ci.status === 'pending' || ci.status === 'escalated_2h')) {

        const twiml = `<Response><Say voice="alice">This is Morales Safety. We have not received your scheduled check-in. Please open your safety link or reply SAFE by text message. If this is an emergency, stay where you are. We are escalating support.</Say><Pause length="2"/><Say voice="alice">Repetimos. Por favor confirme que está seguro.</Say></Response>`;

        let voiceStatus = 'attempted';
        if (patientPhone) {
          const voiceResult = await makeVoiceCall(twilioSid, twilioAuth, twilioFrom, patientPhone, twiml);
          voiceStatus = voiceResult.success ? 'sent' : (voiceResult.reason === 'provider_not_configured' ? 'provider_not_configured' : 'failed');

          if (!voiceResult.success && voiceResult.reason !== 'provider_not_configured') {
            await logDispatchFailure(base44, {
              case_id: ci.case_id,
              escalation_level: 2,
              failure_reason: `Voice call failed: ${voiceResult.reason}`,
            });
          }
        } else {
          voiceStatus = 'no_phone';
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          traveler_voice_call_at: now.toISOString(),
          status: 'escalated_2h',
        });

        await logNotification(base44, {
          channel: 'voice',
          case_id: ci.case_id,
          recipient_type: 'traveler',
          recipient_phone: patientPhone,
          recipient_email: ci.user_email,
          message_type: 'voice_call',
          status: voiceStatus,
          escalation_level: 2,
          notes: `Overdue by ${Math.round(overdueMins)}min`,
        });

        results.voice_attempted++;
      }

      // ── STEP 3: Guardian / emergency contact alert (T+60m) ───────────────
      if (overdueMins >= T.GUARDIAN_ALERT_MIN && !ci.guardian_alerted_at &&
          (ci.status === 'pending' || ci.status === 'escalated_2h')) {

        const guardianUrl = await ensureGuardianLink(base44, ci.case_id, ci.user_email, patientName, emergencyContact);

        // Exempt from link-only policy: this is the active-emergency alert to the
        // patient's own emergency contact that emergencyDispatch() exists for
        // (Portia, 2026-07-18) — a missed check-in cascading toward "patient
        // missing" is exactly the scenario the carve-out covers.
        // LEAK-SCAN-IGNORE-START — authorised emergencyDispatch() carve-out, not a link-only leak.
        const guardianSmsBody = emergencyDispatch({
          reason: 'patient_missing',
          from: 'runSilentSafetyEscalation',
          body: `Morales Safety Alert: ${patientName} missed a required check-in. View last known location: ${guardianUrl || appUrl}`,
        });
        // LEAK-SCAN-IGNORE-END

        // SMS to guardian phone if available
        let guardianPhone = caseRecord?.client_phone ? '' : ''; // guardian phone if stored differently
        // Try to extract from emergency_contact field if it looks like a phone
        if (emergencyContact && /^\+?[\d\s\-()]{7,}$/.test(emergencyContact)) {
          guardianPhone = emergencyContact;
        }

        if (guardianPhone) {
          const smsResult = await sendSms(twilioSid, twilioAuth, twilioFrom, guardianPhone, guardianSmsBody, ci.case_id);
          await logNotification(base44, {
            channel: 'sms',
            case_id: ci.case_id,
            recipient_type: 'guardian',
            recipient_phone: guardianPhone,
            message_type: 'guardian_alert',
            provider_message_id: smsResult.sid || '',
            status: smsResult.success ? 'sent' : 'failed',
            escalation_level: 3,
          });
        }

        // Email to guardian/emergency contact if it looks like an email
        if (emergencyContact && emergencyContact.includes('@')) {
          const locLabel = bestLoc?.latitude != null
            ? `GPS: ${Number(bestLoc.latitude).toFixed(5)}, ${Number(bestLoc.longitude).toFixed(5)}`
            : [bestLoc?.city, bestLoc?.country].filter(Boolean).join(', ') || 'Last known location unavailable';

          // LEAK-SCAN-IGNORE-START — authorised emergencyDispatch() carve-out, not a link-only leak.
          const emailBody = `
<div style="font-family:sans-serif;max-width:600px;background:#fff;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
  <div style="background:#dc2626;color:white;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
    <h2 style="margin:0;font-size:20px;">🚨 Safety Alert — ${patientName}</h2>
  </div>
  <p style="color:#374151;font-size:16px;">${patientName} has not responded to their Morales safety check-in for over ${Math.round(overdueMins)} minutes.</p>
  <p style="color:#374151;"><strong>Last Known Location:</strong> ${locLabel}</p>
  ${mapsUrl ? `<p><a href="${mapsUrl}" style="color:#1d4ed8;">📍 View in Google Maps</a></p>` : ''}
  ${guardianUrl ? `<p style="margin-top:24px;"><a href="${guardianUrl}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">👁 View Live Safety Status — No Login Required</a></p>` : ''}
  <p style="color:#6b7280;font-size:13px;margin-top:24px;">Please try to contact ${patientName} immediately. If unreachable, contact local emergency services. This link shows live GPS location while the app is open, and last-known location when offline.</p>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;">Do not reply to this email. Call Morales emergency line if needed. No sensitive medical data is contained in this alert.</p>
</div>`;

          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safety System',
              to: emergencyContact,
              subject: `🚨 Safety Alert: ${patientName} missed check-in`,
              // Exempt: active-emergency alert to the patient's own emergency
              // contact — see guardianSmsBody above for the same reasoning.
              body: emergencyDispatch({ reason: 'patient_missing', from: 'runSilentSafetyEscalation', body: emailBody }),
            });
          } catch (_) {}
          // LEAK-SCAN-IGNORE-END

          await logNotification(base44, {
            channel: 'email',
            case_id: ci.case_id,
            recipient_type: 'guardian',
            recipient_email: emergencyContact,
            message_type: 'guardian_alert',
            status: 'sent',
            escalation_level: 3,
          });
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          status: 'escalated_3h',
          escalation_level: 'contact_notified',
          guardian_alerted_at: now.toISOString(),
          guardian_link_sent: !!guardianUrl,
          emergency_contact_notified_at: now.toISOString(),
        });

        results.guardian_alerted++;
      }

      // ── STEP 4: Private security dispatch (T+120m or 3 missed rounds) ────
      const missedCount = ci.missed_round_count || 0;
      const needsSecurityByTime = overdueMins >= T.SECURITY_DISPATCH_MIN;
      const needsSecurityByMissed = missedCount >= 3;

      if ((needsSecurityByTime || needsSecurityByMissed) && !ci.security_dispatched_at &&
          (ci.status === 'escalated_3h' || (needsSecurityByMissed && ci.status !== 'escalated_5h'))) {

        const guardianUrl = await ensureGuardianLink(base44, ci.case_id, ci.user_email, patientName, emergencyContact);

        // Exempt: dispatch to the assigned private security partner — a "local
        // responder" under the same active-emergency carve-out as the guardian alert.
        // LEAK-SCAN-IGNORE-START — authorised emergencyDispatch() carve-out, not a link-only leak.
        const dispatchBody = emergencyDispatch({
          reason: 'patient_missing',
          from: 'runSilentSafetyEscalation',
          body: `🚨 SECURITY DISPATCH — ${patientName} | Case: ${ci.case_id} | Location: ${locStr} | Overdue: ${Math.round(overdueMins)}min | Missed rounds: ${missedCount} | Tracking: ${guardianUrl || 'N/A'} | Maps: ${mapsUrl || 'N/A'}`,
        });
        // LEAK-SCAN-IGNORE-END

        // Notify security partner via SMS if configured
        const securityPhone = caseRecord?.travel_vendor_id ? null : null; // extend when SecurityAgency has phone field
        if (securityPhone) {
          const smsResult = await sendSms(twilioSid, twilioAuth, twilioFrom, securityPhone, dispatchBody, ci.case_id);
          await logNotification(base44, {
            channel: 'sms',
            case_id: ci.case_id,
            recipient_type: 'security',
            recipient_phone: securityPhone,
            message_type: 'security_dispatch',
            status: smsResult.success ? 'sent' : 'failed',
            escalation_level: 4,
          });
        } else {
          // No security partner — immediately alert admin and escalate
          await logDispatchFailure(base44, { case_id: ci.case_id, escalation_level: 4, failure_reason: 'No private security partner assigned' });
          // Alert admin immediately — don't wait for T+180m. Admin situational
          // awareness stays link-only per policy; the real case detail is what
          // Situation Room shows once they open it.
          const adminEmail = Deno.env.get('ADMIN_EMAIL');
          if (adminEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminEmail,
              subject: '🚨 URGENT: Security dispatch failed — no partner assigned',
              body: linkOnlyEmail({
                title: 'Security dispatch failed — no partner assigned',
                line: 'A traveler has been unreachable for 2+ hours and no security partner is assigned. Open Situation Room now to contact local authorities directly.',
                ctaUrl: `${appUrl}/admin/situation-room`,
                ctaLabel: 'Open Situation Room',
                from: 'runSilentSafetyEscalation',
              }),
            }).catch(e => console.error('[safety] Admin alert email failed:', e.message));
          }
        }

        // Always email admin on security escalation — link-only; full detail
        // (name, contact, location, timeline) lives in Situation Room.
        if (adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safety — URGENT',
              to: adminEmail,
              subject: '🚨 SECURITY DISPATCH REQUIRED',
              body: linkOnlyEmail({
                title: 'Private security dispatch required',
                line: 'A traveler has missed check-ins past the security dispatch threshold. Open Situation Room now for their case detail and last known location.',
                ctaUrl: `${appUrl}/admin/situation-room`,
                ctaLabel: 'Open Situation Room',
                from: 'runSilentSafetyEscalation',
              }),
            });
          } catch (_) {}
        }

        // SOSEvent for critical tracking
        try {
          await base44.asServiceRole.entities.SOSEvent.create({
            case_id: ci.case_id,
            patient_email: ci.user_email,
            patient_name: patientName,
            patient_phone: patientPhone,
            trigger_type: 'private_security',
            latitude: bestLoc?.latitude ?? null,
            longitude: bestLoc?.longitude ?? null,
            location_label: locStr,
            status: 'dispatched',
            escalation_level: 4,
            triggered_at: now.toISOString(),
            is_silent: true,
          });
        } catch (_) {}

        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          status: 'escalated_5h',
          escalation_level: 'security_dispatched',
          security_dispatched_at: now.toISOString(),
        });

        // Upgrade case to Critical
        if (caseRecord && caseRecord.case_priority !== 'Critical') {
          try {
            await base44.asServiceRole.entities.CaseRecord.update(ci.case_id, { case_priority: 'Critical' });
          } catch (_) {}
        }

        results.security_dispatched++;
      }

      // ── STEP 5: Police / admin escalation task (T+180m) ──────────────────
      if (overdueMins >= T.POLICE_ESCALATION_MIN && !ci.police_escalation_required_at &&
          ci.status === 'escalated_5h') {

        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          police_escalation_required_at: now.toISOString(),
        });

        // Admin situational awareness stays link-only; the checklist and every
        // identifying detail live in Situation Room once admin opens it.
        if (adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safety — CRITICAL',
              to: adminEmail,
              subject: '🚔 POLICE / ADMIN ESCALATION REQUIRED',
              body: linkOnlyEmail({
                title: 'Police / admin escalation required',
                line: 'A traveler has been unreachable well past the security dispatch window. Open Situation Room now for the case detail, timeline, and action checklist. Police have NOT been automatically contacted.',
                ctaUrl: `${appUrl}/admin/situation-room`,
                ctaLabel: 'Open Situation Room',
                from: 'runSilentSafetyEscalation',
              }),
            });
          } catch (_) {}
        }

        await logNotification(base44, {
          channel: 'admin',
          case_id: ci.case_id,
          recipient_type: 'admin',
          recipient_email: adminEmail,
          message_type: 'police_escalation_task',
          status: 'sent',
          escalation_level: 5,
          notes: `${Math.round(overdueMins)}min overdue. Admin checklist sent.`,
        });

        results.police_escalated++;
      }
    }

    // ── Stale signal check ────────────────────────────────────────────────────
    // A stale signal is treated as a potential security event (jamming/spoofing),
    // not just a technical failure. We freeze the last-known coordinates on the
    // record and fire an admin email — not just a log entry.
    try {
      const allPendingActive = await base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'pending' }, '-scheduled_time', 100);
      for (const ci of allPendingActive) {
        if (ci.is_paused_medical || (ci.pause_until && new Date(ci.pause_until) > now)) continue;
        const liveLoc = await getLatestLiveLocation(base44, ci.case_id);
        if (!liveLoc) continue;
        const staleMins = minutesSince(liveLoc.updated_at);
        if (staleMins >= THRESHOLDS.STALE_SIGNAL_GUARDIAN_MIN && !liveLoc.stale_alerted_30m) {
          const locStr = buildLocationString(liveLoc);
          const lossDetectedAt = now.toISOString();

          // Freeze last-known coordinates — never interpolate or extrapolate position.
          // The UI will display these with a clear "LAST KNOWN" label, not as current.
          try {
            await base44.asServiceRole.entities.LiveLocation.update(liveLoc.id, {
              stale_alerted_30m: true,
              signal_loss_detected_at: lossDetectedAt,
              signal_mode: 'last_known',
              last_known_latitude: liveLoc.latitude ?? null,
              last_known_longitude: liveLoc.longitude ?? null,
              last_known_place_label: liveLoc.place_label ?? null,
            });
          } catch (_) {}

          await logNotification(base44, {
            channel: 'admin',
            case_id: ci.case_id,
            recipient_type: 'admin',
            recipient_email: adminEmail,
            message_type: 'stale_signal_alert',
            status: 'sent',
            escalation_level: 1,
            notes: `Signal stale for ${Math.round(staleMins)} minutes. Last known: ${locStr}`,
          });

          // Page admin via email — signal loss could be deliberate jamming/spoofing.
          // Link-only: real position, timeline, and traveler detail live in Situation Room.
          if (adminEmail) {
            base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safety — Location Alert',
              to: adminEmail,
              subject: '⚠️ Location signal lost for an active traveler',
              body: linkOnlyEmail({
                title: 'Location signal lost',
                line: 'An active solo traveler’s location signal has gone dark. This may be a technical failure or a deliberate signal block. Open Situation Room for the last known position and timeline.',
                ctaUrl: `${appUrl}/admin/situation-room`,
                ctaLabel: 'Open Situation Room',
                from: 'runSilentSafetyEscalation',
              }),
            }).catch(() => {});
          }
        }
      }
    } catch (_) {}

    // Heartbeat: write one record per successful engine run so safetyEngineHealth
    // can detect if this engine stops running. If the last heartbeat is stale,
    // safetyEngineHealth returns HTTP 503 and fires an admin alert.
    await base44.asServiceRole.entities.NotificationLog.create({
      channel: 'internal',
      case_id: '',
      recipient_type: 'system',
      recipient_phone: '',
      recipient_email: '',
      message_type: 'safety_engine_heartbeat',
      provider_message_id: '',
      status: 'ok',
      escalation_level: 0,
      notes: `processed:${results.processed} sms:${results.sms_sent} voice:${results.voice_attempted} security:${results.security_dispatched} police:${results.police_escalated}`,
      created_at: now.toISOString(),
    }).catch(() => {});

    // Dead man's switch: if SAFETY_ENGINE_DEADMAN_URL is configured (healthchecks.io,
    // BetterStack, etc.), ping it. If the ping is missed for 2× the schedule interval,
    // the external service pages admin independently of our own health endpoint.
    const deadmanUrl = Deno.env.get('SAFETY_ENGINE_DEADMAN_URL');
    if (deadmanUrl) fetch(deadmanUrl, { method: 'HEAD' }).catch(() => {});

    return Response.json({ ...results, timestamp: now.toISOString() });
  } catch (err) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — rate-limiting the
// scheduler itself would risk throttling legitimate runs.
}, { name: 'runSilentSafetyEscalation', requireAuth: false, rateLimit: false }));
