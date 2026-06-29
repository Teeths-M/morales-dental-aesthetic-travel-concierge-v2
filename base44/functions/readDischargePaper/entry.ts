import { createHandler, ok, err } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { image_base64, image_url, language = 'en' } = await body();

  if (!image_base64 && !image_url) {
    return err('image_base64 or image_url is required');
  }

  const langNames = {
    en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German',
  };
  const langName = langNames[language] || 'English';

  const imageContent = image_base64
    ? { type: 'base64', data: image_base64 }
    : { type: 'url', url: image_url };

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: 'gpt_4o',
    prompt: `You are M — the world's most caring medical travel concierge. A patient has just been discharged after their procedure abroad and photographed their discharge papers.

Your job: Read EVERYTHING on this document and translate it into the simplest, warmest possible language in ${langName}. The patient may be in pain, tired, and in a foreign country. Every word must be crystal clear.

Extract and return ONLY valid JSON in this exact format:

{
  "summary": "One warm sentence summarizing what this document is about",
  "restrictions": [
    { "category": "Travel", "instruction": "plain English instruction", "duration": "e.g. 14 days", "urgency": "critical|important|advisory" },
    { "category": "Diet", "instruction": "...", "duration": "...", "urgency": "..." },
    { "category": "Medication", "instruction": "...", "duration": "...", "urgency": "..." },
    { "category": "Activity", "instruction": "...", "duration": "...", "urgency": "..." },
    { "category": "Wound Care", "instruction": "...", "duration": "...", "urgency": "..." }
  ],
  "reminders": [
    { "title": "Short reminder title", "description": "What to do", "when": "e.g. Every 8 hours", "days_from_now": 0 }
  ],
  "red_flags": ["Symptom or sign that means CALL A DOCTOR NOW — in plain language"],
  "follow_up": { "when": "e.g. 7 days", "with": "e.g. Your surgeon", "notes": "..." },
  "medications": [
    { "name": "Drug name", "dose": "e.g. 500mg", "frequency": "e.g. Every 8 hours", "duration": "e.g. 7 days", "with_food": true }
  ],
  "doctor_name": "Doctor name if visible",
  "clinic_name": "Clinic name if visible",
  "discharge_date": "ISO date if visible",
  "language_detected": "The language of the original document"
}

Rules:
- NEVER use medical jargon without immediately explaining it in brackets
- If something is CRITICAL (no flying, no alcohol with medication), mark it urgency: "critical"
- If you cannot read something clearly, say "Ask your doctor to clarify this"
- Always include red_flags — signs the patient must seek emergency care immediately
- restrictions and reminders arrays may be empty [] if nothing found, but never null
- Return ONLY the JSON, no markdown, no explanation`,
    image: imageContent,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        restrictions: { type: 'array' },
        reminders: { type: 'array' },
        red_flags: { type: 'array', items: { type: 'string' } },
        follow_up: { type: 'object' },
        medications: { type: 'array' },
        doctor_name: { type: 'string' },
        clinic_name: { type: 'string' },
        discharge_date: { type: 'string' },
        language_detected: { type: 'string' },
      },
    },
  });

  // Persist for audit trail (non-blocking)
  base44.asServiceRole.entities.AuditLog?.create?.({
    user_id: user?.id,
    event_type: 'discharge_paper_read',
    metadata: { language, has_restrictions: (result?.restrictions?.length ?? 0) > 0 },
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return ok({
    success: true,
    parsed: result,
    language,
  });
}, { name: 'readDischargePaper', requireAuth: true }));
