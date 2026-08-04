import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { findDriverBackup } from '../../shared/findDriverBackup.ts';

// Same verification as getPortalData's verifyPortalToken — a driver who
// already confirmed a leg uses the exact same portal token to back out.
// Not extracted into shared/ here: getPortalData, reviseTravelQuote, and
// syncTravelLogistics already each carry their own inline copy of this
// exact function, so a fourth copy matches the existing (if imperfect)
// convention rather than being a one-off refactor of three working,
// unrelated files.
async function verifyPortalToken(token: string) {
  const [b64, sigHex] = token.split('.');
  if (!b64 || !sigHex) return null;
  const data = atob(b64);
  const secret = (() => {
    const s = Deno.env.get('PORTAL_TOKEN_SECRET');
    if (!s || s === 'change-me-in-production') {
      throw new Error('PORTAL_TOKEN_SECRET is not set — refusing to sign or verify a portal token.');
    }
    return s;
  })();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBytes = Uint8Array.from((sigHex.match(/.{2}/g) || []).map(h => parseInt(h, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) return null;
  const payload = JSON.parse(data);
  if (Date.now() > payload.expires_at) return null;
  return payload;
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, cancel_reason } = await req.json();

    if (!token) return Response.json({ error: 'Portal token required' }, { status: 401 });

    const verified = await verifyPortalToken(token);
    if (!verified) return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });

    const { partner_id, consultation_id } = verified;
    if (!partner_id || !consultation_id) {
      return Response.json({ error: 'Malformed portal token: missing required claims' }, { status: 403 });
    }

    // Same resolution getPortalData already uses successfully for this exact
    // token shape — CaseRecord.consultation_id, not CaseRecord.id.
    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id }, '-created_date', 1).catch(() => []);
    const caseRecord = cases?.[0] ?? null;
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    let leg: 'origin' | 'destination' | null = null;
    if (caseRecord.origin_driver_id === partner_id) leg = 'origin';
    else if (caseRecord.destination_driver_id === partner_id) leg = 'destination';

    if (!leg) return Response.json({ error: 'You are not assigned to this case' }, { status: 403 });

    if (cancel_reason) {
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        driver_cancel_reason: String(cancel_reason).slice(0, 1000),
      }).catch(() => {});
    }

    // Immediate, event-triggered — no waiting for a timeout the way the
    // separate pickup-handshake no-show system does, because this is an
    // explicit "I can't do this" signal, not silence.
    const result = await findDriverBackup(base44, caseRecord, leg, partner_id);

    return Response.json({ success: true, reassigned: result.success });
  } catch (error) {
    console.error('[cancelDriverAssignment]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'cancelDriverAssignment', requireAuth: false }));
