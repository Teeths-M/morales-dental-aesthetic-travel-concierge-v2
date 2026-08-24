import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { flagForReview } from '../../shared/freshness.ts';

/**
 * getPassportValidityRequirement — the real, destination-aware answer to
 * "does this passport have enough validity for this specific destination,"
 * instead of checkCaseRequirements's own honest-but-generic 6-month
 * guideline. Never invents a per-country rule (no passport-validity matrix
 * exists anywhere in this app, and building one blind would be exactly the
 * fabricated-data risk RULE 3 exists to prevent) — reuses M-Care's real
 * recall-then-research brain (recallMcareKnowledge / mcareResearchAndLearn,
 * both already confidence-gated at >=80% before anything is trusted or
 * persisted), the same two-call composition getTravelBriefing's own
 * getRecentEvents already uses, rather than a second bespoke cache layer.
 *
 * On a confident answer, returns it with real confidence/source/freshness.
 * On anything less than confident, returns status:'unverified' — never a
 * guessed number — and creates a real, admin-visible confirmation task via
 * the existing DataFreshnessReview queue (flagForReview), the same "state
 * unverified and create a confirmation task" discipline this app already
 * uses for a visa-rule disagreement or an unconfirmed knowledge fact.
 */

const bodySchema = strictObject({
  nationality: Fields.shortText(100),
  destination_country: Fields.shortText(100),
});

async function safeInvoke(base44: any, functionName: string, payload: Record<string, unknown>) {
  try {
    const res = await base44.functions.invoke(functionName, payload);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const { nationality, destination_country } = await body<{ nationality: string; destination_country: string }>();

  const question = `What is the minimum passport validity required at time of entry for a traveler holding a ${nationality} passport entering ${destination_country}? State the specific rule plainly — for example, "valid for at least 6 months beyond the date of arrival," "valid for the duration of stay only," or "valid for at least 3 months beyond the date of departure." If the rule genuinely varies by visa type or is not well-established, say so.`;

  // 1. Fast local recall first — mirrors getTravelBriefing's getRecentEvents.
  const recall = await safeInvoke(base44, 'recallMcareKnowledge', { question, limit: 1 });
  const topRecall = recall?.matches?.[0];
  if (recall?.found && topRecall && topRecall.score >= 0.6 && topRecall.is_fresh && topRecall.confidence_score >= 80) {
    return ok({
      status: 'confirmed',
      nationality,
      destination_country,
      description: topRecall.answer,
      confidence: topRecall.confidence_score,
      source_url: topRecall.source_url || null,
      last_verified_at: topRecall.last_verified_at || null,
    });
  }

  // 2. Research — real, confidence-gated, self-persisting on a strong result.
  const research = await safeInvoke(base44, 'mcareResearchAndLearn', {
    question,
    context: 'Passport validity requirement research for a travel concierge platform — a factual, regulatory-shaped question, not medical advice.',
  });

  if (research?.success && research.answer && Number(research.confidence_score) >= 80) {
    return ok({
      status: 'confirmed',
      nationality,
      destination_country,
      description: research.answer,
      confidence: research.confidence_score,
      source_url: research.source_url || null,
      last_verified_at: research.last_verified_at || null,
    });
  }

  // 3. Not confident enough to state as fact — honest 'unverified', and a
  // real confirmation task lands in the same human-review queue this app
  // already uses for exactly this shape of gap. Never blocks the caller —
  // a logging failure here must never turn an honest 'unverified' answer
  // into an error.
  await flagForReview(base44, {
    subject_type: 'passport_validity_requirement',
    subject_label: `${nationality} passport → ${destination_country}`,
    change_type: 'source_unavailable',
    detail: `Could not confirm the real passport-validity requirement for a ${nationality} passport entering ${destination_country} with enough confidence (best result: ${Number(research?.confidence_score) || 0}%). A human should confirm the real requirement with the traveler directly.`,
    detected_via: 'live_check',
    severity: 'info',
  }).catch(() => {});

  return ok({
    status: 'unverified',
    nationality,
    destination_country,
    description: 'Could not confirm the real, destination-specific passport-validity requirement with enough confidence. A common worldwide guideline is at least 6 months of validity beyond the date of arrival, but this has not been confirmed for this specific destination — a confirmation task has been created for the care team.',
    confidence: research?.confidence_score ?? null,
    source_url: null,
    last_verified_at: null,
  });
}, { name: 'getPassportValidityRequirement', requireAuth: false, bodySchema, rateLimit: { max: 15, windowSeconds: 300 } }));
