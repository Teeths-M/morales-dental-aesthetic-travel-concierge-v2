/**
 * getConciergeRecommendations — M-Care's proactive downtime concierge.
 *
 * During recovery downtime near the clinic/hotel, M-Care suggests
 * recovery-friendly restaurants, gentle activities, and cultural
 * experiences tailored to the patient's procedure, recovery stage, and
 * dietary profile. Uses live web context (Gemini) so the places are real and
 * current. Returns curated options the agent surfaces with maps tokens.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let caller: any = null;
    try { caller = await base44.auth.me(); } catch (_) { caller = null; }
    if (!caller) return Response.json({ error: 'Authentication required' }, { status: 401 });

    let body: any = null;
    try { body = await req.json(); } catch (_) { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const { case_id, category = 'mixed' } = body || {};
    if (!case_id) return Response.json({ error: 'case_id is required' }, { status: 400 });

    let caseRecord: any = null;
    try { caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id); } catch (_) { caseRecord = null; }
    if (!caseRecord) return Response.json({ error: 'Case not found' }, { status: 404 });

    // Resolve the location we search around — prefer clinic, then hotel, then destination city.
    const locationLabel =
      caseRecord.clinic_address ||
      caseRecord.hotel_address ||
      [caseRecord.hotel_name, caseRecord.procedure_country].filter(Boolean).join(', ') ||
      caseRecord.procedure_country ||
      'the destination';

    const coords =
      caseRecord.clinic_coords?.lat && caseRecord.clinic_coords?.lng
        ? `${caseRecord.clinic_coords.lat},${caseRecord.clinic_coords.lng}`
        : caseRecord.hotel_coords?.lat && caseRecord.hotel_coords?.lng
          ? `${caseRecord.hotel_coords.lat},${caseRecord.hotel_coords.lng}`
          : null;

    // Dietary + procedure context (optional consultation join).
    let dietary = 'no special dietary requirement stated';
    if (caseRecord.consultation_id) {
      try {
        const c = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id);
        const parts = [
          c?.dietary_restrictions && c.dietary_restrictions !== 'none' ? `diet: ${c.dietary_restrictions}` : null,
          c?.has_food_allergies ? `food allergies: ${c.food_allergies_details || 'yes (unspecified)'}` : null,
          c?.has_medication_allergies ? `medication allergies: ${c.medication_allergies_details || 'yes'}` : null,
        ].filter(Boolean);
        if (parts.length) dietary = parts.join('; ');
      } catch (_) {}
    }
    const procedure = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.join(', ') : (caseRecord.procedures || 'a medical procedure');

    const catLabel =
      category === 'restaurant' ? 'restaurants'
      : category === 'activity' ? 'gentle activities suitable for a recovering patient'
      : category === 'experience' ? 'low-effort cultural experiences'
      : 'a mix of recovery-friendly restaurants, gentle activities, and low-effort cultural experiences';

    const prompt = `A medical-travel patient is in the ${locationLabel} area${coords ? ` (approx ${coords})` : ''}, recovering from: ${procedure}. Dietary context: ${dietary}.

Suggest ${catLabel} near this location. Each suggestion must be a real, named place (not a generic category) and safe for someone recovering from ${procedure} — consider mobility, post-anesthesia limits, infection risk, and dietary needs.

Return JSON only: { "recommendations": [ { "name": string, "address": string, "category": "restaurant"|"activity"|"experience", "why_recovery_friendly": string, "practical_note": string } ] }. Provide 5 to 7 suggestions.`;

    let recommendations: any[] = [];
    try {
      const llmRes: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  category: { type: 'string', enum: ['restaurant', 'activity', 'experience'] },
                  why_recovery_friendly: { type: 'string' },
                  practical_note: { type: 'string' },
                },
                required: ['name', 'address', 'category'],
              },
            },
          },
          required: ['recommendations'],
        },
      });
      recommendations = (llmRes && Array.isArray(llmRes.recommendations)) ? llmRes.recommendations : [];
    } catch (e) {
      return Response.json({ error: 'Recommendation service unavailable right now', detail: String(e) }, { status: 503 });
    }

    return Response.json({
      success: true,
      case_id,
      location_used: locationLabel,
      coords_used: coords,
      procedure,
      dietary,
      recommendations,
    });
  } catch (error) {
    console.error('[getConciergeRecommendations]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});