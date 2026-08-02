import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computeRecoveryGuidance, RecoveryGuidanceProfileInput } from '../../shared/recoveryGuidanceRules.ts';
import { sanitizeFields } from '../../shared/sanitizePromptInput.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * draftRecoveryGuidance — Phase 1 (Recovery Wellness Guidance).
 *
 * Reviewer-triggered (not cron) for a specific case. Mirrors computeSafeTScreening's
 * sequencing exactly:
 *
 * 1. The DETERMINISTIC engine decides eligibility only (procedure known? active
 *    recovery timeline?). No LLM is involved in this decision, and it fails
 *    closed to 'insufficient_information'.
 * 2. The decision is written to the append-only, hash-chained RecoveryGuidanceDraft
 *    record FIRST — before the AI is invoked at all.
 * 3. Only if 'draft_ready': the AI drafts general wellness guidance text (hydration,
 *    rest, activity limits, wound care) — explicitly instructed never to name a
 *    specific supplement, product, or dose, and never asked for a risk decision.
 *    The narration is logged as a second chained record.
 *
 * This draft is NEVER patient-visible. A clinical_reviewer must approve it via
 * reviewRecoveryGuidance before anything reaches a patient.
 */
const NARRATION_MODEL = 'gpt_5_mini';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function prevHash(base44: any): Promise<string> {
  try {
    const last = await base44.asServiceRole.entities.RecoveryGuidanceDraft.list('-created_at', 1);
    if (last?.length) return await sha256(JSON.stringify(last[0]));
    return 'GENESIS';
  } catch { return 'GENESIS_FALLBACK'; }
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body<{ case_id?: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  // ── Assemble the profile from case + recovery-session data ─────────────────
  const rawProcedureType = Array.isArray(caseRecord.procedures) ? caseRecord.procedures[0] : caseRecord.procedures;
  const { clean, flagged } = sanitizeFields({ procedure_type: rawProcedureType }, 300);

  const sessions = await base44.asServiceRole.entities.RecoverySession.filter({ case_id, is_active: true }, '-recovery_start_at', 1).catch(() => []);
  const session = sessions?.[0] || null;
  let recoveryDay: number | null = null;
  if (session?.recovery_start_at) {
    const elapsedMs = Date.now() - new Date(session.recovery_start_at).getTime();
    recoveryDay = elapsedMs >= 0 ? Math.floor(elapsedMs / 86_400_000) : null;
  }

  const profile: RecoveryGuidanceProfileInput = {
    procedure_type: clean.procedure_type,
    recovery_day: recoveryDay,
    injection_flagged: flagged,
  };
  const decision = computeRecoveryGuidance(profile);
  const nowISO = new Date().toISOString();
  const profileHash = await sha256(JSON.stringify(profile));

  // ── Write the decision to the immutable chain FIRST (before any AI) ────────
  const ph1 = await prevHash(base44);
  let decisionId = '';
  try {
    const rec = await base44.asServiceRole.entities.RecoveryGuidanceDraft.create({
      phase: 'decision',
      case_id,
      procedure_type: clean.procedure_type,
      recovery_day: recoveryDay ?? undefined,
      guidance_status: decision.guidance_status,
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

  if (decision.guidance_status === 'insufficient_information') {
    return ok({
      guidance_status: decision.guidance_status,
      fail_closed_reason: decision.fail_closed_reason || null,
      draft_id: decisionId,
      draft_text: null,
    });
  }

  // ── AI drafts general wellness guidance ONLY — never a risk/dosage decision ─
  let draftText = '';
  try {
    const narr = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: NARRATION_MODEL,
      prompt: `You are drafting GENERAL recovery wellness guidance for a post-surgical patient. This draft will be reviewed and edited by a licensed pharmacist/physician before anyone sees it — you are not making a clinical decision, only writing a starting draft.

Case facts (already finalized by our rules engine — do not alter):
- Procedure category: ${decision.factors.procedure_type}
- Recovery-day band: ${decision.factors.recovery_day_band}

Write general wellness guidance only: hydration, rest/activity limits, wound-care generalities appropriate to this recovery stage. You MUST NOT name any specific supplement, vitamin, herbal product, medication, or dose — that is explicitly out of scope and will be rejected by the reviewer. Do not claim to have checked for drug/supplement interactions. Keep it calm, general, and clearly framed as guidance the reviewing clinician will confirm.

Return JSON only:
{
  "draft_text": "3-5 short sentences of general wellness guidance, no specific products or doses"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          draft_text: { type: 'string' },
        },
        required: ['draft_text'],
      },
    });
    draftText = String(narr?.draft_text || '');
  } catch (_) { /* narration failure — reviewer can still write final_text from scratch */ }

  const ph2 = await prevHash(base44);
  let narrationId = '';
  try {
    const rec = await base44.asServiceRole.entities.RecoveryGuidanceDraft.create({
      phase: 'narration',
      case_id,
      decision_ref: decisionId,
      guidance_status: decision.guidance_status,
      draft_text: draftText,
      model_id: NARRATION_MODEL,
      prev_hash: ph2,
      actor_email: user?.email || 'system',
      created_at: new Date().toISOString(),
    });
    narrationId = rec?.id || '';
  } catch (_) { /* narration logging failure — decision already stands */ }

  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'recovery_guidance_drafted',
      actor_id: user!.id,
      actor_role: user!.role || 'user',
      actor_name: user!.full_name || '',
      actor_email: user!.email || '',
      resource_type: 'RecoveryGuidanceDraft',
      resource_id: narrationId || decisionId,
      case_id,
      details: { procedure_type: decision.factors.procedure_type, recovery_day_band: decision.factors.recovery_day_band },
      sensitive: false,
      timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44),
    });
  } catch (_) { /* audit logging must never affect the response */ }

  return ok({
    guidance_status: decision.guidance_status,
    draft_id: narrationId || decisionId,
    decision_id: decisionId,
    draft_text: draftText,
    factors: decision.factors,
  });
}, { name: 'draftRecoveryGuidance', requireAuth: true, allowedRoles: ['clinical_reviewer', 'admin', 'platform_admin'] }));
