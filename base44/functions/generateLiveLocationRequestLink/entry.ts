import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { reportIncident, generateIncidentCode } from '../../shared/incidentReporting.ts';

// generateLiveLocationRequestLink — M-Care (or the patient) creates a secure,
// one-time link someone opens on any device to stream their live GPS into the
// LiveLocation record tied to their case (traveler) or their transport request
// (driver). The token authorizes the public store endpoint — no user session
// is required to share.
//
// role='traveler' (default): the patient sharing their own location for safety.
// role='driver': the matched taxi partner sharing their location so the
//   traveler can watch them approach in real time. The transport_request_id is
//   used as the case_id linkage key so storeLiveLocationUpdate's existing
//   upsert works unchanged, and driver_id / driver_name / visual_code /
//   pickup coords are stored so the traveler's widget can render without a join.

function generateToken(len = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return 'LT_' + Array.from(buf).map((b) => chars[b % chars.length]).join('');
}

// Found while diagnosing a live M-Care report: this function's own error
// paths swallowed the real cause completely (bare catch, generic message),
// so "the link service isn't responding" had no way to become "here's the
// actual reason" without guessing. Reports a real ReliabilityIncident —
// awaited with the same bounded 2s timeout race createHandler.ts's own
// catch-all uses, since the isolate can tear down right after the response
// returns — and never lets a reporting failure affect the response itself.
async function reportBestEffort(base44: any, feature: string, note: string, error: unknown): Promise<void> {
  try {
    await Promise.race([
      reportIncident({
        base44,
        incidentCode: generateIncidentCode(),
        severity: 'high',
        source: 'api',
        feature,
        errorMessage: `${note}: ${error instanceof Error ? error.message : String(error)}`,
      }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (_) { /* incident reporting must never affect the response */ }
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body().catch(() => ({}));
  const role = String(b.role || 'traveler').trim().toLowerCase() === 'driver' ? 'driver' : 'traveler';
  const case_id = String(b.case_id || '').trim();
  const transport_request_id = String(b.transport_request_id || '').trim();
  const driver_id = String(b.driver_id || '').trim();
  const driver_name = String(b.driver_name || '').trim().slice(0, 120);
  const visual_code = String(b.visual_code || '').trim().slice(0, 20);
  const pickup_latitude = typeof b.pickup_latitude === 'number' ? b.pickup_latitude : null;
  const pickup_longitude = typeof b.pickup_longitude === 'number' ? b.pickup_longitude : null;
  const reason = String(b.reason || (role === 'driver'
    ? 'Driver — share your live location so your passenger can watch you approach'
    : 'Patient reported feeling unsafe during medical travel')).slice(0, 300);
  const expires_hours = Math.min(Math.max(Number(b.expires_hours) || 24, 1), 72);

  // ── Resolve linkage key ────────────────────────────────────────────────────
  // For traveler: an explicit case_id must belong to this user, or fall back to
  // the patient's most recent case. For driver: transport_request_id is required
  // and is used as the case_id linkage key (so the existing store/get path works).
  let resolvedCaseId = case_id;
  let resolvedUserId = user?.id || '';
  let resolvedEmail = user?.email || '';
  let resolvedName = user?.full_name || user?.email || '';

  if (role === 'driver') {
    if (!transport_request_id) return err('transport_request_id is required for a driver link.', 400);
    if (!driver_id) return err('driver_id is required for a driver link.', 400);
    resolvedCaseId = transport_request_id;
    // The driver is not an app user — use the driver_id as the user_id so the
    // LiveLocation RLS read rule (data.user_id === user.id) doesn't collide;
    // storeLiveLocationUpdate runs asServiceRole so create still succeeds.
    resolvedUserId = driver_id;
    resolvedEmail = String(b.driver_email || `driver+${driver_id}@morales.local`);
    resolvedName = driver_name || 'Driver';
  } else if (!resolvedCaseId) {
    try {
      const cases = await base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 1);
      resolvedCaseId = cases?.[0]?.id || '';
    } catch (_) { resolvedCaseId = ''; }
  } else {
    try {
      const cases = await base44.entities.CaseRecord.filter({ id: case_id });
      if (!cases?.[0] || cases[0].client_email !== user.email) {
        return err('Case not found or access denied.', 403);
      }
    } catch (caseErr) {
      // A transient lookup failure isn't the same claim as "access denied" —
      // don't tell the caller they're not allowed to see a case when the real
      // reason is the read itself failed. Logged (bounded, non-blocking) so
      // the real cause is visible instead of only ever "access denied."
      await reportBestEffort(base44, 'generateLiveLocationRequestLink', 'case ownership lookup failed', caseErr);
      return err('Could not verify that case right now. Please try again.', 500);
    }
  }

  // Fail honestly, and before writing anything, rather than silently ship a
  // broken link — a relative /share-location/:token path (no domain) is only
  // reachable from a device already on this app's own origin, useless in the
  // SMS/external-device context this link exists for. A patient who feels
  // unsafe getting a link that quietly doesn't work is worse than an honest
  // "try again" here.
  const rawAppUrl = Deno.env.get('APP_URL') || '';
  if (!rawAppUrl) {
    await reportBestEffort(base44, 'generateLiveLocationRequestLink', 'APP_URL is not set — cannot build a usable share link', new Error('APP_URL missing'));
    return err('Could not create the location-sharing link. Please try again.', 500);
  }
  const appUrl = rawAppUrl.replace(/\/$/, '');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expires_hours * 3600 * 1000).toISOString();
  const token = generateToken(40);

  const record: any = {
    token,
    role,
    case_id: resolvedCaseId,
    transport_request_id: role === 'driver' ? transport_request_id : undefined,
    driver_id: role === 'driver' ? driver_id : undefined,
    user_id: resolvedUserId,
    user_email: resolvedEmail,
    patient_name: resolvedName,
    driver_name: role === 'driver' ? driver_name : undefined,
    visual_code: role === 'driver' ? visual_code : undefined,
    pickup_latitude: role === 'driver' ? pickup_latitude : undefined,
    pickup_longitude: role === 'driver' ? pickup_longitude : undefined,
    reason,
    status: 'requested',
    expires_at: expiresAt,
    created_at: now.toISOString(),
  };

  let rec: any = null;
  try {
    rec = await base44.asServiceRole.entities.LiveLocationRequest.create(record);
  } catch (createErr) {
    await reportBestEffort(base44, 'generateLiveLocationRequestLink', 'LiveLocationRequest.create failed', createErr);
    return err('Could not create the location-sharing link. Please try again.', 500);
  }

  const url = `${appUrl}/share-location/${token}`;

  return ok({
    request_id: rec?.id || '',
    token,
    url,
    role,
    expires_at: expiresAt,
    case_id: resolvedCaseId,
    transport_request_id: role === 'driver' ? transport_request_id : undefined,
    message: role === 'driver'
      ? 'Share this secure link with the driver. They open it on their phone, tap once to consent, and their live location streams to the traveler — no app or login needed.'
      : 'Share this secure link with the patient. They open it on their phone, tap once to consent, and their live location streams to your care team — no app or login needed.',
  });
}, { name: 'generateLiveLocationRequestLink', requireAuth: true }));