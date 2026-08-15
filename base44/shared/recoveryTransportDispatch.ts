/**
 * recoveryTransportDispatch — the real driver-matching / safety-code /
 * notification logic behind an on-demand pickup, extracted so it has exactly
 * one implementation with two callers:
 *   - requestEmergencyRecoveryTransport (PinSession-or-admin, compromised
 *     traveler scenarios — unchanged behavior after this extraction)
 *   - requestOnDemandRide (normal authenticated traveler, routine "get me a
 *     cab" requests — new)
 *
 * Same discipline as weatherEngine.ts / findDoctorBackup.ts elsewhere in this
 * repo: one real implementation, callers differ only in who may reach it and
 * why, never in what it actually does once called.
 */
import { logJourneyEvent } from './logJourneyEvent.ts';

function generateHex(len = 16) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a memorable visual verification code like "MANGO-7421"
const WORDS = ['MANGO', 'COBRA', 'EMBER', 'RIDGE', 'SOLAR', 'TIGER', 'VAPOR', 'CEDAR', 'FLARE', 'OASIS'];
function generateVisualCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

export interface DispatchRecoveryTransportOpts {
  userEmail: string;
  caseId?: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupAddress?: string;
  pickupLocationSource?: string;
  destinationAddress?: string;
  notes?: string;
  requestedBy?: string;
  /** The calling function's own name — recorded on the JourneyEvent as `source`. */
  source: string;
  /** JourneyEvent priority when a driver WAS matched. The no-driver case is
   *  always 'medium' regardless — "no ride is coming" is informational, not
   *  the "help is on the way" signal a matched dispatch is. */
  journeyEventPriorityOnMatch?: 'medium' | 'high';
}

export interface DispatchRecoveryTransportResult {
  success: true;
  request_id: string;
  request_token: string;
  visual_code: string;
  visual_code_expires_at: string;
  driver_assigned: boolean;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
}

export async function dispatchRecoveryTransport(
  base44: any,
  opts: DispatchRecoveryTransportOpts,
): Promise<DispatchRecoveryTransportResult> {
  const {
    userEmail,
    caseId,
    pickupLatitude = null,
    pickupLongitude = null,
    pickupAddress,
    pickupLocationSource = 'gps',
    destinationAddress,
    notes,
    requestedBy = 'patient',
    source,
    journeyEventPriorityOnMatch = 'high',
  } = opts;

  const now = new Date();
  const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') || '';

  // ── Resolve case ─────────────────────────────────────────────────────────
  let resolvedCaseId = caseId || '';
  let caseRecord: any = null;
  try {
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 5);
    caseRecord = cases.find((c: any) => c.id === resolvedCaseId) || cases[0];
    resolvedCaseId = caseRecord?.id || resolvedCaseId || '';
  } catch (_) { /* best-effort — an unresolved case still allows dispatch */ }

  // ── Find available driver ────────────────────────────────────────────────
  let driverRecord: any = null;
  try {
    const drivers = await base44.asServiceRole.entities.TaxiService.filter(
      { status: 'active', is_online: true }, '-created_date', 5,
    );
    // Prefer assigned driver, fallback to any available
    const assigned = caseRecord?.destination_driver_id
      ? drivers.find((d: any) => d.id === caseRecord.destination_driver_id)
      : null;
    driverRecord = assigned || drivers[0] || null;
  } catch (_) { /* best-effort — falls through to the honest no-driver path */ }

  // ── Visual Verification Token ────────────────────────────────────────────
  const visualCode = generateVisualCode();
  const tokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

  let visualTokenId: string | null = null;
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
  } catch (_) { /* best-effort — dispatch still proceeds without a stored token row */ }

  // ── Driver live-location link (so the traveler can watch the driver approach)
  // PRD: when a driver is matched, generate a secure token-link the driver opens
  // in a browser to stream their GPS — the same mechanism the traveler uses for
  // safety sharing. Stored on the transport request as driver_location_token so
  // the traveler's inline map widget can poll it via getDriverLocationStatus.
  let driverLocationToken = '';
  let driverLocationUrl: string | null = null;
  if (driverRecord) {
    try {
      const dlToken = 'LT_' + generateHex(20);
      const dlExpiresAt = new Date(now.getTime() + 2 * 3600 * 1000).toISOString(); // 2h — a ride share shouldn't live forever
      await base44.asServiceRole.entities.LiveLocationRequest.create({
        token: dlToken,
        role: 'driver',
        case_id: '', // filled below once the transport request id is known
        transport_request_id: '', // filled below
        driver_id: driverRecord.id,
        user_id: driverRecord.id, // not an app user; use driver_id so LiveLocation RLS doesn't collide
        user_email: `driver+${driverRecord.id}@morales.local`,
        patient_name: driverRecord.driver_name || driverRecord.agency_name || 'Driver',
        driver_name: driverRecord.driver_name || driverRecord.agency_name || 'Driver',
        visual_code: visualCode,
        pickup_latitude: pickupLatitude ?? null,
        pickup_longitude: pickupLongitude ?? null,
        reason: 'Driver — share your live location so your passenger can watch you approach',
        status: 'requested',
        expires_at: dlExpiresAt,
        created_at: now.toISOString(),
      });
      driverLocationToken = dlToken;
      driverLocationUrl = `${appUrl.replace(/\/$/, '')}/share-location/${dlToken}`;
    } catch (_) { /* best-effort — dispatch proceeds without driver tracking */ }
  }

  // ── Create RecoveryTransportRequest ─────────────────────────────────────
  const requestToken = `RTRANS_${generateHex(12)}`;
  const mapsUrl = pickupLatitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLatitude},${pickupLongitude}&travelmode=driving`
    : null;

  const transportRequest = await base44.asServiceRole.entities.RecoveryTransportRequest.create({
    request_token: requestToken,
    case_id: resolvedCaseId,
    user_email: userEmail,
    user_name: caseRecord?.client_name || userEmail.split('@')[0],
    requested_by: requestedBy,
    pickup_latitude: pickupLatitude,
    pickup_longitude: pickupLongitude,
    pickup_address: pickupAddress || (pickupLatitude != null ? `${Number(pickupLatitude).toFixed(5)}, ${Number(pickupLongitude).toFixed(5)}` : 'Unknown'),
    pickup_location_source: pickupLocationSource,
    destination_address: destinationAddress || caseRecord?.hotel_address || 'Hotel/safe location — contact guardian for address',
    driver_id: driverRecord?.id || '',
    driver_name: driverRecord?.driver_name || driverRecord?.agency_name || '',
    driver_phone: driverRecord?.phone || '',
    driver_location_token: driverLocationToken,
    visual_verification_token_id: visualTokenId || '',
    payment_status: 'emergency_transport_authorized',
    status: driverRecord ? 'driver_assigned' : 'no_driver',
    notes: notes || '',
    dispatched_at: now.toISOString(),
    created_at: now.toISOString(),
  });

  // ── Backfill the driver LiveLocationRequest's linkage keys now that the
  // transport request id exists (we created the link record just above). The
  // case_id on the driver's LiveLocationRequest is the transport request id —
  // that's the linkage key storeLiveLocationUpdate upserts against.
  if (driverLocationToken && transportRequest?.id) {
    try {
      const dlReqs = await base44.asServiceRole.entities.LiveLocationRequest.filter({ token: driverLocationToken }, '-created_at', 1);
      if (dlReqs?.[0]) {
        await base44.asServiceRole.entities.LiveLocationRequest.update(dlReqs[0].id, {
          case_id: transportRequest.id,
          transport_request_id: transportRequest.id,
        });
      }
    } catch (_) { /* best-effort */ }
  }

  // ── Alert admin ──────────────────────────────────────────────────────────
  if (adminEmail) {
    const locStr = pickupLatitude != null
      ? `${Number(pickupLatitude).toFixed(5)}, ${Number(pickupLongitude).toFixed(5)}`
      : pickupAddress || 'Unknown';

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Safety — RECOVERY TRANSPORT',
        to: adminEmail,
        subject: `🚗 Recovery Transport Request (${source}) — ${userEmail}`,
        body: `<div style="font-family:sans-serif;max-width:600px;padding:24px;border:2px solid #dc2626;border-radius:12px;">
<div style="background:#dc2626;color:white;padding:16px;border-radius:8px;margin-bottom:20px;">
  <h2 style="margin:0;">🚗 Recovery Transport Dispatched</h2>
</div>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:6px 0;color:#6b7280;">Traveler</td><td><strong>${caseRecord?.client_name || userEmail}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td>${userEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Case ID</td><td>${resolvedCaseId || 'N/A'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Pickup Location</td><td>${locStr}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Destination</td><td>${destinationAddress || 'Hotel — verify with guardian'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Visual Code</td><td><strong style="font-size:18px;color:#1d4ed8;">${visualCode}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Driver</td><td>${driverRecord ? `${driverRecord.driver_name || driverRecord.agency_name} — ${driverRecord.phone}` : '⚠️ No driver available — manual dispatch required'}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Requested By</td><td>${requestedBy}</td></tr>
  <tr><td style="padding:6px 0;color:#6b7280;">Triggered Via</td><td>${source}</td></tr>
</table>
${mapsUrl ? `<p style="margin-top:16px;"><a href="${mapsUrl}" style="color:#dc2626;font-weight:bold;">📍 Navigate to Pickup Location</a></p>` : ''}
${!driverRecord ? `<p style="color:#dc2626;font-weight:bold;margin-top:16px;">⚠️ NO DRIVER ASSIGNED — Manual dispatch required immediately</p>` : ''}
<p style="color:#6b7280;font-size:12px;margin-top:16px;">Visual verification code shown to traveler: <strong>${visualCode}</strong>. Driver must confirm matching code before pickup. Code expires in 1 hour.</p>
</div>`,
      });
    } catch (_) { /* best-effort */ }
  }

  // ── SMS driver if available ──────────────────────────────────────────────
  if (driverRecord?.phone && twilioSid && twilioAuth && twilioFrom) {
    const locStr = pickupLatitude != null
      ? `${Number(pickupLatitude).toFixed(5)}, ${Number(pickupLongitude).toFixed(5)}`
      : pickupAddress || 'Unknown';
    const driverSms = `MORALES PICKUP REQUEST: Patient at ${locStr}. Visual code: ${visualCode}. Confirm code before pickup. ${mapsUrl || 'Contact admin for directions.'}${driverLocationUrl ? ` Tap to share your live location with your passenger: ${driverLocationUrl}` : ''}`;
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: twilioFrom, To: driverRecord.phone, Body: driverSms }),
      });
    } catch (_) { /* best-effort */ }
  }

  // ── Dispatch failure if no driver ────────────────────────────────────────
  if (!driverRecord) {
    try {
      await base44.asServiceRole.entities.DispatchFailureLog.create({
        case_id: resolvedCaseId,
        escalation_level: 4,
        failure_reason: `No active driver available for recovery transport (via ${source})`,
        partner_type: 'taxi',
        status: 'logged',
        created_at: now.toISOString(),
      });
    } catch (_) { /* best-effort */ }
  }

  // ── Felt back in M-Care's own chat, regardless of which caller dispatched
  // this — the one addition this extraction makes over the original inline
  // logic. Never claims a driver is coming when none was matched.
  if (resolvedCaseId) {
    const messageText = driverRecord
      ? `I've sent a driver your way. Your safety code is ${visualCode} — the driver will confirm it before pickup.`
      : "I tried to find you a driver but none are available right now. I've flagged this for the team to arrange one manually.";
    await logJourneyEvent(base44, {
      case_id: resolvedCaseId,
      client_email: userEmail,
      event_type: 'ride_dispatched',
      source,
      message_text: messageText,
      priority: driverRecord ? journeyEventPriorityOnMatch : 'medium',
      action_taken: driverRecord ? `Matched driver ${driverRecord.driver_name || driverRecord.agency_name}` : 'No driver available, logged for manual dispatch',
      tool_result: { driver_assigned: !!driverRecord, request_id: transportRequest.id },
      user_action_required: !driverRecord,
      escalation_occurred: !driverRecord,
    });
  }

  return {
    success: true,
    request_id: transportRequest.id,
    request_token: requestToken,
    visual_code: visualCode,
    visual_code_expires_at: tokenExpiresAt,
    driver_assigned: !!driverRecord,
    driver_name: driverRecord?.driver_name || driverRecord?.agency_name || null,
    driver_phone: driverRecord?.phone || null,
    status: transportRequest.status,
  };
}