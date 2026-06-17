import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passport_id, destination_country } = await req.json();

    if (!passport_id || !destination_country) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get passport details to extract nationality
    const passport = await base44.entities.PassportVault.get(passport_id);
    
    if (!passport || passport.user_id !== user.id) {
      return Response.json({ error: 'Passport not found' }, { status: 404 });
    }

    const nationality = passport.redacted_for_display?.nationality || 'Unknown';

    // Use AI to check visa requirements
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a travel visa expert. Check visa requirements for a traveler with ${nationality} passport visiting ${destination_country}.
      
      Provide accurate, up-to-date visa information including:
      - Whether a visa is required (yes/no/visa-on-arrival/eTA)
      - Maximum allowed stay duration
      - Key requirements (passport validity, return ticket, etc.)
      - Processing time if visa needed
      - Any special notes or warnings
      
      Format the response as JSON with this structure:
      {
        "visa_required": "yes" | "no" | "visa_on_arrival" | "eta_required",
        "summary": "Brief 1-sentence summary",
        "details": {
          "allowed_stay": "e.g. 90 days",
          "requirements": "Key requirements",
          "processing_time": "e.g. 5-10 business days",
          "embassy_link": "Official embassy/visa website URL if available"
        }
      }`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          visa_required: { type: "string" },
          summary: { type: "string" },
          details: {
            type: "object",
            properties: {
              allowed_stay: { type: "string" },
              requirements: { type: "string" },
              processing_time: { type: "string" },
              embassy_link: { type: "string" }
            }
          }
        },
        required: ["visa_required", "summary"]
      }
    });

    return Response.json(aiResponse);
  } catch (error) {
    console.error('[checkVisaRequirements] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});