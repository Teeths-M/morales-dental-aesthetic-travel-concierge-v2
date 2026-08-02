import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

// Same HMAC scheme as getPortalData's verifyPortalToken — duplicated locally
// rather than shared, matching the existing convention in this codebase
// (sendTravelQuoteEmail and generateLocalDoctorPortalLink each keep their own
// local encode/verify copy rather than importing one).
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

// Revises an already-submitted travel quote. Previously the frontend wrote
// WorkflowEvent/CaseRecord directly via base44.asServiceRole, which throws in
// the browser — every revision attempt silently failed. Moved server-side and
// re-authorised the same way getPortalData does (signed token, partner must be
// the one actually assigned to this consultation) rather than trusting a
// client-supplied consultation_id for a write.
Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, flight_cost_usd, hotel_cost_usd, flight_itinerary_summary, hotel_selection } = await req.json();

    if (!token) return Response.json({ error: 'Portal token required' }, { status: 401 });

    const verified = await verifyPortalToken(token);
    if (!verified) return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });

    const { partner_id, consultation_id } = verified;
    if (!partner_id || !consultation_id) {
      return Response.json({ error: 'Malformed portal token: missing required claims' }, { status: 403 });
    }

    const workflows = await base44.asServiceRole.entities.WorkflowEvent.filter({ consultation_id });
    const workflow = workflows[0];
    if (!workflow) return Response.json({ error: 'No workflow found for this consultation' }, { status: 403 });

    const authorisedPartnerIds = [
      workflow.assigned_doctor_id,
      workflow.assigned_agency_id,
      workflow.assigned_taxi_id,
    ].filter(Boolean);
    if (!authorisedPartnerIds.includes(partner_id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const newRevisionCount = (workflow.travel_revision_count || 0) + 1;

    await base44.asServiceRole.entities.WorkflowEvent.update(workflow.id, {
      travel_quote_flight_cost: Number(flight_cost_usd) || 0,
      travel_quote_hotel_cost: Number(hotel_cost_usd) || 0,
      flight_itinerary_summary: flight_itinerary_summary || '',
      hotel_selection: hotel_selection || '',
      travel_quote_revised_at: new Date().toISOString(),
      travel_revision_count: newRevisionCount,
    });

    return Response.json({ success: true, revision_count: newRevisionCount });
  } catch (error) {
    console.error('[reviseTravelQuote]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'reviseTravelQuote', requireAuth: false }));
