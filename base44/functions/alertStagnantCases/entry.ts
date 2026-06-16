import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only guard for direct HTTP calls (automation has no user)
    const callerUser = await base44.auth.me().catch(() => null);
    if (callerUser && callerUser.role !== 'admin' && callerUser.role !== 'platform_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all active cases (exclude Completed status)
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 500);
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const stagnantCases = [];

    for (const caseRecord of allCases) {
      if (caseRecord.status === 'Completed') continue;

      // Check if case hasn't been updated in 48+ hours
      const lastUpdated = new Date(caseRecord.updated_date);
      
      if (lastUpdated < fortyEightHoursAgo) {
        const daysStagnant = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        
        stagnantCases.push({
          case_id: caseRecord.id,
          patient_name: caseRecord.client_name,
          patient_email: caseRecord.client_email,
          current_stage: caseRecord.status,
          days_stagnant: daysStagnant,
          last_updated: caseRecord.updated_date,
          consultation_id: caseRecord.consultation_id,
        });
      }
    }

    if (stagnantCases.length === 0) {
      return Response.json({ message: 'No stagnant cases found' });
    }

    // Send alert email to admin
    const caseListHtml = stagnantCases.map(c => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.patient_name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.current_stage}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${c.days_stagnant} days</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(c.last_updated).toLocaleDateString()}</td>
      </tr>
    `).join('');

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@morales-dental.com';
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `⚠️ Alert: ${stagnantCases.length} Case(s) Stagnant for 48+ Hours`,
      body: `
        <h2>Case Stagnation Alert</h2>
        <p>The following cases have not progressed in over 48 hours and require immediate attention:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Patient</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Current Stage</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Days Stagnant</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${caseListHtml}
          </tbody>
        </table>
        
        <p style="margin-top: 20px;"><strong>Total Cases:</strong> ${stagnantCases.length}</p>
        <p><strong>Generated:</strong> ${now.toISOString()}</p>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated alert from the Morales Dental case management system.
          Please review these cases and take appropriate action to move them forward.
        </p>
      `,
    });

    return Response.json({ 
      success: true,
      stagnant_count: stagnantCases.length,
      cases: stagnantCases
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});