import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const driver = (await base44.asServiceRole.entities.DestinationDriver.filter({ token: body.token }))[0];
    if (!driver || new Date(driver.token_expires_at) < new Date()) return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    const request = (await base44.asServiceRole.entities.PatientRequest.filter({ id: body.patient_request_id }))[0];
    const data = { driver_id: driver.id, patient_request_id: body.patient_request_id, patient_id: request?.patient_id, leg_airport_hotel: Number(body.leg_airport_hotel), leg_hotel_clinic: Number(body.leg_hotel_clinic), leg_clinic_hotel: Number(body.leg_clinic_hotel), leg_hotel_airport: Number(body.leg_hotel_airport), vehicle_type: body.vehicle_type, waiting_included: Boolean(body.waiting_included) };
    const existing = (await base44.asServiceRole.entities.DestinationDriverQuote.filter({ driver_id: driver.id, patient_request_id: body.patient_request_id }))[0];
    const quote = existing ? await base44.asServiceRole.entities.DestinationDriverQuote.update(existing.id, data) : await base44.asServiceRole.entities.DestinationDriverQuote.create(data);
    return Response.json({ success: true, quote });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});