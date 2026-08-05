import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── parseBookingIntent ───────────────────────────────────────────────────────
// Powers the "type/say what you want in one sentence" entry point (M-Care
// super-agent Phase 2A). Takes ONE free-text query and extracts ONLY a
// small, fixed set of NON-safety fields — procedure interest and, if
// mentioned, a destination country — so a patient can skip straight past
// the logistics questions /intake would otherwise ask one at a time.
//
// This function's output shape is HARDCODED below, not caller-supplied like
// intakeConversationTurn's `target_fields`. That's deliberate defense in
// depth: unlike intakeConversationTurn (whose callers are trusted, existing
// intake/signup graphs passing their own step's field list), this is a new,
// more exposed entry point, so it must be structurally impossible for it to
// ever "extract" a clinical fact no matter what a caller asks for. Every
// field it can ever return is cross-checked against
// src/lib/intakeFlow/derivedFields.js's SAFETY_INPUT_FIELDS in the redteam
// suite (see tests/redteam/invariants.spec.js).
//
// Same two-job discipline as every other free-text-to-LLM path in this
// codebase: sanitize first, extract only, never decide anything. The result
// is a SEED for /intake's existing question graph — flowEngine.getNextStep
// still walks every remaining step in order, including every safety-input
// field, one at a time. This function never touches that.

const BodySchema = strictObject({
  query: Fields.shortText(500),
});

// Mirrors src/lib/intakeFlow/questionGraph.js's PROCEDURE_OPTIONS exactly —
// keep in sync if that list changes. Duplicated rather than imported because
// this is a Deno edge function with no access to the Vite-built src/ tree.
const PROCEDURE_VALUES = [
  'dental_implants', 'all_on_4', 'porcelain_veneers', 'smile_makeover',
  'rhinoplasty', 'breast_surgery', 'liposuction', 'tummy_tuck', 'facelift', 'other',
];

const SYSTEM_PROMPT = `You are helping a medical-tourism patient skip straight to the point. They typed or said one sentence describing what they want. Extract ONLY:

- procedure: exactly one of ${JSON.stringify(PROCEDURE_VALUES)}, or null if no procedure is clearly mentioned. Never invent a value outside this list.
- destination_country: a country name if one is clearly mentioned, or null.

You are NEVER extracting age, medical history, medications, allergies, or any other clinical/personal fact — even if the sentence happens to mention one, ignore it. Those are asked separately, on purpose, one at a time, by a human-reviewed process. Your only job is procedure + destination.

Return ONLY valid JSON, no markdown fences: {"procedure": "<value or null>", "destination_country": "<value or null>"}`;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { query } = await body<{ query?: string }>();
  if (!query) return err('query is required');

  const safeQuery = sanitizePromptInput(query, 500).text;

  let extracted: { procedure: string | null; destination_country: string | null } = {
    procedure: null,
    destination_country: null,
  };

  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${SYSTEM_PROMPT}\n\nPatient's sentence: ${safeQuery}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          procedure: { type: ['string', 'null'] },
          destination_country: { type: ['string', 'null'] },
        },
        required: ['procedure', 'destination_country'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      const result = llmResult as Record<string, unknown>;
      // Hard allowlist check — even a malformed/hallucinated LLM response
      // can never produce a procedure value outside the real enum.
      const procedure = typeof result.procedure === 'string' && PROCEDURE_VALUES.includes(result.procedure)
        ? result.procedure
        : null;
      const destination_country = typeof result.destination_country === 'string' && result.destination_country.trim()
        ? result.destination_country.trim().slice(0, 100)
        : null;
      extracted = { procedure, destination_country };
    }
  } catch (_) {
    // LLM unavailable — return nulls rather than block the entry point.
    // The frontend just falls through to the normal question-by-question flow.
  }

  return ok(extracted);
}, { name: 'parseBookingIntent', requireAuth: false, bodySchema: BodySchema }));
