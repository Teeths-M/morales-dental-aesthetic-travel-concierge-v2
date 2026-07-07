import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultation_id, patient_name, revision_count, flight_cost_usd, hotel_cost_usd } = await req.json();

    const total = (flight_cost_usd || 0) + (hotel_cost_usd || 0);

    // BUG-R11-03 FIX: hardcoded admin email — use ADMIN_EMAIL env var
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (!adminEmail) {
      console.error('[notifyAdminQuoteRevised] ADMIN_EMAIL not set — notification skipped');
      return Response.json({ success: false, reason: 'ADMIN_EMAIL not configured' });
    }
    const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `✏️ Travel Quote Revised — ${patient_name}`,
      body: renderEmail({
        appUrl,
        eyebrow: 'Quote Revised',
        title: 'A travel quote has been revised',
        intro: 'A travel agency has revised their submitted quote for this case.',
        rows: [
          ['Patient', patient_name],
          ['Consultation ID', consultation_id],
          ['Revision #', revision_count],
          ['Flight Cost', `$${(flight_cost_usd || 0).toFixed(2)}`],
          ['Hotel Cost', `$${(hotel_cost_usd || 0).toFixed(2)}`],
          ['New Total', `$${total.toFixed(2)}`],
        ],
        note: 'Please review the updated quote in the admin dashboard.',
      }),
    });

    return Response.json({ success: true });
  } catch (error) {
    // BUG-R11-02 FIX: SEC-10
    console.error('[notifyAdminQuoteRevised]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});