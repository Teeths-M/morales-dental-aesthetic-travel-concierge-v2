import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── parseBookingIntent ───────────────────────────────────────────────────────
// Powers the "type/say what you want in one sentence" entry point (M-Care
// super-agent Phase 2A, richer in Phase 4A). Takes ONE free-text query and
// extracts ONLY a small, fixed set of NON-safety fields — up to 3 procedures,
// and if mentioned, a destination country/city and a rough travel-date
// phrase — so a patient can skip straight past the logistics questions
// /intake would otherwise ask one at a time.
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
//
// travel_month/travel_period are deliberately NEVER combined into a
// fabricated exact date. questionGraph.js's `preferred_date` step is a real
// DATE input — silently inventing a specific day from "early November" and
// seeding it would both put words in the patient's mouth and wrongly SKIP
// that question via flowEngine's "already answered" logic. So these two
// fields are display-only (BookingIntentEntry echoes them back in its
// confirm bubble so the patient feels heard), never seeded into any intake
// answer — the real preferred_date question is still always asked normally.
// destination_city is the same: no such field exists in questionGraph.js
// today, so it is echoed back for confirmation only, never seeded.

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

const MAX_PROCEDURES = 3;

const MONTH_VALUES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PERIOD_VALUES = ['early', 'mid', 'late'];

const SYSTEM_PROMPT = `You are helping a medical-tourism patient skip straight to the point. They typed or said one sentence describing what they want. Extract ONLY:

- procedures: an array of up to ${MAX_PROCEDURES} values, each exactly one of ${JSON.stringify(PROCEDURE_VALUES)}. Empty array if none is clearly mentioned. Never invent a value outside this list.
- destination_country: a country name if one is clearly mentioned, or null.
- destination_city: a city name if one is clearly mentioned, or null.
- travel_month: exactly one of ${JSON.stringify(MONTH_VALUES)} if a month is clearly implied, or null. Never guess a month that wasn't implied.
- travel_period: exactly one of ${JSON.stringify(PERIOD_VALUES)} describing which part of that month ("early November" -> "early"), or null if no month was found or no part of the month was implied.

You are NEVER extracting age, medical history, medications, allergies, an exact travel date, or any other clinical/personal fact — even if the sentence happens to mention one, ignore it. Those are asked separately, on purpose, one at a time, by a human-reviewed process. Your only job is procedures + destination + rough timing.

Return ONLY valid JSON, no markdown fences: {"procedures": ["<value>", ...], "destination_country": "<value or null>", "destination_city": "<value or null>", "travel_month": "<value or null>", "travel_period": "<value or null>"}`;

type Extracted = {
  procedures: string[];
  destination_country: string | null;
  destination_city: string | null;
  travel_month: string | null;
  travel_period: string | null;
};

const EMPTY_EXTRACTED: Extracted = {
  procedures: [],
  destination_country: null,
  destination_city: null,
  travel_month: null,
  travel_period: null,
};

Deno.serve(createHandler(async ({ base44, body }) => {
  const { query } = await body<{ query?: string }>();
  if (!query) return err('query is required');

  const safeQuery = sanitizePromptInput(query, 500).text;

  let extracted: Extracted = EMPTY_EXTRACTED;

  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${SYSTEM_PROMPT}\n\nPatient's sentence: ${safeQuery}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          procedures: { type: 'array', items: { type: 'string' } },
          destination_country: { type: ['string', 'null'] },
          destination_city: { type: ['string', 'null'] },
          travel_month: { type: ['string', 'null'] },
          travel_period: { type: ['string', 'null'] },
        },
        required: ['procedures', 'destination_country', 'destination_city', 'travel_month', 'travel_period'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      const result = llmResult as Record<string, unknown>;
      // Hard allowlist checks — even a malformed/hallucinated LLM response
      // can never produce a value outside each real enum.
      const procedures = Array.isArray(result.procedures)
        ? [...new Set(result.procedures.filter((p): p is string => typeof p === 'string' && PROCEDURE_VALUES.includes(p)))].slice(0, MAX_PROCEDURES)
        : [];
      const destination_country = typeof result.destination_country === 'string' && result.destination_country.trim()
        ? result.destination_country.trim().slice(0, 100)
        : null;
      const destination_city = typeof result.destination_city === 'string' && result.destination_city.trim()
        ? result.destination_city.trim().slice(0, 100)
        : null;
      const travel_month = typeof result.travel_month === 'string' && MONTH_VALUES.includes(result.travel_month)
        ? result.travel_month
        : null;
      const travel_period = typeof result.travel_period === 'string' && PERIOD_VALUES.includes(result.travel_period)
        ? result.travel_period
        : null;
      extracted = { procedures, destination_country, destination_city, travel_month, travel_period };
    }
  } catch (_) {
    // LLM unavailable — return the empty shape rather than block the entry
    // point. The frontend just falls through to the normal question-by-
    // question flow.
  }

  return ok(extracted);
}, { name: 'parseBookingIntent', requireAuth: false, bodySchema: BodySchema }));
