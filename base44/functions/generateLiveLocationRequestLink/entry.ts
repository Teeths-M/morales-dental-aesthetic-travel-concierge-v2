import { createHandler, ok, err } from '../../shared/createHandler.ts';

// generateLiveLocationRequestLink — M-Care (or the patient) creates a secure,
// one-time link the patient can open on any device to stream their live GPS
// into the LiveLocation record tied to their case. Sent when the patient
// reports feeling unsafe during medical travel. The token authorizes the
// public store endpoint — no user session is required to share.

function generateToken(len = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return 'LT_' + Array.from(buf).map((b) => chars[b % chars.length]).join('');
}

export default createHandler(async ({ base44, user, body }) => {
  const b = await body().catch(() => ({}));
  const case_id = String(b.case_id || '').trim();
  const reason = String(b.reason || 'Patient reported feeling unsafe during medical travel').slice(0, 300);
  // Cap at 72h — a safety-request link should not live forever.
  const expires_hours = Math.min(Math.max(Number(b.expires_hours) || 24, 1), 72);

  // Resolve the case. An explicit case_id must belong to this user; if none is
  // provided, fall back to the patient's most recent case so M-Care can fire
  // this from a chat without a caseId in hand.
  let resolvedCaseId = case_id;
  if (!resolvedCaseId) {
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
    } catch (_) {
      return err('Case not found or access denied.', 403);
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expires_hours * 3600 * 1000).toISOString();
  const token = generateToken(40);

  let rec: any = null;
  try {
    rec = await base44.asServiceRole.entities.LiveLocationRequest.create({
      token,
      case_id: resolvedCaseId,
      user_id: user.id,
      user_email: user.email,
      patient_name: user.full_name || user.email,
      reason,
      status: 'requested',
      expires_at: expiresAt,
      created_at: now.toISOString(),
    });
  } catch (_) {
    return err('Could not create the location-sharing link. Please try again.', 500);
  }

  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  const url = `${appUrl}/share-location/${token}`;

  return ok({
    request_id: rec?.id || '',
    token,
    url,
    expires_at: expiresAt,
    case_id: resolvedCaseId,
    message: 'Share this secure link with the patient. They open it on their phone, tap once to consent, and their live location streams to your care team — no app or login needed.',
  });
}, { name: 'generateLiveLocationRequestLink', requireAuth: true });