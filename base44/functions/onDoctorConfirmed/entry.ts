import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { workflow_id, quoted_price, notes, only_agency_id, doctor_email, doctor_name } = await req.json();

    if (!workflow_id) {
      return Response.json({ error: 'workflow_id is required' }, { status: 400 });
    }

    const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Fetch active partners from all relevant entities
    const [travelAgencies, taxiServices] = await Promise.all([
      base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }),
      base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
    ]);

    const appUrl = Deno.env.get('APP_URL') || 'https://your-portal-url.com';
    const portalLink = `${appUrl}/portal-hub`;

    const results = { travel: [], hotel: [], cab: [], patient: null, doctor: null };

    // Notify doctor with portal link
    if (doctor_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: doctor_email,
          subject: `✅ Procedure Confirmed — Patient ${workflow.patient_name} | Morales Dental & Aesthetics`,
          body: `Dear ${doctor_name || 'Doctor'},\n\nThis is a confirmation that you have been assigned the following procedure:\n\nPatient: ${workflow.patient_name}\nQuoted Price: $${quoted_price || 'TBD'}\n${notes ? 'Your Notes: ' + notes + '\n' : ''}\nYou can view and manage this case from your doctor portal:\n${portalLink}\n\nThank you for being part of our network!\n\n— Morales Dental & Aesthetics Concierge Team`,
        });
        results.doctor = 'sent';
      } catch (e) {
        results.doctor = `failed: ${e.message}`;
      }
    }

    // Notify travel agencies (flights + hotels)
    const filteredAgencies = only_agency_id ? travelAgencies.filter(a => a.id === only_agency_id) : travelAgencies;
    for (const agency of filteredAgencies) {
      const offersFlights = agency.services_offered?.includes('flights');
      const offersHotels = agency.services_offered?.includes('hotels');
      const name = agency.agency_name || agency.email;

      if (offersFlights) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: agency.email,
            subject: `✅ Doctor Confirmed — Travel Booking Needed for ${workflow.patient_name}`,
            body: `Hello ${name},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nDoctor's quoted price: $${quoted_price || 'TBD'}\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\nPlease arrange flights and travel itinerary and reply with your quote as soon as possible.\n\n— Morales Dental & Aesthetics Concierge Team`,
          });
          results.travel.push({ email: agency.email, name, status: 'sent' });
        } catch (e) {
          results.travel.push({ email: agency.email, name, status: 'failed', error: e.message });
        }
      }

      if (offersHotels) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: agency.email,
            subject: `✅ Doctor Confirmed — Recovery Hotel Needed for ${workflow.patient_name}`,
            body: `Hello ${name},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nPlease arrange recovery accommodation and reply with your quote and availability.\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\n— Morales Dental & Aesthetics Concierge Team`,
          });
          results.hotel.push({ email: agency.email, name, status: 'sent' });
        } catch (e) {
          results.hotel.push({ email: agency.email, name, status: 'failed', error: e.message });
        }
      }
    }

    // Notify taxi/cab services
    for (const taxi of taxiServices) {
      const name = taxi.driver_name || taxi.company_name || taxi.email;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: taxi.email,
          subject: `✅ Doctor Confirmed — Transfer Needed for ${workflow.patient_name}`,
          body: `Hello ${name},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nPlease prepare airport and clinic transfer availability and reply with your quote.\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\n— Morales Dental & Aesthetics Concierge Team`,
        });
        results.cab.push({ email: taxi.email, name, status: 'sent' });
      } catch (e) {
        results.cab.push({ email: taxi.email, name, status: 'failed', error: e.message });
      }
    }

    // Notify patient
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: workflow.patient_email,
        subject: '✓ Great News — Your Doctor Has Confirmed! | Morales Dental & Aesthetics',
        body: `Dear ${workflow.patient_name},\n\nWe're thrilled to let you know that your doctor has confirmed your procedure!\n\nOur team is now arranging your travel, accommodation, and local transfers. You'll receive a full package summary within 24–48 hours.\n\nIf you have any questions, don't hesitate to reach out to your concierge.\n\nWarm regards,\nThe Morales Dental & Aesthetics Concierge Team`,
      });
      results.patient = 'sent';
    } catch (e) {
      results.patient = `failed: ${e.message}`;
    }

    // Update workflow stage and partner statuses
    await base44.asServiceRole.entities.WorkflowEvent.update(workflow_id, {
      stage: 'travel',
      travel_status: results.travel.length > 0 ? 'notified' : 'pending',
      hotel_status: results.hotel.length > 0 ? 'notified' : 'pending',
      cab_status: results.cab.length > 0 ? 'notified' : 'pending',
    });

    return Response.json({ status: 'ok', results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});