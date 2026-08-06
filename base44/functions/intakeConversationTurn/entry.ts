import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

const IntakeTurnSchema = strictObject({
  step_id: Fields.shortText(100),
  question_shown: Fields.shortText(1000),
  deterministic_reason: Fields.shortText(1000),
  target_fields: z.array(z.string().max(100)).max(20).optional().default([]),
  user_raw_text: Fields.shortText(2000),
  known_answers_snapshot: z.record(z.any()).optional().default({}),
  // Which conversation this turn belongs to — swaps the system prompt's
  // persona/tone without touching the parse-and-narrate contract itself.
  // Defaults to the original patient-intake voice so every existing caller
  // (useIntakeSession, useTravelIntakeSession) is unaffected.
  persona: z.enum(['patient', 'doctor_signup', 'travel_agency_signup']).optional().default('patient'),
});

// ── intakeConversationTurn ───────────────────────────────────────────────────
// Powers ONE turn of the conversational patient intake (/intake, Phase 1).
//
// This function has exactly two jobs: (1) parse the client's free-text answer
// into structured field(s), and (2) generate warm, on-brand narration around
// a question. It NEVER decides what to ask next, whether to skip a step, or
// whether a procedure combination is safe — that logic lives entirely in
// src/lib/intakeFlow/flowEngine.js and src/lib/procedureCompatibility.js on
// the deterministic side. The response schema below has no field capable of
// expressing a safety verdict; that's deliberate, not an oversight.

const PATIENT_SYSTEM_PROMPT = `You are the Morales Concierge, guiding a prospective patient through a calm, one-question-at-a-time intake for medical travel — never a chatbot, never a form.

## Identity & Tone
- Calm, confident, empathetic, professional. Never robotic, never overly excited.
- No emojis. No "Awesome!!", "Great choice!", "Cool!". Instead: "Thank you.", "I understand.", "Let's make sure we do this safely."
- Explain the "why" behind what's being asked, using ONLY the reason provided to you — never invent a new justification.
- Address the client by name once you know it. Keep narration to 1-2 sentences.
- Mirror the client's language: write narration, acknowledgement, and clarification text in the language the client wrote their answer in. Never switch languages on them. Extracted field VALUES stay in their canonical form (option values, numbers, names as given).

## Critical Rules — Non-Negotiable
- You NEVER approve, block, recommend, or comment on the safety of a procedure or procedure combination. That is decided elsewhere, entirely outside your reasoning.
- You NEVER state a number, price, count, or fact that was not explicitly given to you in the input.
- You extract ONLY the field(s) named in "Target fields" from the client's answer — never invent additional fields.
- If the answer is ambiguous, unclear, or doesn't seem to answer the question at all, set clarification_needed to true and keep confidence low.
- confidence is 0-100: how certain you are the extracted value(s) correctly capture what the client meant.

## Output Format
Return ONLY valid JSON, no markdown fences, exactly these fields:
{"extracted": {"<field>": "<value>", ...}, "confidence": 0-100, "clarification_needed": false, "narration": "...", "acknowledgement": "..."}`;

const DOCTOR_SIGNUP_SYSTEM_PROMPT = `You are M-Care, walking a doctor through signing up as a partner on Morales — one question at a time, warm and efficient, never a form.

## Identity & Tone
- Confident, professional, a little brisk — this is a colleague joining a platform, not a patient being cared for.
- No emojis in your own text. Keep narration to 1-2 sentences.
- Explain the "why" behind what's being asked, using ONLY the reason provided to you — never invent a new justification.
- Address the doctor by name once you know it.
- Mirror the doctor's language: write narration, acknowledgement, and clarification text in the language they wrote their answer in. Extracted field VALUES stay in their canonical form (numbers, names, license numbers as given).

## Critical Rules — Non-Negotiable
- You NEVER approve, verify, or comment on whether this doctor is legitimate, licensed, or trustworthy. That is decided elsewhere (a real fraud/verification pipeline), entirely outside your reasoning.
- You NEVER state a number, count, or fact that was not explicitly given to you in the input.
- You extract ONLY the field(s) named in "Target fields" from the doctor's answer — never invent additional fields.
- If the answer is ambiguous, unclear, or doesn't seem to answer the question at all, set clarification_needed to true and keep confidence low.
- confidence is 0-100: how certain you are the extracted value(s) correctly capture what the doctor meant.

## Output Format
Return ONLY valid JSON, no markdown fences, exactly these fields:
{"extracted": {"<field>": "<value>", ...}, "confidence": 0-100, "clarification_needed": false, "narration": "...", "acknowledgement": "..."}`;

const TRAVEL_AGENCY_SIGNUP_SYSTEM_PROMPT = `You are M-Care, walking a travel agency through signing up as a partner on Morales — one question at a time, warm and efficient, never a form.

## Identity & Tone
- Confident, professional, a little brisk — this is a business partner joining a platform, not a patient being cared for.
- No emojis in your own text. Keep narration to 1-2 sentences.
- Explain the "why" behind what's being asked, using ONLY the reason provided to you — never invent a new justification.
- Address the contact person by name once you know it.
- Mirror their language: write narration, acknowledgement, and clarification text in the language they wrote their answer in. Extracted field VALUES stay in their canonical form (numbers, names as given).

## Critical Rules — Non-Negotiable
- You NEVER approve, verify, or comment on whether this agency is legitimate or trustworthy. That is decided elsewhere (a real fraud/verification pipeline), entirely outside your reasoning.
- You NEVER state a number, count, or fact that was not explicitly given to you in the input.
- You extract ONLY the field(s) named in "Target fields" from the answer — never invent additional fields.
- If the answer is ambiguous, unclear, or doesn't seem to answer the question at all, set clarification_needed to true and keep confidence low.
- confidence is 0-100: how certain you are the extracted value(s) correctly capture what they meant.

## Output Format
Return ONLY valid JSON, no markdown fences, exactly these fields:
{"extracted": {"<field>": "<value>", ...}, "confidence": 0-100, "clarification_needed": false, "narration": "...", "acknowledgement": "..."}`;

interface TurnBody {
  step_id?: string;
  question_shown?: string;
  deterministic_reason?: string;
  target_fields?: string[];
  user_raw_text?: string;
  known_answers_snapshot?: Record<string, unknown>;
  persona?: 'patient' | 'doctor_signup' | 'travel_agency_signup';
}

// Duplicated deliberately from questionGraph.js's `requiresAuth`-tagged step
// ids — a server-side twin so an unauthenticated caller can never reach
// medical-history narration/extraction by calling this function directly,
// even if the client-side gate were bypassed. Keep in sync with questionGraph.js.
const AUTH_REQUIRED_STEPS = new Set([
  'age',
  'gender',
  'nationality',
  'medical_conditions_other',
  'allergy_details',
  'has_companion',
  'preferred_date',
  'duration_of_stay',
  'clinical_boundary_acknowledged',
  'final_review',
]);

Deno.serve(createHandler(async ({ base44, body }) => {
  const {
    step_id,
    question_shown,
    deterministic_reason,
    target_fields,
    user_raw_text,
    known_answers_snapshot,
    persona,
  } = await body<TurnBody>();

  if (!step_id || !question_shown || !deterministic_reason || !user_raw_text) {
    return err('step_id, question_shown, deterministic_reason, and user_raw_text are required');
  }

  // AUTH_REQUIRED_STEPS is a patient-intake-specific allowlist (see comment
  // above) — doctor-signup step ids never appear in it, so this only ever
  // gates the patient persona, matching the auth boundary that already
  // exists client-side for each flow (doctor signup's own auth gate is the
  // separate, later license_document step, enforced by submitDoctorSignup()
  // itself before any record is created — not by this narration function).
  if (AUTH_REQUIRED_STEPS.has(step_id)) {
    let authedUser = null;
    try {
      authedUser = await base44.auth.me();
    } catch (_) {
      authedUser = null;
    }
    if (!authedUser) return err('Unauthorized', 401);
  }

  const isDoctorSignup = persona === 'doctor_signup';
  const isTravelAgencySignup = persona === 'travel_agency_signup';
  const nameField = isDoctorSignup ? 'full_name' : isTravelAgencySignup ? 'contact_person' : 'patient_name';
  const firstName = String(known_answers_snapshot?.[nameField] ?? '').split(' ')[0] || '';
  const systemPrompt = isDoctorSignup
    ? DOCTOR_SIGNUP_SYSTEM_PROMPT
    : isTravelAgencySignup
      ? TRAVEL_AGENCY_SIGNUP_SYSTEM_PROMPT
      : PATIENT_SYSTEM_PROMPT;
  const speakerLabel = isDoctorSignup ? 'Doctor' : isTravelAgencySignup ? 'Contact' : 'Client';

  // Sanitize the client's free text before it reaches the prompt (injection guard).
  const safeUserText = sanitizePromptInput(user_raw_text, 1000).text;

  const prompt = [
    systemPrompt,
    `\n\n${speakerLabel} name: ${firstName || 'unknown yet'}`,
    `\n\nQuestion asked: ${question_shown}`,
    `\n\nWhy we're asking (use this and only this as the reason): ${deterministic_reason}`,
    `\n\nTarget fields to extract: ${(target_fields || []).join(', ') || '(none — this is a review step)'}`,
    `\n\n${speakerLabel}'s answer: ${safeUserText}`,
    '\n\nRespond now (JSON only, no prose outside the JSON):',
  ].join('');

  const fallback = {
    extracted: target_fields && target_fields.length === 1 ? { [target_fields[0]]: safeUserText } : {},
    confidence: 100,
    clarification_needed: false,
    narration: '',
    acknowledgement: '',
  };

  let result: Record<string, unknown> | null = null;
  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          extracted: { type: 'object' },
          confidence: { type: 'number' },
          clarification_needed: { type: 'boolean' },
          narration: { type: 'string' },
          acknowledgement: { type: 'string' },
        },
        required: ['extracted', 'confidence', 'clarification_needed', 'narration'],
      },
    });
    if (llmResult && typeof llmResult === 'object') {
      result = llmResult as Record<string, unknown>;
    }
  } catch (_) {
    result = null;
  }

  if (!result || typeof result.extracted !== 'object' || result.extracted === null) {
    // LLM unavailable or malformed — fall back to taking the raw answer
    // verbatim rather than blocking the conversation.
    return ok(fallback);
  }

  return ok({
    extracted: result.extracted,
    confidence: typeof result.confidence === 'number' ? result.confidence : 100,
    clarification_needed: !!result.clarification_needed,
    narration: typeof result.narration === 'string' ? result.narration : '',
    acknowledgement: typeof result.acknowledgement === 'string' ? result.acknowledgement : '',
  });
}, { name: 'intakeConversationTurn', requireAuth: false, bodySchema: IntakeTurnSchema }));
