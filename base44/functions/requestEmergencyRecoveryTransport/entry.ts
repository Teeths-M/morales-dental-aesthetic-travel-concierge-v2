/**
 * requestEmergencyRecoveryTransport
 * 
 * Emergency recovery pickup for compromised travelers (drugged, robbed, no phone/cash).
 * Requires valid PinSession OR admin role.
 * Creates a RecoveryTransportRequest, a VisualVerificationToken, and alerts admin/driver.
 * Does NOT require patient's physical card or original device.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { dispatchRecoveryTransport } from '../../shared/recoveryTransportDispatch.ts';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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

    // ── Dispatch (real matching/token/notify logic lives in one shared place —
    // requestOnDemandRide is the other caller, for a routine chat "get me a
    // cab" request from a normal authenticated traveler) ───────────────────
    const result = await dispatchRecoveryTransport(base44, {
      userEmail,
      caseId: case_id,
      pickupLatitude: pickup_latitude ?? null,
      pickupLongitude: pickup_longitude ?? null,
      pickupAddress: pickup_address,
      pickupLocationSource: pickup_location_source,
      destinationAddress: destination_address,
      notes,
      requestedBy: requested_by,
      source: 'requestEmergencyRecoveryTransport',
      journeyEventPriorityOnMatch: 'high',
    });

    return Response.json(result);
  } catch (error) {
    console.error('[requestEmergencyRecoveryTransport]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'requestEmergencyRecoveryTransport', requireAuth: false }));