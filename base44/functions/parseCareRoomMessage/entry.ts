import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── parseCareRoomMessage ──────────────────────────────────────────────────
// The Care Room's "Confirmation Engine" parse step — a doctor or patient
// message like "See you Tuesday at 9 AM" or "Please arrive at the clinic by
// 8:30" gets extracted into a candidate confirmable fact. This function
// ONLY parses; it never writes anything and never itself decides that
// anything is confirmed — same "parse, then confirm, then act" discipline as
// parseAvailabilityIntent/parseBookingIntent. postCaseMessage (the real
// caller) decides whether to post a follow-up confirmation-request message
// from the resulting fields; confirmCareRoomMessage is the only place a
// confirmation is ever actually recorded, and only the addressed party can
// record it.
//
// Deliberately conservative: most ordinary messages ("thanks", "sounds
// good", a question) should come back not-confirmable. A false negative
// here just means M-Care stays quiet — never worse than a false positive
// nagging someone to confirm something trivial.

const BodySchema = strictObject({
  text: Fields.shortText(2000),
});

const SYSTEM_PROMPT = `A message was just sent inside a patient-doctor care coordination chat. Decide whether it states a concrete appointment time OR a concrete instruction the OTHER person should explicitly confirm they understood (e.g. a fasting requirement, an arrival time, a medication instruction, a document to bring). Ordinary conversation, questions, greetings, or vague statements are NOT confirmable — only clear, actionable facts are.

Extract:
- is_confirmable: true only if this message states one specific appointment time or one specific instruction that the other party should acknowledge.
- fact_type: "appointment" if it's a date/time, "instruction" otherwise, or null if not confirmable.
- summary: a short, plain-language restatement of the fact (e.g. "Appointment confirmed for Tuesday at 9:00 AM" or "Fast for 8 hours before your procedure"), or empty string if not confirmable.
- extracted_date: an ISO date (YYYY-MM-DD) if a specific calendar date is stated or clearly inferable, otherwise null. Never guess a date from a vague reference like "next week".
- extracted_time: a plain time string (e.g. "9:00 AM") if stated, otherwise null.
- medication_detail: if, and only if, this is a medication instruction (e.g. "Start amoxicillin 500mg three times daily for seven days") — an object {name, dose, frequency, route, duration}, using empty strings for any part not stated. Otherwise null. Never invent a detail not actually said.

Return ONLY valid JSON, no markdown fences.`;

Deno.serve(createHandler(async ({ base44, body }) => {
  const { text } = await body<{ text?: string }>();
  if (!text) return err('text is required');

  const safeText = sanitizePromptInput(text, 2000).text;

  let is_confirmable = false;
  let fact_type: string | null = null;
  let summary = '';
  let extracted_date: string | null = null;
  let extracted_time: string | null = null;
  let medication_detail: { name: string; dose: string; frequency: string; route: string; duration: string } | null = null;

  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `${SYSTEM_PROMPT}\n\nMessage: ${safeText}\n\nRespond now (JSON only):`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_confirmable: { type: 'boolean' },
          fact_type: { type: ['string', 'null'] },
          summary: { type: 'string' },
          extracted_date: { type: ['string', 'null'] },
          extracted_time: { type: ['string', 'null'] },
          medication_detail: {
            type: ['object', 'null'],
            properties: {
              name: { type: 'string' }, dose: { type: 'string' },
              frequency: { type: 'string' }, route: { type: 'string' }, duration: { type: 'string' },
            },
          },
        },
        required: ['is_confirmable', 'fact_type', 'summary', 'extracted_date', 'extracted_time'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      const r = llmResult as Record<string, unknown>;
      is_confirmable = r.is_confirmable === true;
      fact_type = r.fact_type === 'appointment' || r.fact_type === 'instruction' ? r.fact_type : null;
      summary = typeof r.summary === 'string' ? r.summary.slice(0, 300) : '';
      extracted_date = typeof r.extracted_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.extracted_date) ? r.extracted_date : null;
      extracted_time = typeof r.extracted_time === 'string' ? r.extracted_time.slice(0, 30) : null;
      const md = r.medication_detail as Record<string, unknown> | null | undefined;
      if (md && typeof md === 'object' && typeof md.name === 'string' && md.name.trim()) {
        medication_detail = {
          name: md.name.slice(0, 200),
          dose: typeof md.dose === 'string' ? md.dose.slice(0, 100) : '',
          frequency: typeof md.frequency === 'string' ? md.frequency.slice(0, 200) : '',
          route: typeof md.route === 'string' ? md.route.slice(0, 100) : '',
          duration: typeof md.duration === 'string' ? md.duration.slice(0, 100) : '',
        };
      }
      if (!is_confirmable || !fact_type || !summary) {
        is_confirmable = false; fact_type = null; summary = ''; extracted_date = null; extracted_time = null; medication_detail = null;
      }
    }
  } catch (_) {
    // LLM unavailable — return a non-confirmable parse rather than block the
    // real message send that's waiting on this.
  }

  return ok({ is_confirmable, fact_type, summary, extracted_date, extracted_time, medication_detail });
}, { name: 'parseCareRoomMessage', requireAuth: false, rateLimit: { max: 30, windowSeconds: 300 }, bodySchema: BodySchema }));
