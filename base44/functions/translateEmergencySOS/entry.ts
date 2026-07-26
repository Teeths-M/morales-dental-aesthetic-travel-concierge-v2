import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

Deno.serve(async (req) => {
  // FIX: was `const { message, ... } = await req.json();` declared INSIDE the
  // try block — try{} and catch{} are separate block scopes, so the catch
  // block's `translated_message: message` referenced a name that didn't
  // exist there, throwing "message is not defined" instead of returning the
  // intended graceful fallback (pre-existing bug, found via a standalone
  // tsc check while touching this file for the sanitize fix below).
  let message: unknown;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const parsedBody = await req.json();
    message = parsedBody.message;
    const { destination_country, patient_name, emergency_type } = parsedBody;
    if (!message || !destination_country) {
      return Response.json({ error: 'message and destination_country are required' }, { status: 400 });
    }

    // SEC-11: sanitize free text before LLM interpolation — prevents prompt
    // injection from steering the emergency translation. Never blocks the
    // SOS: a flagged input is stripped and the translation still proceeds
    // (mirrors triggerSOS SEC-09 — a translation has no "decision" to fail
    // closed on, unlike a SAFE-T risk level).
    const safeMessage = sanitizePromptInput(message, 1500).text;
    const safeDestinationCountry = sanitizePromptInput(destination_country, 100).text;
    const safePatientName = sanitizePromptInput(patient_name, 200).text;
    const safeEmergencyType = sanitizePromptInput(emergency_type, 100).text;

    let result = null;
    try {
      result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gpt_5_mini',
        prompt: `You are an emergency medical translation engine for a medical tourism platform.

TASK: Translate the following emergency SOS message into the PRIMARY LOCAL LANGUAGE used by first responders, hospitals, and emergency services in ${safeDestinationCountry}.

Patient name: ${safePatientName || 'Unknown'}
Emergency type: ${safeEmergencyType || 'Medical Emergency'}
Original message: "${safeMessage}"

Return a JSON object with:
1. "translated_message": The full translated emergency message in the local language
2. "local_language": The language name (e.g., "Spanish", "Thai", "Turkish")
3. "emergency_numbers": Array of emergency phone numbers for ${safeDestinationCountry} (ambulance, police, fire)
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
    } catch (_) {}

    // Always return something safe — never crash an SOS function
    return Response.json({
      success: true,
      translated_message: result?.translated_message || message,
      local_language: result?.local_language || 'English (translation unavailable)',
      emergency_numbers: result?.emergency_numbers || [],
      phonetic_key_phrases: result?.phonetic_key_phrases || [],
      urgency_level: result?.urgency_level || 'critical',
      is_fallback: !result,
    });
  } catch (error) {
    console.error('translateEmergencySOS error');
    // SEC-10: never expose error.message — return safe fallback for SOS
    return Response.json({
      success: true,
      translated_message: message,
      local_language: 'English (translation unavailable)',
      emergency_numbers: [],
      phonetic_key_phrases: [],
      urgency_level: 'critical',
      is_fallback: true,
    });
  }
});