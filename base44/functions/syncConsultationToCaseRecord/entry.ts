import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data.consultation_id) {
      return Response.json({ success: true, message: 'No consultation linked' });
    }

    const consultation = await base44.asServiceRole.entities.Consultation.get(data.consultation_id);
    if (!consultation) {
      return Response.json({ success: true, message: 'Consultation not found' });
    }

    // Prepare updates from consultation data
    const updates = {};
    if (!data.procedure_country && consultation.procedure_country) {
      updates.procedure_country = consultation.procedure_country;
    }
    if (!data.client_country && consultation.client_country) {
      updates.client_country = consultation.client_country;
    }

    // Update case if there's data to sync
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.CaseRecord.update(data.id, updates);
    }

    return Response.json({ success: true, synced_fields: Object.keys(updates) });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});