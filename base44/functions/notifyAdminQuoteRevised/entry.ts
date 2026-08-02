import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../../shared/emailTemplate.ts';
import { createHandler } from '../../shared/createHandler.ts';
import { verifyPortalToken } from '../../shared/portalToken.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, revision_count } = await req.json();

    // SECURITY: previously trusted caller-supplied consultation_id, patient_name,
    // and cost fields with no proof the caller held the travel agency's portal
    // link — anyone could spam the admin inbox with fabricated "quote revised"
    // alerts (fake patient name, fake numbers) to mislead a real approval
    // decision. Now derives consultation_id from a verified portal token and
    // re-fetches the real, current record for the display fields.
    const verified = await verifyPortalToken(token);
    if (!verified || verified.portal_type !== 'travel') {
      return Response.json({ error: 'Invalid or expired portal token' }, { status: 403 });
    }
    const consultation_id = verified.consultation_id;

    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id).catch(() => null);
    if (!consultation) return Response.json({ error: 'Consultation not found' }, { status: 404 });

    const patient_name    = consultation.patient_name;
    const flight_cost_usd = consultation.flight_cost_usd;
    const hotel_cost_usd  = consultation.hotel_cost_usd;
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
}, { name: 'notifyAdminQuoteRevised', requireAuth: false }));
