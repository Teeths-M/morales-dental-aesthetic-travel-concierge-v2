import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

// Same HMAC scheme as getPortalData's verifyPortalToken — see reviseTravelQuote
// for why this is duplicated locally rather than shared.
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
  const sigBytes = Uint8Array.from(sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) return null;
  const payload = JSON.parse(data);
  if (Date.now() > payload.expires_at) return null;
  return payload;
}

// Keeps the patient Journey Map's logistics fields (flight number, hotel name/
// address/coords) in sync with what the travel agency enters — separate from
// reviseTravelQuote's pricing/revision-count bookkeeping so a first-time save
// never gets miscounted as "Revision #1". Previously written client-side via
// base44.asServiceRole.entities.CaseRecord.update, which throws in the browser
// and was silently swallowed by a bare .catch(() => {}).
Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, flight_number, hotel_name, hotel_address, hotel_lat, hotel_lng } = await req.json();

    if (!token) return Response.json({ error: 'Portal token required' }, { status: 401 });

    const verified = await verifyPortalToken(token);
    if (!verified) return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });

    const { partner_id, consultation_id } = verified;
    if (!partner_id || !consultation_id) {
      return Response.json({ error: 'Malformed portal token: missing required claims' }, { status: 403 });
    }

    const workflows = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });
    const workflow = workflows[0];
    const authorisedPartnerIds = workflow
      ? [workflow.assigned_doctor_id, workflow.assigned_agency_id, workflow.assigned_taxi_id].filter(Boolean)
      : [];
    if (!workflow || !authorisedPartnerIds.includes(partner_id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id }, '-created_date', 1);
    const caseRecord = cases[0];
    if (!caseRecord) return Response.json({ success: true, synced: false });

    const hotelCoords = (hotel_lat && hotel_lng) ? { lat: Number(hotel_lat), lng: Number(hotel_lng) } : null;
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      ...(flight_number ? { logistics_flight_number: flight_number } : {}),
      ...(hotel_name ? { hotel_name } : {}),
      ...(hotel_address ? { hotel_address } : {}),
      ...(hotelCoords ? { hotel_coords: hotelCoords } : {}),
    });

    return Response.json({ success: true, synced: true });
  } catch (error) {
    console.error('[syncTravelLogistics]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'syncTravelLogistics', requireAuth: false }));
