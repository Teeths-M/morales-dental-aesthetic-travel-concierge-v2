import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── parseAvailabilityIntent ──────────────────────────────────────────────────
// M-Care super-agent Phase 2C: a doctor says "free Tuesday and Thursday for
// the next month" instead of clicking through DoctorAvailabilityCalendar.jsx
// day by day. This function ONLY parses that sentence into structured
// day-of-week + a bounded week count — it never writes anything. The
// deterministic expansion into real DoctorAvailability rows (and the
// "never touch an already-booked date" check) happens in
// applyDoctorAvailability, a separate function, so a doctor always sees and
// confirms the parsed plan (e.g. "every Tuesday/Thursday for 8 weeks —
// about 16 dates") before anything is actually written — same "parse, then
// confirm, then act" shape as parseBookingIntent (Phase 2A).
//
// Doctors only — a receptionist typing nonsense into this can, at worst,
// waste an LLM call; it can never affect any record since this function
// has no write path at all.

const BodySchema = strictObject({
  query: Fields.shortText(500),
});

const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_WEEKS = 8;
const MAX_WEEKS = 12;

const SYSTEM_PROMPT = `A doctor is describing which days of the week they're available, in one sentence. Extract:

- days: an array of zero or more of exactly these values: ${JSON.stringify(DAY_VALUES)}. Never invent a value outside this list.
- weeks: how many weeks ahead this should apply, as a number, if mentioned (e.g. "next month" is about 4, "next couple weeks" is 2). Use null if not mentioned.

Return ONLY valid JSON, no markdown fences: {"days": [...], "weeks": <number or null>}`;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { query } = await body<{ query?: string }>();
  if (!query) return err('query is required');

  const safeQuery = sanitizePromptInput(query, 500).text;

  let days: string[] = [];
  let weeks = DEFAULT_WEEKS;

  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${SYSTEM_PROMPT}\n\nDoctor's sentence: ${safeQuery}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          days: { type: 'array', items: { type: 'string' } },
          weeks: { type: ['number', 'null'] },
        },
        required: ['days', 'weeks'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      const result = llmResult as Record<string, unknown>;
      if (Array.isArray(result.days)) {
        days = result.days.filter((d): d is string => typeof d === 'string' && DAY_VALUES.includes(d));
      }
      if (typeof result.weeks === 'number' && Number.isFinite(result.weeks)) {
        weeks = Math.min(MAX_WEEKS, Math.max(1, Math.round(result.weeks)));
      }
    }
  } catch (_) {
    // LLM unavailable — return an empty parse rather than block; the
    // frontend shows "I didn't catch specific days" and lets the doctor
    // retype or use the classic calendar instead.
  }

  return ok({ days, weeks });
}, { name: 'parseAvailabilityIntent', requireAuth: true, allowedRoles: ['doctor'], bodySchema: BodySchema }));
