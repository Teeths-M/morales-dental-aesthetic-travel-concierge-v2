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
    console.log('Fetching consultation:', consultation_id);
    const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
    console.log('Consultation result:', consultation);
    
    let partner = null;
    if (partner_id) {
      console.log('Fetching partner:', partner_id);
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
      console.log('Partner result:', partner);
    }

    if (!consultation) {
      return Response.json({ error: 'Consultation not found', consultation_id }, { status: 404 });
    }

    return Response.json({
      consultation,
      partner,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});