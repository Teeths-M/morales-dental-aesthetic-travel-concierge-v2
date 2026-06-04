import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultation_id, patient_name, revision_count, flight_cost_usd, hotel_cost_usd } = await req.json();

    const total = (flight_cost_usd || 0) + (hotel_cost_usd || 0);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@moralesdentalandaesthetics.com',
      subject: `✏️ Travel Quote Revised — ${patient_name}`,
      body: `
        <p>A travel quote has been <strong>revised</strong> by the travel agency.</p>
        <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px">
          <tr><td style="padding:8px;color:#555">Patient</td><td style="padding:8px;font-weight:700">${patient_name}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Consultation ID</td><td style="padding:8px">${consultation_id}</td></tr>
          <tr><td style="padding:8px;color:#555">Revision #</td><td style="padding:8px;font-weight:700;color:#C5A059">${revision_count}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Flight Cost</td><td style="padding:8px">$${(flight_cost_usd || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px;color:#555">Hotel Cost</td><td style="padding:8px">$${(hotel_cost_usd || 0).toFixed(2)}</td></tr>
          <tr style="background:#f0fdf4"><td style="padding:8px;color:#166534;font-weight:700">New Total</td><td style="padding:8px;font-weight:700;color:#0F3A20;font-size:16px">$${total.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#888">Please review the updated quote in the admin dashboard.</p>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});