import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { consultation_id, flight_cost_usd, hotel_cost_usd, flight_itinerary_summary, hotel_selection, taxi_service_id } = body;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // Update consultation with travel quote + status cycle
    await base44.asServiceRole.entities.Consultation.update(consultation_id, {
      flight_cost_usd: Number(flight_cost_usd) || 0,
      hotel_cost_usd: Number(hotel_cost_usd) || 0,
      flight_itinerary_summary: flight_itinerary_summary || '',
      hotel_selection: hotel_selection || '',
      taxi_service_id: taxi_service_id || '',
      status: 'Transfer-Pending',
    });

    // Fetch the updated consultation and taxi service for email
    const consultations = await base44.asServiceRole.entities.Consultation.filter({ id: consultation_id });
    const consultation = consultations[0];

    if (!consultation) {
      return Response.json({ error: 'Consultation not found after update' }, { status: 404 });
    }

    // Generate tokenized portal link for chauffeur
    const payload = { consultation_id, partner_id: taxi_service_id || '', portal_type: 'transfer' };
    const token = btoa(JSON.stringify({ ...payload, expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    const appUrl = Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com';
    const chauffeurPortalUrl = `${appUrl}/portal/transfer?token=${token}`;

    // Fetch taxi service email if ID provided
    let driverEmail = null;
    if (taxi_service_id) {
      const taxiServices = await base44.asServiceRole.entities.TaxiService.filter({ id: taxi_service_id });
      if (taxiServices[0]?.email) {
        driverEmail = taxiServices[0].email;
      }
    }

    // Notify the chauffeur
    if (driverEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: driverEmail,
        subject: `Transfer Request — ${consultation.patient_name} | Morales Medical Travel Safety`,
        body: `
<!doctype html>
<html>
<body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:28px 14px;">
    <tr><td align="center">
      <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dde5df;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0F3A20;padding:24px 32px;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">Morales Medical Travel Safety</div>
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C5A059;margin-top:6px;">TRANSIT LOGISTICS REQUEST</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;color:#0F3A20;">Patient ready for transport coordination</h2>
          <p style="color:#555;font-size:14px;margin:0 0 20px;">A patient travel schedule has been logged. Please provide flat-rate pricing for your assigned regional transit legs.</p>
          <table width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;color:#888;width:40%;">Patient Name</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111;">${consultation.patient_name}</td>
            </tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#888;">Flight Details</td>
              <td style="padding:12px 16px;font-size:14px;color:#111;">${flight_itinerary_summary || 'TBD'}</td>
            </tr>
            <tr style="background:#f9fafb;"><td style="padding:12px 16px;font-size:13px;color:#888;">Hotel</td>
              <td style="padding:12px 16px;font-size:14px;color:#111;">${hotel_selection || 'TBD'}</td>
            </tr>
          </table>
          <a href="${chauffeurPortalUrl}" style="display:inline-block;background:#0F3A20;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:700;">Open Transfer Portal →</a>
          <p style="margin-top:24px;font-size:12px;color:#999;">This link is valid for 7 days. Please do not share it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    }

    // ── Automation Gate: update CaseRecord + check if all 4 quotes are in ──
    // Non-blocking — travel quote saved regardless of whether this call succeeds.
    const travelTotal = (Number(flight_cost_usd) || 0) + (Number(hotel_cost_usd) || 0);
    base44.functions.invoke('submitPartnerQuote', {
      consultation_id,
      partner_type: 'travel',
      amount: travelTotal,
    }).catch(e => console.warn('[sendTravelQuoteEmail] submitPartnerQuote failed:', e.message));

    return Response.json({
      success: true,
      message: 'Travel quote saved. Automation gate notified. Pipeline will advance when all 4 quotes confirmed.',
      chauffeur_portal_url: chauffeurPortalUrl,
    });
  } catch (error) {
    console.error('sendTravelQuoteEmail error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});