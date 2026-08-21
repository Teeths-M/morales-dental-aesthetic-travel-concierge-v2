import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';
import { reportIncident, generateIncidentCode } from '../../shared/incidentReporting.ts';

// Deliberately permissive on types (z.any()) for everything but the two
// fields already required by this function's own logic — this is a live
// emergency-dispatch path, and a too-strict schema rejecting a real SOS
// is a far worse outcome than a validator being lenient. .strict() still
// rejects any field name outside this list.
const TriggerSOSSchema = strictObject({
  trigger_type: z.string().max(50),
  patient_email: z.string().max(254),
  latitude: z.any().optional(),
  longitude: z.any().optional(),
  location_label: z.any().optional(),
  case_id: z.any().optional(),
  patient_name: z.any().optional(),
  patient_phone: z.any().optional(),
  is_silent: z.any().optional(),
  destination_country: z.any().optional(),
  pin_session_token: z.any().optional(),
  hardware_channels_detected: z.any().optional(),
  activity_type: z.any().optional(),
  offline_packet_id: z.any().optional(),
  emergency_type: z.any().optional(),
  activity_session_id: z.any().optional(),
});

// Sliding-window rate limiter using RateLimitBucket entity
// Returns true if request is allowed, false if rate limit exceeded.
async function checkRateLimit(base44, key, windowSeconds, maxRequests) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key });
  const bucket = buckets[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  // Reset window if expired
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() });
  return true;
}

// Emergency routing vectors
const SOS_ROUTES = {
  police: { label: 'Local Police', priority: 1 },
  ambulance: { label: 'Emergency Ambulance', priority: 1 },
  private_security: { label: 'Private Tactical Security', priority: 2 },
  urgent_pickup: { label: 'Emergency Pickup', priority: 2 },
  silent_sos: { label: 'Silent SOS', priority: 1, silent: true },
};

// Config-gap visibility — same proven pattern getGeolocationAndCurrency uses:
// a real ReliabilityIncident row (+ an INCIDENT_ALERT_EMAILS alert email at
// high/critical) instead of a console.error nobody sees. Cooldown-gated so a
// standing misconfiguration doesn't spam a fresh row on every SOS trigger.
let lastConfigIncidentAt = 0;
const CONFIG_INCIDENT_COOLDOWN_MS = 60 * 60 * 1000;

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    // SOS requires either a logged-in user OR a valid PIN session token
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(TriggerSOSSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const {
      trigger_type, latitude, longitude, location_label,
      case_id, patient_email, patient_name, patient_phone,
      is_silent, destination_country, pin_session_token,
      hardware_channels_detected = [],   // goTenna, inReach, satellite, sms, qr, webshare
    } = validated.data as any;

    // Require authentication: either JWT session or PIN session
    if (!user && !pin_session_token) {
      return Response.json({ error: 'Authentication required: provide a valid session or PIN session token.' }, { status: 401 });
    }

    // If PIN session provided (no JWT), validate it
    if (!user && pin_session_token) {
      const pinCheck = await base44.functions.invoke('verifyEmergencyPIN', { action: 'validate_session', user_email: patient_email, pin_session_token });
      if (!pinCheck?.data?.valid) {
        return Response.json({ error: 'Invalid or expired PIN session.' }, { status: 401 });
      }
    }

    // RATE LIMIT: 3 SOS triggers per 5 minutes per identity (strict — abuse floods admin + burns Twilio)
    const rateLimitKey = `${user?.id || patient_email}:triggerSOS`;
    const allowed = await checkRateLimit(base44, rateLimitKey, 300, 3);
    if (!allowed) {
      return Response.json({ error: 'Too many SOS requests. Please wait a few minutes before trying again.' }, { status: 429 });
    }

    if (!trigger_type || !patient_email) return Response.json({ error: 'trigger_type and patient_email required' }, { status: 400 });

    const now = new Date().toISOString();
    const route = SOS_ROUTES[trigger_type] || SOS_ROUTES.police;

    // Extra fields for wilderness_injury
    const { activity_type, offline_packet_id, emergency_type, activity_session_id } = validated.data as any;

    // Translate emergency message to local language
    let translatedMessage = 'EMERGENCY: Medical tourist requires immediate assistance.';
    // SEC-09: Sanitise destination_country before LLM interpolation to prevent prompt injection
    const safeCountry = destination_country ? String(destination_country).replace(/[^a-zA-Z\s\-]/g, '').slice(0, 60) : null;

    if (safeCountry) {
      try {
        const langResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Translate this emergency message to the primary local language of ${safeCountry}: "MEDICAL EMERGENCY: This person requires immediate ${route.label}. Please call the relevant emergency services." Return ONLY the translated text, nothing else.`
        });
        translatedMessage = typeof langResult === 'string' ? langResult : translatedMessage;
      } catch (_) {}
    }

    // Create SOS event record
    const isWilderness = trigger_type === 'wilderness_injury' || emergency_type === 'wilderness_injury';
    const sosEvent = await base44.asServiceRole.entities.SOSEvent.create({
      case_id: case_id || null,
      patient_email,
      patient_name: patient_name || 'Unknown Patient',
      patient_phone: patient_phone || '',
      trigger_type: isWilderness ? 'silent_sos' : trigger_type, // map to existing enum
      latitude: latitude || null,
      longitude: longitude || null,
      location_label: location_label || (isWilderness ? 'Wilderness SOS — offline packet' : 'Location unknown'),
      status: 'triggered',
      escalation_level: isWilderness ? 5 : 1, // wilderness = highest urgency
      is_silent: !!is_silent || trigger_type === 'silent_sos',
      translated_message: translatedMessage,
      hardware_channels_detected: Array.isArray(hardware_channels_detected) ? hardware_channels_detected : [],
      notifications_sent: [],
      triggered_at: now
    });

    const notificationsSent = [];

    // SECURITY: Resolve a confirmed admin email from env only — never fall back to patient_email
    const adminNotifyEmail = Deno.env.get('ADMIN_EMAIL');
    if (!adminNotifyEmail) {
      console.error('[triggerSOS] CRITICAL: ADMIN_EMAIL not set. SOS admin alert will not be dispatched.');
    }

    // Notify admin / coordinator immediately
    const adminEmailBody = `
<div style="font-family:sans-serif;max-width:600px;">
  <div style="background:#dc2626;color:white;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:24px;">🚨 ${is_silent ? 'SILENT ' : ''}SOS TRIGGERED</h1>
    <p style="margin:8px 0 0;">Trigger Type: <strong>${route.label}</strong></p>
  </div>
  <div style="background:#fff;border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
    <p><strong>Patient:</strong> ${patient_name || patient_email}</p>
    <p><strong>Email:</strong> ${patient_email}</p>
    <p><strong>Phone:</strong> ${patient_phone || 'Not provided'}</p>
    <p><strong>Location:</strong> ${location_label || 'Unknown'}</p>
    ${latitude ? `<p><strong>GPS:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</p>` : ''}
    ${latitude ? `<p><a href="https://maps.google.com/?q=${latitude},${longitude}" style="color:#dc2626;">📍 Open in Google Maps</a></p>` : ''}
    <p><strong>Case ID:</strong> ${case_id || 'N/A'}</p>
    <p><strong>Time:</strong> ${new Date(now).toLocaleString()}</p>
    ${hardware_channels_detected.length > 0 ? `<p><strong>Patient Hardware Channels:</strong> ${hardware_channels_detected.join(', ')}</p>` : ''}
    <hr/>
    <p style="color:#dc2626;font-weight:bold;">IMMEDIATE ACTION REQUIRED — Dispatch ${route.label}</p>
    <p><strong>Translated Message for Local First Responders:</strong><br/><em>${translatedMessage}</em></p>
  </div>
</div>`;

    // For wilderness SOS: log breadcrumb and update activity session
    if (isWilderness) {
      if (latitude != null && longitude != null) {
        try {
          await base44.asServiceRole.entities.LocationBreadcrumb.create({
            case_id: case_id || '',
            patient_email,
            patient_name: patient_name || '',
            latitude, longitude,
            source: 'checkin_handshake',
            provider: 'browser_gps',
            location_precision: 'precise',
            logged_at: now,
            is_saved: true,
            place_label: `Wilderness SOS${offline_packet_id ? ' — ' + offline_packet_id : ''}`,
          });
        } catch (_) {}
      }
      // Update ActivitySession status if provided
      if (activity_session_id) {
        try {
          await base44.asServiceRole.entities.ActivitySession.update(activity_session_id, {
            status: 'sos_triggered',
            handshake_status: 'overdue',
          });
        } catch (_) {}
      }
      // Create DispatchFailureLog if no rescue partner — admin task
      try {
        await base44.asServiceRole.entities.DispatchFailureLog.create({
          case_id: case_id || '',
          escalation_level: 5,
          failure_reason: `WILDERNESS SOS — ${offline_packet_id || 'direct'} — SEARCH_RESCUE_REQUIRED. Coordinates: ${
            latitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'unknown'
          }. Activity: ${activity_type || 'unknown'}.`,
          partner_type: 'security',
          status: 'logged',
          created_at: now,
        });
      } catch (_) {}
    }

    if (adminNotifyEmail) {
      try {
        // AUTHORISED EXEMPTION from the link-only comms policy (Portia,
        // 2026-07-18). This is an active-emergency dispatch: the responder
        // needs to know who and where without a login in the way.
        const subject = isWilderness
          ? `🏔️ WILDERNESS SOS — SEARCH & RESCUE REQUIRED — ${patient_name || patient_email}`
          : `🚨 SOS — ${route.label} — ${patient_name || patient_email}`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safe-T Emergency System',
          to: adminNotifyEmail,
          subject,
          body: isWilderness
            ? `<div style="font-family:sans-serif;max-width:600px">
                <div style="background:#dc2626;color:white;padding:20px;border-radius:8px 8px 0 0">
                  <h1 style="margin:0">🏔️ WILDERNESS SOS — CANOPY COLLAPSE PROTOCOL</h1>
                </div>
                <div style="background:#fff;border:1px solid #fca5a5;border-top:none;padding:20px;border-radius:0 0 8px 8px">
                  <p><strong>Patient:</strong> ${patient_name || patient_email}</p>
                  <p><strong>Coordinates:</strong> ${latitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'UNKNOWN'}</p>
                  ${latitude ? `<p><a href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}">📍 Open in Google Maps</a></p>` : ''}
                  ${latitude ? `<p><a href="https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving">🧭 Get Directions</a></p>` : ''}
                  <p><strong>Activity:</strong> ${activity_type || 'unknown'}</p>
                  <p><strong>Offline Packet ID:</strong> ${offline_packet_id || 'N/A — direct SOS'}</p>
                  <p><strong>Case ID:</strong> ${case_id || 'N/A'}</p>
                  <p><strong>Time:</strong> ${new Date(now).toLocaleString()}</p>
                  <hr/>
                  <p style="color:#dc2626;font-weight:bold">SEARCH & RESCUE REQUIRED — Review /admin/wilderness-rescue immediately.</p>
                </div>
              </div>`
            : adminEmailBody,
        });
        notificationsSent.push('admin_email');
      } catch (_) { notificationsSent.push('admin_email_failed'); }
    }

    // SMS via Twilio if phone available.
    //
    // This used to invoke sendSmsNotification, which is an ADMIN COMPOSER tool:
    // it requires a {to, type} payload (this sent {to, message} → 400) and an
    // admin session (an SOS has neither). Both failures were swallowed by the
    // bare catch, so the patient never received "help is coming" and nothing
    // was logged. Sends directly instead, the same way triggerCovertSOS does.
    if (patient_phone) {
      const sid   = Deno.env.get('TWILIO_ACCOUNT_SID');
      const token = Deno.env.get('TWILIO_AUTH_TOKEN');
      const from  = Deno.env.get('TWILIO_PHONE_NUMBER');
      if (!sid || !token || !from) {
        console.error('[triggerSOS] Twilio not configured — patient confirmation SMS NOT sent.');
        notificationsSent.push('patient_sms_not_configured');
      } else {
        try {
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: patient_phone,
              From: from,
              Body: `Morales Safe-T: Your ${route.label} SOS has been received. Emergency team alerted. Stay calm and stay where you are. If safe to call, dial your local emergency number.`,
            }).toString(),
          });
          if (resp.ok) {
            notificationsSent.push('patient_sms');
          } else {
            // Never silent on a life-safety path.
            console.error('[triggerSOS] patient confirmation SMS failed:', resp.status);
            notificationsSent.push('patient_sms_failed');
          }
        } catch (e) {
          console.error('[triggerSOS] patient confirmation SMS threw:', e);
          notificationsSent.push('patient_sms_failed');
        }
      }
    }

    // Get case emergency contact and notify
    // SDK filter() cannot query by built-in `id` field — list recent cases and match by id
    if (case_id) {
      try {
        const recentCases = await base44.asServiceRole.entities.CaseRecord.filter(
          { client_email: patient_email }, '-created_date', 20
        );
        const matchedCase = recentCases.find(c => c.id === case_id);
        const emergencyContactEmail = matchedCase?.emergency_contact;
        if (emergencyContactEmail && emergencyContactEmail.includes('@')) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: emergencyContactEmail,
              subject: `⚠️ Emergency Alert: ${patient_name || patient_email} triggered SOS`,
              body: `<p>Your contact <strong>${patient_name}</strong> has triggered an emergency SOS (${route.label}) at ${location_label || 'their current location'}. The Morales Medical emergency team has been alerted and is coordinating a response.</p>`
            });
            notificationsSent.push('emergency_contact');
          } catch (_) { notificationsSent.push('emergency_contact_email_failed'); }
        }
      } catch (_) {}
    }

    // Update LiveLocation immediately on SOS so guardian sees last-known coords
    if (latitude != null && longitude != null && case_id) {
      try {
        const liveLocations = await base44.asServiceRole.entities.LiveLocation.filter({ case_id });
        const existingLive = liveLocations?.[0];
        const liveData = {
          case_id, user_id: patient_email, user_email: patient_email,
          latitude, longitude,
          source: 'gps', updated_at: now, is_active: true, guardian_share_enabled: true,
          stale_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          stale_alerted_15m: false, stale_alerted_30m: false,
        };
        if (existingLive) {
          await base44.asServiceRole.entities.LiveLocation.update(existingLive.id, liveData);
        } else {
          await base44.asServiceRole.entities.LiveLocation.create(liveData);
        }
      } catch (_) {}
    }

    // Auto-create guardian session on SOS if none active
    if (case_id) {
      try {
        const activeSessions = await base44.asServiceRole.entities.GuardianSession.filter({ case_id, is_active: true });
        const validSession = activeSessions.find(s => new Date(s.expires_at) > new Date());
        if (!validSession) {
          const tokenArray = new Uint8Array(32);
          crypto.getRandomValues(tokenArray);
          const token = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');
          const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
          await base44.asServiceRole.entities.GuardianSession.create({
            case_id,
            patient_email,
            patient_name: patient_name || 'Traveler',
            guardian_name: 'Emergency Contact',
            guardian_email: '',
            view_token: token,
            expires_at: expiresAt,
            is_active: true,
            view_count: 0,
            shared_data_scope: ['case_status', 'journey_stage', 'location'],
            created_at: now,
          });
          notificationsSent.push('guardian_session_created');
        }
      } catch (_) {}
    }

    // Config-gap visibility, cooldown-gated (declared above). Never affects
    // the response either way — the SOS event has already dispatched by now.
    if (Date.now() - lastConfigIncidentAt > CONFIG_INCIDENT_COOLDOWN_MS) {
      const smsIssue = notificationsSent.includes('patient_sms_not_configured') || notificationsSent.includes('patient_sms_failed');
      if (!adminNotifyEmail || smsIssue) {
        lastConfigIncidentAt = Date.now();
        try {
          await Promise.race([
            reportIncident({
              base44,
              incidentCode: generateIncidentCode(),
              severity: !adminNotifyEmail ? 'critical' : 'high',
              source: 'api',
              feature: 'triggerSOS',
              errorMessage: !adminNotifyEmail
                ? 'ADMIN_EMAIL not configured — SOS admin dispatch alert was not sent.'
                : 'Twilio not configured or send failed — SOS patient confirmation SMS was not sent.',
            }),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } catch (_) { /* incident reporting must never affect the response */ }
      }
    }

    // Update event with notifications sent
    await base44.asServiceRole.entities.SOSEvent.update(sosEvent.id, {
      status: 'dispatched',
      notifications_sent: notificationsSent
    });

    return Response.json({
      event_id: sosEvent.id,
      status: 'dispatched',
      trigger_type,
      translated_message: translatedMessage,
      notifications_sent: notificationsSent,
      message: `${route.label} SOS dispatched. Emergency team alerted.`
    });
  } catch (error) {
    // SEC-10: Never expose internal error details
    console.error('[triggerSOS]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
// Already rate-limited inline above via RateLimitBucket — rateLimit:false here
// avoids silently double-limiting through two independent mechanisms.
}, { name: 'triggerSOS', requireAuth: false, rateLimit: false }));