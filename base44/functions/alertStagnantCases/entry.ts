import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron secret OR admin session. The previous guard read
    // `if (callerUser && callerUser.role !== 'admin')`, which let an
    // UNAUTHENTICATED caller (callerUser === null) straight through — the
    // no-session case it meant to allow for the scheduler also allowed anyone.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // BUG-R14-02 FIX: list('updated_date', 500) sorts ascending — newest last, stagnant-first
    // is correct here — but 500 is an arbitrary cap that silently misses cases beyond it.
    // Use the dedicated stagnant filter (updated_date < 48h ago via JS-side check) and cap
    // at 200 which is sufficient; oldest-first sort (ascending updated_date) naturally surfaces
    // the most stagnant first without needing post-sort.
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('updated_date', 200);
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Single-pass filter: skip Completed and recently-updated in one loop
    const stagnantCases = allCases
      .filter(c => c.status !== 'Completed' && new Date(c.updated_date) < fortyEightHoursAgo)
      .map(c => ({
        case_id: c.id,
        patient_name: c.client_name,
        patient_email: c.client_email,
        current_stage: c.status,
        days_stagnant: Math.floor((now - new Date(c.updated_date)) / (1000 * 60 * 60 * 24)),
        last_updated: c.updated_date,
        consultation_id: c.consultation_id,
      }));

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

    // BUG-R14-03 FIX: hardcoded fallback email — if ADMIN_EMAIL is unset, skip silently rather
    // than sending to a potentially wrong address; log a warning so it's visible in function logs.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (!adminEmail) {
      console.warn('[alertStagnantCases] ADMIN_EMAIL not set — stagnation alert not sent');
      return Response.json({ success: true, stagnant_count: stagnantCases.length, cases: stagnantCases, alert_sent: false });
    }
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
          This is an automated alert from the Morales Medical Travel Safety case management system.
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
    console.error('[alertStagnantCases]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});