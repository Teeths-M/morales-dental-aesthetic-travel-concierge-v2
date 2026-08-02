/**
 * extractClinicalNote
 *
 * Calls Claude Haiku via the Anthropic API to extract structured clinical data
 * from a pasted clinical note. Returns JSON with diagnosis, procedures,
 * medications, dates, allergies, vital signs, and a 1-sentence summary.
 *
 * Auth: requireAuth: false — accessed from token-gated doctor portal.
 * Env vars required: ANTHROPIC_API_KEY
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ body }) => {
  const { note_text } = await body();

  if (!note_text || typeof note_text !== 'string' || note_text.trim().length < 10) {
    return err('note_text is required (minimum 10 characters)');
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) {
    return err('LLM API key not configured. Set ANTHROPIC_API_KEY in environment variables.');
  }

  const truncated = note_text.trim().slice(0, 8000);

  const prompt = `You are a clinical note extraction system for a medical tourism concierge platform.

Extract structured medical data from the clinical note below and return a single JSON object with exactly these fields:
- "chief_complaint": string — the main reason for visit/consultation (empty string if not found)
- "diagnosis": array of strings — diagnosed or suspected conditions
- "procedures": array of strings — planned or completed procedures and surgeries
- "medications": array of {"name": string, "dosage": string, "frequency": string} — medications mentioned
- "dates": array of {"type": string, "date": string} — appointment, surgery, follow_up, prescription, admission, discharge dates
- "allergies": array of strings — known drug or material allergies
- "vital_signs": array of {"type": string, "value": string} — BP, HR, temperature, weight, BMI, SpO2, etc.
- "summary": string — 1-2 sentence plain-English summary of the clinical note

Rules:
- Return ONLY valid JSON. No markdown fences, no prose, no explanation.
- If a field has no data, return an empty array or empty string.
- Keep values concise and clinically accurate.
- Do not invent data that is not present in the note.

Clinical Note:
${truncated}`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (_) {
    return err('Could not reach Anthropic API. Check network connectivity.');
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.error('[extractClinicalNote] Anthropic HTTP error:', response.status, errText);
    return err('LLM extraction failed. Please try again.');
  }

  const llmResult = await response.json();
  const rawContent: string = llmResult?.content?.[0]?.text || '';

  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(rawContent);
  } catch (_) {
    // Graceful fallback: try to pull a JSON object out of any surrounding text
    const match = rawContent.match(/\{[\s\S]*\}/);
    if (match) {
      try { extracted = JSON.parse(match[0]); }
      catch (_) { return err('Failed to parse AI response as JSON. Try a cleaner note format.'); }
    } else {
      return err('Failed to parse AI response as JSON. Try a cleaner note format.');
    }
  }

  // Normalize — guard against model returning wrong types
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];

  const asMedications = (v: unknown) =>
    Array.isArray(v)
      ? v.map((m: any) => ({ name: String(m?.name || ''), dosage: String(m?.dosage || ''), frequency: String(m?.frequency || '') }))
      : [];

  const asKeyVal = (v: unknown) =>
    Array.isArray(v)
      ? v.map((d: any) => ({ type: String(d?.type || ''), value: String(d?.value || d?.date || '') }))
      : [];

  const asDates = (v: unknown) =>
    Array.isArray(v)
      ? v.map((d: any) => ({ type: String(d?.type || ''), date: String(d?.date || '') }))
      : [];

  return ok({
    chief_complaint: typeof extracted.chief_complaint === 'string' ? extracted.chief_complaint : '',
    diagnosis:       asArray(extracted.diagnosis),
    procedures:      asArray(extracted.procedures),
    medications:     asMedications(extracted.medications),
    dates:           asDates(extracted.dates),
    allergies:       asArray(extracted.allergies),
    vital_signs:     asKeyVal(extracted.vital_signs),
    summary:         typeof extracted.summary === 'string' ? extracted.summary : '',
    extracted_at:    new Date().toISOString(),
    model:           'claude-haiku-4-5-20251001',
  });

// SECURITY: this calls the real Anthropic API with zero cap beyond
// createHandler's generic 60/min default — a script could run up real
// AI-credit spend fast. Doctor-portal callers legitimately need no session
// (token-gated page), so this stays public but with a much tighter budget:
// nobody pastes 8 clinical notes in 5 minutes for real.
}, { name: 'extractClinicalNote', requireAuth: false, rateLimit: { max: 8, windowSeconds: 300 } }));
