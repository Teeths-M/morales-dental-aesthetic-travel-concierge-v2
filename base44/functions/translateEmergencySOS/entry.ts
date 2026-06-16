import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, destination_country, patient_name, emergency_type } = await req.json();
    if (!message || !destination_country) {
      return Response.json({ error: 'message and destination_country are required' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `You are an emergency medical translation engine for a medical tourism platform.

TASK: Translate the following emergency SOS message into the PRIMARY LOCAL LANGUAGE used by first responders, hospitals, and emergency services in ${destination_country}.

Patient name: ${patient_name || 'Unknown'}
Emergency type: ${emergency_type || 'Medical Emergency'}
Original message: "${message}"

Return a JSON object with:
1. "translated_message": The full translated emergency message in the local language
2. "local_language": The language name (e.g., "Spanish", "Thai", "Turkish")
3. "emergency_numbers": Array of emergency phone numbers for ${destination_country} (ambulance, police, fire)
4. "phonetic_key_phrases": Array of 3-5 most critical phrases phonetically spelled for English speakers to pronounce
5. "urgency_level": "critical" | "urgent" | "moderate"

Be precise and clinically accurate. Prioritize patient safety above all else.`,
      response_json_schema: {
        type: 'object',
        properties: {
          translated_message: { type: 'string' },
          local_language: { type: 'string' },
          emergency_numbers: { type: 'array', items: { type: 'string' } },
          phonetic_key_phrases: { type: 'array', items: { type: 'string' } },
          urgency_level: { type: 'string' }
        },
        required: ['translated_message', 'local_language', 'emergency_numbers', 'phonetic_key_phrases', 'urgency_level']
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('translateEmergencySOS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});