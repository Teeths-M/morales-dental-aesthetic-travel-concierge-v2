import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId } = await req.json();
    if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

    // BUG-R7-01 FIX: use asServiceRole — patient CaseRecords and TravelAgency records are not
    // owned by the admin user; user-scoped entities returns 404/empty for cross-user data.
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    if (caseRecord.doctor_confirmation_status !== 'CONFIRMED') {
      return Response.json({
        error: 'Doctor has not confirmed yet',
        doctor_status: caseRecord.doctor_confirmation_status
      }, { status: 400 });
    }

    const travelAgencies = await base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' });

    if (travelAgencies.length === 0) {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'No travel agencies available for booking'
      });
      return Response.json({ status: 'NO_TRAVEL_AGENCIES', message: 'No travel agencies available. Admin review required.' });
    }

    // Prefer agencies that service the case destination country
    const destinationCountry = caseRecord?.procedure_country || caseRecord?.destination_country || null;

    let selectedAgency = travelAgencies[0]; // default: first active
    if (destinationCountry) {
      const matchedAgency = travelAgencies.find(a =>
        Array.isArray(a.service_regions) && a.service_regions.includes(destinationCountry)
      );
      if (matchedAgency) {
        selectedAgency = matchedAgency;
        console.log(`[assignTravelAgency] Matched agency ${selectedAgency.id} for destination ${destinationCountry}`);
      } else {
        console.warn(`[assignTravelAgency] No agency found for ${destinationCountry} — using default`);
      }
    }

    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const portalToken = `travel_${caseId}_${hex}`;

    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      travel_vendor_id: selectedAgency.id,
      status: 'Vendor-Pending'
    });

    // BUG-R14-05 FIX: portal URL uses /portal/travel/:token (path param) but the actual
    // travel portal route is /portal/travel?token=... (query param). The link in the email
    // was always a dead 404. Corrected to query string format.
    const portalUrl = `${(Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '')}/portal/travel?token=${portalToken}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: selectedAgency.email,
      subject: `Travel Coordination Request - ${caseRecord.client_name}`,
      body: `
        <h2>Travel Coordination Request</h2>
        <p>Dear ${selectedAgency.agency_name || 'Travel Partner'},</p>
        <p>You have a new travel coordination request:</p>
        <ul>
          <li><strong>Patient:</strong> ${caseRecord.client_name}</li>
          <li><strong>From:</strong> ${caseRecord.client_country}</li>
          <li><strong>To:</strong> ${caseRecord.procedure_country}</li>
          <li><strong>Procedure Date:</strong> TBD (based on doctor availability)</li>
          <li><strong>Recovery Days:</strong> ${caseRecord.recovery_days || 'TBD'}</li>
        </ul>
        <p>Please provide quotes for:</p>
        <ul>
          <li>Round-trip flights</li>
          <li>Hotel accommodation (procedure + recovery period)</li>
          <li>Airport transfers</li>
        </ul>
        <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background-color:#059669;color:white;text-decoration:none;border-radius:6px;margin:16px 0;">Submit Travel Quote</a>
        <p>Please respond within 24 hours.</p>
        <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
      `
    });

    return Response.json({
      status: 'TRAVEL_ASSIGNED',
      agency_email: selectedAgency.email,
      agency_name: selectedAgency.agency_name,
      portal_url: portalUrl,
      message: 'Travel agency assigned and notified successfully'
    });

  } catch (error) {
    console.error('[assignTravelAgency]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});