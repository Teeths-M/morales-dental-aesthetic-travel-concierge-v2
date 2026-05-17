import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { workflow_id, quoted_price, notes } = await req.json();

    if (!workflow_id) {
      return Response.json({ error: 'workflow_id is required' }, { status: 400 });
    }

    const workflow = await base44.asServiceRole.entities.WorkflowEvent.get(workflow_id);
    if (!workflow) {
      return Response.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Fetch all active partners
    const partners = await base44.asServiceRole.entities.Partner.filter({ is_active: true });

    const results = { travel: [], hotel: [], cab: [], patient: null };

    // Notify travel partners
    const travelPartners = partners.filter(p => p.type === 'travel');
    for (const partner of travelPartners) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: partner.email,
          subject: `✅ Doctor Confirmed — Travel Booking Needed for ${workflow.patient_name}`,
          body: `Hello ${partner.name || partner.contact_person || ''},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nDoctor's quoted price: $${quoted_price || 'TBD'}\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\nPlease arrange flights and travel itinerary and reply with your quote as soon as possible.\n\n— Morales Dental & Aesthetics Concierge Team`,
        });
        results.travel.push({ email: partner.email, status: 'sent' });
      } catch (e) {
        results.travel.push({ email: partner.email, status: 'failed', error: e.message });
      }
    }

    // Notify hotel partners
    const hotelPartners = partners.filter(p => p.type === 'hotel');
    for (const partner of hotelPartners) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: partner.email,
          subject: `✅ Doctor Confirmed — Recovery Hotel Needed for ${workflow.patient_name}`,
          body: `Hello ${partner.name || partner.contact_person || ''},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nPlease arrange recovery accommodation and reply with your quote and availability.\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\n— Morales Dental & Aesthetics Concierge Team`,
        });
        results.hotel.push({ email: partner.email, status: 'sent' });
      } catch (e) {
        results.hotel.push({ email: partner.email, status: 'failed', error: e.message });
      }
    }

    // Notify cab partners
    const cabPartners = partners.filter(p => p.type === 'cab');
    for (const partner of cabPartners) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: partner.email,
          subject: `✅ Doctor Confirmed — Transfer Needed for ${workflow.patient_name}`,
          body: `Hello ${partner.name || partner.contact_person || ''},\n\nThe doctor has confirmed the procedure for patient: ${workflow.patient_name}.\n\nPlease prepare airport and clinic transfer availability and reply with your quote.\n${notes ? 'Doctor notes: ' + notes + '\n' : ''}\n— Morales Dental & Aesthetics Concierge Team`,
        });
        results.cab.push({ email: partner.email, status: 'sent' });
      } catch (e) {
        results.cab.push({ email: partner.email, status: 'failed', error: e.message });
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
      travel_status: travelPartners.length > 0 ? 'notified' : 'pending',
      hotel_status: hotelPartners.length > 0 ? 'notified' : 'pending',
      cab_status: cabPartners.length > 0 ? 'notified' : 'pending',
    });

    return Response.json({ status: 'ok', results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});