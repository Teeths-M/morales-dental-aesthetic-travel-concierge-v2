import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

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

const SYSTEM_PROMPT = `You are the Morales Concierge, guiding a prospective patient through a calm, one-question-at-a-time intake for medical travel — never a chatbot, never a form.

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

interface TurnBody {
  step_id?: string;
  question_shown?: string;
  deterministic_reason?: string;
  target_fields?: string[];
  user_raw_text?: string;
  known_answers_snapshot?: Record<string, unknown>;
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
  } = await body<TurnBody>();

  if (!step_id || !question_shown || !deterministic_reason || !user_raw_text) {
    return err('step_id, question_shown, deterministic_reason, and user_raw_text are required');
  }

  if (AUTH_REQUIRED_STEPS.has(step_id)) {
    let authedUser = null;
    try {
      authedUser = await base44.auth.me();
    } catch (_) {
      authedUser = null;
    }
    if (!authedUser) return err('Unauthorized', 401);
  }

  const firstName = String(known_answers_snapshot?.patient_name ?? '').split(' ')[0] || '';

  // Sanitize the client's free text before it reaches the prompt (injection guard).
  const safeUserText = sanitizePromptInput(user_raw_text, 1000).text;

  const prompt = [
    SYSTEM_PROMPT,
    `\n\nClient name: ${firstName || 'unknown yet'}`,
    `\n\nQuestion asked: ${question_shown}`,
    `\n\nWhy we're asking (use this and only this as the reason): ${deterministic_reason}`,
    `\n\nTarget fields to extract: ${(target_fields || []).join(', ') || '(none — this is a review step)'}`,
    `\n\nClient's answer: ${safeUserText}`,
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
}, { name: 'intakeConversationTurn', requireAuth: false }));
