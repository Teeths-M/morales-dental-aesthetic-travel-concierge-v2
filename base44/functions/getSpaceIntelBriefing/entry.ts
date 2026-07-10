import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { destination_country, destination_city, force_refresh } = await body();
    if (!destination_country) return Response.json({ error: 'destination_country required' }, { status: 400 });

    // Check for recent cached briefing (< 6 hours old)
    if (!force_refresh) {
      const existing = await base44.asServiceRole.entities.SpaceIntelBriefing.filter({ destination_country, patient_email: user.email });
      if (existing.length > 0) {
        const latest = existing[existing.length - 1];
        const ageMs = Date.now() - new Date(latest.generated_at).getTime();
        if (ageMs < 6 * 60 * 60 * 1000) return Response.json({ briefing: latest, cached: true });
      }
    }

    const location = destination_city ? `${destination_city}, ${destination_country}` : destination_country;

    const prompt = `You are a professional travel intelligence analyst for a medical tourism platform. Generate a real-time safety and intelligence briefing for a medical tourist traveling to: ${location}.

Include:
1. Current geopolitical risk level (low/moderate/elevated/high/critical) with 1-sentence justification
2. Crime risk level (same scale) with specific tourist crime patterns
3. Health alerts (vaccinations, water safety, current disease outbreaks) — list up to 4 items
4. Known tourist scams in this region — list up to 4 specific scams with how to avoid them
5. Emergency phone numbers: police, ambulance, fire, tourist_police, embassy_emergency (use real numbers if known)
6. Top 3 safe zones (neighborhoods/areas tourists should stay in)
7. Top 3 areas to avoid with brief reason
8. 2-sentence overall safety briefing summary

Return as JSON matching this exact schema:
{
  "geopolitical_risk": "low|moderate|elevated|high|critical",
  "crime_risk": "low|moderate|elevated|high|critical",
  "health_alerts": ["alert1", "alert2"],
  "scam_warnings": ["scam1 — how to avoid", "scam2 — how to avoid"],
  "emergency_numbers": {"police": "xxx", "ambulance": "xxx", "fire": "xxx", "tourist_police": "xxx", "embassy_emergency": "xxx"},
  "safe_zones": ["zone1", "zone2", "zone3"],
  "avoid_areas": ["area1 — reason", "area2 — reason", "area3 — reason"],
  "briefing_summary": "two sentence summary"
}`;

    let aiResult = null;
    try {
    aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          geopolitical_risk: { type: 'string' },
          crime_risk: { type: 'string' },
          health_alerts: { type: 'array', items: { type: 'string' } },
          scam_warnings: { type: 'array', items: { type: 'string' } },
          emergency_numbers: { type: 'object' },
          safe_zones: { type: 'array', items: { type: 'string' } },
          avoid_areas: { type: 'array', items: { type: 'string' } },
          briefing_summary: { type: 'string' }
        }
      }
    });
    } catch (_) {}

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const briefing = await base44.asServiceRole.entities.SpaceIntelBriefing.create({
      patient_email: user.email,
      destination_country,
      destination_city: destination_city || '',
      generated_at: now,
      briefing_expires_at: expiresAt,
      geopolitical_risk: aiResult?.geopolitical_risk || 'moderate',
      crime_risk: aiResult?.crime_risk || 'moderate',
      health_alerts: aiResult?.health_alerts || [],
      scam_warnings: aiResult?.scam_warnings || [],
      emergency_numbers: aiResult?.emergency_numbers || {},
      safe_zones: aiResult?.safe_zones || [],
      avoid_areas: aiResult?.avoid_areas || [],
      briefing_summary: aiResult?.briefing_summary || 'Briefing data temporarily unavailable — standard precautions apply.'
    });

    return Response.json({ briefing, cached: false, ai_available: !!aiResult });
}, { name: 'getSpaceIntelBriefing' }));
