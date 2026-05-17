import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const [travelAgencies, taxiServices] = await Promise.all([
    base44.asServiceRole.entities.TravelAgency.filter({ status: 'active' }),
    base44.asServiceRole.entities.TaxiService.filter({ status: 'active' }),
  ]);

  const results = { travel: [], taxi: [], errors: [] };

  // Send to active travel agencies
  for (const agency of travelAgencies) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Dental & Aesthetics',
        to: agency.email,
        subject: '✈️ Partner Notification — Flight & Hotel Package Coordination',
        body: `Hello ${agency.agency_name},

This is a test notification from the Morales Dental & Aesthetics Portal Hub.

We are confirming your partnership for coordinating flight and hotel packages for our medical tourism clients.

As an active travel partner, you will receive notifications when a new patient consultation is approved and requires:
• ✈️ Flight arrangements (economy, business, or first class)
• 🏨 Hotel accommodations during their medical stay
• 🧳 Full travel itinerary coordination

Please ensure your availability and pricing packages are up to date in our system.

For any questions, contact our concierge team directly.

Warm regards,
The Morales Dental & Aesthetics Concierge Team
      `,
      });
      results.travel.push({ name: agency.agency_name, email: agency.email, sent: true });
    } catch (error) {
      results.errors.push({ name: agency.agency_name, email: agency.email, error: error.message });
    }
  }

  // Send to active taxi services
  for (const taxi of taxiServices) {
    const name = taxi.company_name || taxi.driver_name;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales Dental & Aesthetics',
        to: taxi.email,
        subject: '🚗 Partner Notification — Client Airport & Clinic Transfers',
        body: `Hello ${name},

This is a test notification from the Morales Dental & Aesthetics Portal Hub.

We are confirming your partnership for client transportation and transfer services.

As an active transfer partner, you will receive pickup requests when a new patient arrives, including:
• 🛬 Airport pickup upon arrival
• 🏥 Airport → Clinic transfer
• 🏨 Clinic → Hotel / recovery accommodation transport
• 🛫 Return trip to airport at end of stay

Please ensure your availability and vehicle details are current in our system.

For any questions, contact our concierge team directly.

Warm regards,
The Morales Dental & Aesthetics Concierge Team
      `,
      });
      results.taxi.push({ name, email: taxi.email, sent: true });
    } catch (error) {
      results.errors.push({ name, email: taxi.email, error: error.message });
    }
  }

  return Response.json({
    status: 'done',
    travel_agencies_notified: results.travel.length,
    taxi_services_notified: results.taxi.length,
    details: results,
  });
});