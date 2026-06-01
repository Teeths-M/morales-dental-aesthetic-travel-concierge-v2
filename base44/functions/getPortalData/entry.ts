import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { consultation_id, partner_id } = body;

    if (!consultation_id) {
      return Response.json({ error: 'consultation_id is required' }, { status: 400 });
    }

    // Fetch as service role to bypass RLS
    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
    
    let partner = null;
    if (partner_id) {
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
    }

    return Response.json({
      consultation,
      partner,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});