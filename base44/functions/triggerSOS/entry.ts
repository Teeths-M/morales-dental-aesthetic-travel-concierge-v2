import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Emergency routing vectors
const SOS_ROUTES = {
  police: { label: 'Local Police', priority: 1 },
  ambulance: { label: 'Emergency Ambulance', priority: 1 },
  private_security: { label: 'Private Tactical Security', priority: 2 },
  urgent_pickup: { label: 'Emergency Pickup', priority: 2 },
  silent_sos: { label: 'Silent SOS', priority: 1, silent: true },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // SOS requires either a logged-in user OR a valid PIN session token
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const body = await req.json();
    const { trigger_type, latitude, longitude, location_label, case_id, patient_email, patient_name, patient_phone, is_silent, destination_country, pin_session_token } = body;

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

    if (!trigger_type || !patient_email) return Response.json({ error: 'trigger_type and patient_email required' }, { status: 400 });

    const now = new Date().toISOString();
    const route = SOS_ROUTES[trigger_type] || SOS_ROUTES.police;

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
    const sosEvent = await base44.asServiceRole.entities.SOSEvent.create({
      case_id: case_id || null,
      patient_email,
      patient_name: patient_name || 'Unknown Patient',
      patient_phone: patient_phone || '',
      trigger_type,
      latitude: latitude || null,
      longitude: longitude || null,
      location_label: location_label || 'Location unknown',
      status: 'triggered',
      escalation_level: 1,
      is_silent: !!is_silent || trigger_type === 'silent_sos',
      translated_message: translatedMessage,
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
    <hr/>
    <p style="color:#dc2626;font-weight:bold;">IMMEDIATE ACTION REQUIRED — Dispatch ${route.label}</p>
    <p><strong>Translated Message for Local First Responders:</strong><br/><em>${translatedMessage}</em></p>
  </div>
</div>`;

    if (adminNotifyEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safe-T Emergency System',
          to: adminNotifyEmail,
          subject: `🚨 SOS — ${route.label} — ${patient_name || patient_email}`,
          body: adminEmailBody
        });
        notificationsSent.push('admin_email');
      } catch (_) { notificationsSent.push('admin_email_failed'); }
    }

    // SMS via Twilio if phone available
    if (patient_phone) {
      try {
        await base44.asServiceRole.functions.invoke('sendSmsNotification', {
          to: patient_phone,
          message: `Morales Safe-T: Your ${route.label} SOS has been received. Emergency team alerted. Stay calm and stay where you are. If safe to call, dial your local emergency number.`
        });
        notificationsSent.push('patient_sms');
      } catch (_) {}
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
});