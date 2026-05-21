import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { randomBytes } from 'node:crypto';

const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const isoDate = (date) => new Date(date).toISOString().slice(0, 10);
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const token = () => randomBytes(32).toString('hex');

const calcDates = (procedureDateTime, recoveryDays, destination) => {
  const flightDays = destination.flight_days || [];
  const buffer = Number(destination.default_buffer_days || 1);
  const proc = new Date(procedureDateTime);
  let arrival = addDays(new Date(proc.getFullYear(), proc.getMonth(), proc.getDate()), -buffer);
  while (!flightDays.includes(arrival.getDay())) arrival = addDays(arrival, -1);
  let departure = addDays(proc, Number(recoveryDays || 0));
  departure = new Date(departure.getFullYear(), departure.getMonth(), departure.getDate());
  while (!flightDays.includes(departure.getDay())) departure = addDays(departure, 1);
  return {
    arrival: isoDate(arrival),
    departure: isoDate(departure),
    explanation: `Arrive on ${isoDate(arrival)} because flights to ${destination.country} operate on ${flightDays.map(d => dayNames[d]).join(' and ')} and the patient needs ${buffer} buffer day(s). Depart on ${isoDate(departure)} after ${recoveryDays} recovery day(s) on the next available flight day.`
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['doctor', 'admin', 'platform_admin'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const request = (await base44.asServiceRole.entities.PatientRequest.filter({ id: body.request_id }))[0];
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });

    const patient = (await base44.asServiceRole.entities.Patient.filter({ id: request.patient_id }))[0];
    const procedure = (await base44.asServiceRole.entities.ConciergeProcedure.filter({ id: request.procedure_id }))[0];
    const destination = (await base44.asServiceRole.entities.Destination.filter({ country: request.destination_country }))[0];
    const calculated = calcDates(request.procedure_datetime, body.recovery_days || procedure.default_recovery_days, destination);

    await base44.asServiceRole.entities.PatientRequest.update(request.id, {
      status: 'procedures_confirmed',
      doctor_price_usd: Number(body.doctor_price_usd || procedure.default_price_usd),
      recovery_days: Number(body.recovery_days || procedure.default_recovery_days),
      recommended_arrival_date: body.recommended_arrival_date || calculated.arrival,
      recommended_departure_date: body.recommended_departure_date || calculated.departure,
      travel_recommendation_explanation: body.travel_recommendation_explanation || calculated.explanation
    });

    const appUrl = Deno.env.get('APP_URL') || 'https://yourapp.com';
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const arrivalDate = body.recommended_arrival_date || calculated.arrival;
    const departureDate = body.recommended_departure_date || calculated.departure;
    const procedureDate = new Date(request.procedure_datetime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const sendMagic = async (entity, record, type) => {
      const magicToken = token();
      await base44.asServiceRole.entities[entity].update(record.id, { token: magicToken, token_expires_at: expires });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: record.email,
          subject: `New Patient Needs Your Quote – ${patient.name}`,
          body: `A patient has been confirmed for a procedure in ${request.destination_country} on ${procedureDate}.\n\nPatient: ${patient.name}\nProcedure: ${procedure.name}\nRecommended arrival: ${arrivalDate}\nRecommended departure: ${departureDate}\n\nClick the link below to log in and provide your quote:\n\n${appUrl}/portal/${type}?token=${magicToken}&request_id=${request.id}\n\nThis link is unique to you and expires in 7 days.`
        });
      } catch (error) {
        console.log(`Partner email failed for ${record.email}: ${error.message}`);
      }
    };

    const agencies = await base44.asServiceRole.entities.TravelAgency.filter({ country: request.destination_country });
    const originDrivers = await base44.asServiceRole.entities.OriginDriver.filter({ country: patient.home_country });
    const destDrivers = await base44.asServiceRole.entities.DestinationDriver.filter({ country: request.destination_country });
    for (const agency of agencies) await sendMagic('TravelAgency', agency, 'travel');
    for (const driver of originDrivers) await sendMagic('OriginDriver', driver, 'origin');
    for (const driver of destDrivers) await sendMagic('DestinationDriver', driver, 'destination');

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});