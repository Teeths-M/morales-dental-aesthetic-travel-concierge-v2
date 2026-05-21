import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const agency = (await base44.asServiceRole.entities.TravelAgency.filter({ token: body.token }))[0];
    if (!agency || new Date(agency.token_expires_at) < new Date()) return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    const data = { agency_id: agency.id, patient_request_id: body.patient_request_id, total_price_usd: Number(body.total_price_usd), flight_details: body.flight_details, hotel_name: body.hotel_name, hotel_address: body.hotel_address };
    const existing = (await base44.asServiceRole.entities.TravelOffer.filter({ agency_id: agency.id, patient_request_id: body.patient_request_id }))[0];
    const offer = existing ? await base44.asServiceRole.entities.TravelOffer.update(existing.id, data) : await base44.asServiceRole.entities.TravelOffer.create(data);
    return Response.json({ success: true, offer });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});