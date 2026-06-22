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

    // BUG-R7-01 FIX: use asServiceRole throughout — patient CaseRecords and TaxiService
    // records are not owned by the admin user; user-scoped entities returns 404/empty.
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    const [originDrivers, destDrivers] = await Promise.all([
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.client_country, status: 'active' }),
      base44.asServiceRole.entities.TaxiService.filter({ operating_country: caseRecord.procedure_country, status: 'active' }),
    ]);

    if (originDrivers.length === 0 || destDrivers.length === 0) {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        status: 'Admin-Review',
        admin_notes: 'Chauffeur service unavailable in origin or destination'
      });
      return Response.json({ status: 'NO_DRIVERS', message: 'Chauffeur services not available. Admin review required.' });
    }

    const originDriver = originDrivers[0];
    const destDriver = destDrivers[0];

    // Use cryptographically secure tokens (not Math.random)
    const makeToken = (label) => {
      const b = new Uint8Array(20);
      crypto.getRandomValues(b);
      return `driver_${label}_${caseId}_${Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')}`;
    };
    const originToken = makeToken('origin');
    const destToken = makeToken('dest');

    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      origin_driver_id: originDriver.id,
      destination_driver_id: destDriver.id,
      transfer_status: 'SUBMITTED'
    });

    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    const originPortalUrl = `${appUrl}/portal/transfer/${originToken}`;
    const destPortalUrl = `${appUrl}/portal/transfer/${destToken}`;

    await Promise.allSettled([
      base44.asServiceRole.integrations.Core.SendEmail({
        to: originDriver.email,
        subject: `Pickup Service Request - ${caseRecord.client_name}`,
        body: `
          <h2>Chauffeur Service Request - Origin</h2>
          <p>Dear ${originDriver.driver_name || originDriver.company_name || 'Driver'},</p>
          <p>You have a new pickup service request:</p>
          <ul>
            <li><strong>Passenger:</strong> ${caseRecord.client_name}</li>
            <li><strong>Pickup Location:</strong> ${caseRecord.client_country} (Home to Airport)</li>
            <li><strong>Service:</strong> Medical travel pickup</li>
          </ul>
          <p>Please provide your quote for Home to Airport (departure) and Airport to Home (return).</p>
          <a href="${originPortalUrl}" style="display:inline-block;padding:12px 24px;background-color:#059669;color:white;text-decoration:none;border-radius:6px;margin:16px 0;">Submit Quote</a>
          <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
        `
      }),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: destDriver.email,
        subject: `Transfer Service Request - ${caseRecord.client_name}`,
        body: `
          <h2>Chauffeur Service Request - Destination</h2>
          <p>Dear ${destDriver.driver_name || destDriver.company_name || 'Driver'},</p>
          <p>You have a new transfer service request:</p>
          <ul>
            <li><strong>Passenger:</strong> ${caseRecord.client_name}</li>
            <li><strong>Location:</strong> ${caseRecord.procedure_country}</li>
            <li><strong>Services Needed:</strong> Airport→Hotel, Hotel→Clinic, Clinic→Hotel, Hotel→Airport</li>
          </ul>
          <a href="${destPortalUrl}" style="display:inline-block;padding:12px 24px;background-color:#059669;color:white;text-decoration:none;border-radius:6px;margin:16px 0;">Submit Quote</a>
          <p>Best regards,<br/>IQ200 Medical Travel Coordination</p>
        `
      }),
    ]);

    return Response.json({
      status: 'DRIVERS_ASSIGNED',
      origin_driver: originDriver.email,
      destination_driver: destDriver.email,
      message: 'Chauffeur services assigned and notified successfully'
    });

  } catch (error) {
    console.error('[assignChauffeurServices]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});