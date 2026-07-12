import { createHandler, ok } from '../_shared/createHandler.ts';
import { computeSafeT, SafeTProfileInput } from '../_shared/safeTEngine.ts';
import { sanitizeFields } from '../_shared/sanitizePromptInput.ts';

/**
 * computeSafeTScreening — the hardened SAFE-T path.
 *
 * 1. Sanitizes user free-text (strips injection patterns; a hit forces review).
 * 2. The DETERMINISTIC engine computes the decision. No LLM is involved in the
 *    decision, and it fails closed to 'review'.
 * 3. The decision is written to the append-only, hash-chained SafeTScreening
 *    record FIRST — before the AI is invoked at all.
 * 4. The AI is then asked ONLY to narrate the finalized decision. It receives the
 *    engine's risk_level + flags, never the raw patient text, and any risk_level
 *    it returns is ignored. The narration is logged as a second chained record.
 *
 * The AI therefore has no path to approve, clear, or modify the safety decision.
 */
const NARRATION_MODEL = 'gpt_5_mini';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function prevHash(base44: any): Promise<string> {
  try {
    const last = await base44.asServiceRole.entities.SafeTScreening.list('-created_at', 1);
    if (last?.length) return await sha256(JSON.stringify(last[0]));
    return 'GENESIS';
  } catch { return 'GENESIS_FALLBACK'; }
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const raw = await body<Record<string, unknown>>();

  // ── 1. Sanitize every free-text field before it can touch any prompt ────────
  const { clean, flagged } = sanitizeFields({
    procedure: raw.procedure,
    medical_conditions: Array.isArray(raw.medical_conditions) ? (raw.medical_conditions as string[]).join(', ') : raw.medical_conditions,
    medications: Array.isArray(raw.medications) ? (raw.medications as string[]).join(', ') : raw.medications,
    allergies: Array.isArray(raw.allergies) ? (raw.allergies as string[]).join(', ') : raw.allergies,
    lifestyle: Array.isArray(raw.lifestyle) ? (raw.lifestyle as string[]).join(', ') : raw.lifestyle,
    notes: raw.medication_notes ?? raw.emotional_notes ?? raw.medical_conditions_other,
  }, 500);

  // ── 2. DETERMINISTIC decision (fail-closed) ─────────────────────────────────
  const profile: SafeTProfileInput = {
    procedure: clean.procedure,
    age: raw.age as string,
    bmi: raw.bmi as string,
    medical_conditions: clean.medical_conditions,
    medications: clean.medications,
    allergies: clean.allergies,
    anesthesia_complications: raw.anesthesia_complications === true || raw.anesthesia_complications === 'Yes',
    had_surgery: raw.had_surgery === true,
    had_complications: raw.had_complications === true,
    lifestyle: clean.lifestyle,
    emotional_concerns: raw.emotional_concerns === true,
    pregnancy_status: String(raw.pregnancy_status ?? ''),
    injection_flagged: flagged,
  };
  const decision = computeSafeT(profile);
  const nowISO = new Date().toISOString();
  const profileHash = await sha256(JSON.stringify(profile));

  // ── 3. Write the decision to the immutable chain FIRST (before any AI) ───────
  const ph1 = await prevHash(base44);
  let decisionId = '';
  try {
    const rec = await base44.asServiceRole.entities.SafeTScreening.create({
      phase: 'decision',
      consultation_ref: (raw.consultation_ref as string) || '',
      risk_level: decision.risk_level,
      score: decision.score,
      flags: decision.flags,
      factors: decision.factors,
      engine_version: decision.engine_version,
      fail_closed_reason: decision.fail_closed_reason || '',
      injection_flagged: flagged,
      profile_hash: profileHash,
      prev_hash: ph1,
      actor_email: user?.email || 'system',
      created_at: nowISO,
    });
    decisionId = rec?.id || '';
  } catch (_) { /* logging failure must not change the decision */ }

  // ── 4. AI narrates the FINALIZED decision only (never sees raw patient text) ─
  let summary = '';
  let recommendations: string[] = [];
  try {
    const narr = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: NARRATION_MODEL,
      prompt: `You are SAFE-T 4LIFE, writing a short, calm patient-facing note.

The safety screening has ALREADY been completed by our clinical rules engine. You are ONLY writing the explanation. You cannot and must not change the result, add or remove risk, or judge safety. Never tell the patient they are "approved", "cleared", "safe", or "guaranteed".

Finalized result (do NOT alter, do NOT output a risk level):
- Risk level: ${decision.risk_level}
- Factors the engine identified: ${decision.flags.length ? decision.flags.join('; ') : 'none noted'}

Return JSON only:
{
  "summary": "2-3 calm sentences explaining this result to the patient and noting that all clinical decisions are made by licensed providers",
  "recommendations": ["3-5 general preparation tips appropriate to the factors above"]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
        required: ['summary'],
      },
    });
    summary = String(narr?.summary || '');
    recommendations = Array.isArray(narr?.recommendations) ? narr.recommendations.map((r: unknown) => String(r)).slice(0, 6) : [];
  } catch (_) { /* narration is optional; the decision already stands */ }

  // Deterministic fallback narration — never fabricates a safety judgement.
  if (!summary) {
    summary = decision.risk_level === 'review'
      ? 'Your profile includes factors that call for review by a licensed provider before proceeding. This is a care standard, not a rejection — our specialist team will follow up.'
      : 'Your screening is complete. A licensed provider makes all clinical decisions; this result simply helps them prepare for your consultation.';
  }

  // ── 5. Log the narration as a second chained record ─────────────────────────
  const ph2 = await prevHash(base44);
  await base44.asServiceRole.entities.SafeTScreening.create({
    phase: 'narration',
    consultation_ref: (raw.consultation_ref as string) || '',
    decision_ref: decisionId,
    risk_level: decision.risk_level,
    narration_text: JSON.stringify({ summary, recommendations }),
    model_id: NARRATION_MODEL,
    prev_hash: ph2,
    actor_email: user?.email || 'system',
    created_at: new Date().toISOString(),
  }).catch(() => {});

  // Confidence is a completeness signal, not an AI value.
  const known = ['age', 'bmi', 'medical_conditions', 'pregnancy_status'].filter((k) => raw[k] !== undefined && raw[k] !== '' && raw[k] !== null).length;
  const confidence = decision.fail_closed_reason ? 100 : Math.max(72, 70 + known * 7);

  return ok({
    risk_level: decision.risk_level,
    score: decision.score,
    confidence,
    flags: decision.flags,
    summary,
    recommendations,
    fail_closed_reason: decision.fail_closed_reason || null,
    screening_id: decisionId,
    engine_version: decision.engine_version,
  });
}, { name: 'computeSafeTScreening', requireAuth: true }));
