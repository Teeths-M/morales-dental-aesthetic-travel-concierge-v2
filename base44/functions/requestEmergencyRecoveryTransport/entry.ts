/**
 * requestEmergencyRecoveryTransport
 * 
 * Emergency recovery pickup for compromised travelers (drugged, robbed, no phone/cash).
 * Requires valid PinSession OR admin role.
 * Creates a RecoveryTransportRequest, a VisualVerificationToken, and alerts admin/driver.
 * Does NOT require patient's physical card or original device.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(len = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

function generateHex(len = 16) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a memorable visual verification code like "MANGO-7421"
const WORDS = ['MANGO', 'COBRA', 'EMBER', 'RIDGE', 'SOLAR', 'TIGER', 'VAPOR', 'CEDAR', 'FLARE', 'OASIS'];
function generateVisualCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

async function validatePinSession(base44, token) {
  if (!token) return { valid: false };
  const tokenHash = await sha256(token);
  const sessions = await base44.asServiceRole.entities.PinSession.filter({ token_hash: tokenHash, is_revoked: false });
  if (!sessions.length) return { valid: false };
  const session = sessions[0];
  if (new Date(session.expires_at) < new Date()) return { valid: false };
  await base44.asServiceRole.entities.PinSession.update(session.id, {
    last_used_at: new Date().toISOString(),
    use_count: (session.use_count || 0) + 1,
  });
  return { valid: true, session };
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      pin_session_token,
      pickup_latitude,
      pickup_longitude,
      pickup_address,
      pickup_location_source = 'gps',
      destination_address,
      notes,
      requested_by = 'patient',
      case_id,
    } = body;

    const now = new Date();
    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

    // ── Auth: accept PinSession OR admin ──────────────────────────────────────
    let userEmail = null;
    let isAdmin = false;

    const sessionResult = pin_session_token ? await validatePinSession(base44, pin_session_token) : { valid: false };
    if (sessionResult.valid) {
      userEmail = sessionResult.session.user_email;
    } else {
      try {
        const u = await base44.auth.me();
        if (u && (u.role === 'admin' || u.role === 'platform_admin')) {
          isAdmin = true;
          userEmail = u.email;
        }
      } catch (_) {}
    }

    if (!userEmail) {
      return Response.json({ error: 'Valid PinSession or admin auth required' }, { status: 401 });
    }

    // ── Resolve case ─────────────────────────────────────────────────────────
    let resolvedCaseId = case_id || '';
    let caseRecord = null;
    try {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 5);
      caseRecord = cases.find(c => c.id === resolvedCaseId) || cases[0];
      resolvedCaseId = caseRecord?.id || resolvedCaseId || '';
    } catch (_) {}

    // ── Find available driver ────────────────────────────────────────────────
    let driverRecord = null;
    try {
      const drivers = await base44.asServiceRole.entities.TaxiService.filter(
        { status: 'active', is_online: true }, '-created_date', 5
      );
      // Prefer assigned driver, fallback to any available
      const assigned = caseRecord?.destination_driver_id
        ? drivers.find(d => d.id === caseRecord.destination_driver_id)
        : null;
      driverRecord = assigned || drivers[0] || null;
    } catch (_) {}

    // ── Visual Verification Token ────────────────────────────────────────────
    const visualCode = generateVisualCode();
    const tokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

    let visualTokenId = null;
    try {
      const vt = await base44.asServiceRole.entities.VisualVerificationToken.create({
        token_code: visualCode,
        case_id: resolvedCaseId,
        user_email: userEmail,
        purpose: 'recovery_pickup',
        status: 'active',
        expires_at: tokenExpiresAt,
        created_at: now.toISOString(),
      });
      visualTokenId = vt?.id || null;
    } catch (_) {}

    // ── Create RecoveryTransportRequest ─────────────────────────────────────
    const requestToken = `RTRANS_${generateHex(12)}`;
    const mapsUrl = pickup_latitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${pickup_latitude},${pickup_longitude}&travelmode=driving`
      : null;

    const transportRequest = await base44.asServiceRole.entities.RecoveryTransportRequest.create({
      request_token: requestToken,
      case_id: resolvedCaseId,
      user_email: userEmail,
      user_name: caseRecord?.client_name || userEmail.split('@')[0],
      requested_by,
      pickup_latitude: pickup_latitude ?? null,
      pickup_longitude: pickup_longitude ?? null,
      pickup_address: pickup_address || (pickup_latitude != null ? `${Number(pickup_latitude).toFixed(5)}, ${Number(pickup_longitude).toFixed(5)}` : 'Unknown'),
      pickup_location_source,
      destination_address: destination_address || caseRecord?.hotel_address || 'Hotel/safe location — contact guardian for address',
      driver_id: driverRecord?.id || '',
      driver_name: driverRecord?.driver_name || driverRecord?.agency_name || '',
      driver_phone: driverRecord?.phone || '',
      visual_verification_token_id: visualTokenId || '',
      payment_status: 'emergency_transport_authorized',
      status: driverRecord ? 'driver_assigned' : 'no_driver',
      notes: notes || '',
      dispatched_at: now.toISOString(),
      created_at: now.toISOString(),
    });

    // ── Alert admin ──────────────────────────────────────────────────────────
    if (adminEmail) {
      const locStr = pickup_latitude != null
        ? `${Number(pickup_latitude).toFixed(5)}, ${Number(pickup_longitude).toFixed(5)}`
        : pickup_address || 'Unknown';

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales Safety — EMERGENCY TRANSPORT',
          to: adminEmail,
          subject: `🚨 Emergency Recovery Transport Request — ${userEmail}`,
          body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<div style="background:#dc2626;color:white;padding:16px;border-radius:8px;margin-bottom:20px;">
  <h2 style="margin:0;">🚗 Emergency Recovery Transport</h2>
</div>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:6px 0;color:#6b7280;">Traveler</td><td><strong>${caseRecord?.client_name || userEmail}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td>${userEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Case ID</td><td>${resolvedCaseId || 'N/A'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Pickup Location</td><td>${locStr}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Destination</td><td>${destination_address || 'Hotel — verify with guardian'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Visual Code</td><td><strong style="font-size:18px;color:#1d4ed8;">${visualCode}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Driver</td><td>${driverRecord ? `${driverRecord.driver_name || driverRecord.agency_name} — ${driverRecord.phone}` : '⚠️ No driver available — manual dispatch required'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Requested By</td><td>${requested_by}</td></tr>
</table>
${mapsUrl ? `<p style="margin-top:16px;"><a href="${mapsUrl}" style="color:#dc2626;font-weight:bold;">📍 Navigate to Pickup Location</a></p>` : ''}
${!driverRecord ? `<p style="color:#dc2626;font-weight:bold;margin-top:16px;">⚠️ NO DRIVER ASSIGNED — Manual dispatch required immediately</p>` : ''}
<p style="color:#6b7280;font-size:12px;margin-top:16px;">Visual verification code shown to traveler: <strong>${visualCode}</strong>. Driver must confirm matching code before pickup. Code expires in 1 hour.</p>
</div>`,
        });
      } catch (_) {}
    }

    // ── SMS driver if available ──────────────────────────────────────────────
    if (driverRecord?.phone && twilioSid && twilioAuth && twilioFrom) {
      const locStr = pickup_latitude != null
        ? `${Number(pickup_latitude).toFixed(5)}, ${Number(pickup_longitude).toFixed(5)}`
        : pickup_address || 'Unknown';
      const driverSms = `MORALES EMERGENCY PICKUP: Patient at ${locStr}. Visual code: ${visualCode}. Confirm code before pickup. ${mapsUrl || 'Contact admin for directions.'}`;
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: twilioFrom, To: driverRecord.phone, Body: driverSms }),
        });
      } catch (_) {}
    }

    // ── Dispatch failure if no driver ────────────────────────────────────────
    if (!driverRecord) {
      try {
        await base44.asServiceRole.entities.DispatchFailureLog.create({
          case_id: resolvedCaseId,
          escalation_level: 4,
          failure_reason: 'No active driver available for emergency recovery transport',
          partner_type: 'taxi',
          status: 'logged',
          created_at: now.toISOString(),
        });
      } catch (_) {}
    }

    return Response.json({
      success: true,
      request_id: transportRequest.id,
      request_token: requestToken,
      visual_code: visualCode,
      visual_code_expires_at: tokenExpiresAt,
      driver_assigned: !!driverRecord,
      driver_name: driverRecord?.driver_name || driverRecord?.agency_name || null,
      driver_phone: driverRecord?.phone || null,
      status: transportRequest.status,
    });
  } catch (error) {
    console.error('[requestEmergencyRecoveryTransport]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'requestEmergencyRecoveryTransport', requireAuth: false }));
