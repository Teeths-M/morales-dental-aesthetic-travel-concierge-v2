import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      // Try TaxiService first, then TravelAgency
      try {
        partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
        console.log('TaxiService result:', partner);
      } catch (e) {
        // If not found in TaxiService, try TravelAgency
        console.log('Not a TaxiService, trying TravelAgency...');
        try {
          partner = await base44.asServiceRole.entities.TravelAgency.get(partner_id);
          console.log('TravelAgency result:', partner);
        } catch (e2) {
          console.log('Partner not found in either entity');
          partner = null;
        }
      }
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