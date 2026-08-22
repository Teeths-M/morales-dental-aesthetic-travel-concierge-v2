import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { scoreAllMcareKnowledgeMatches, isActiveMcareKnowledgeRecord, knowledgeFreshnessKind } from '../../shared/mcareKnowledgeMatch.ts';
import { freshnessState } from '../../shared/freshness.ts';

// ── recallMcareKnowledge ──────────────────────────────────────────────────────
// Read-only lookup into M-Care's brain. Given a question, returns the best
// matching memorized answer(s) (>=80% accurate when stored) so M-Care can
// answer instantly from memory instead of re-researching. Increments
// recalled_count on the top match used. No research happens here — pair with
// mcareResearchAndLearn when no good memory exists, or when a returned match
// is stale/conflicted and the context calls for a fresh check.
//
// Every match now also carries its real verification_status/is_fresh/
// last_verified_at/source_url/source_type so the caller can judge whether to
// trust it as-is — including a verification_status: 'conflicted' match,
// which is still surfaced (never hidden) so M-Care can present the
// uncertainty honestly rather than silently pick a side.

Deno.serve(createHandler(async ({ req, base44, body }) => {
    let payload = await body();
    if (!payload?.question) {
      const url = new URL(req.url);
      payload = { question: url.searchParams.get('question'), limit: url.searchParams.get('limit') };
    }
    const question = (payload?.question || '').toString().trim();
    const limit = Math.min(Number(payload?.limit || 3), 10);
    if (!question) {
      return err('question is required');
    }

    const records: any[] = await base44.asServiceRole.entities.McareKnowledge.list('-created_date', 500);
    const active = records.filter(isActiveMcareKnowledgeRecord);
    if (active.length === 0) {
      return ok({ success: true, found: false, matches: [], message: 'M-Care brain is empty for this question.' });
    }

    const scored = scoreAllMcareKnowledgeMatches(question, active).map((r) => {
      const fresh = freshnessState(knowledgeFreshnessKind(r.freshness_tier), r.last_verified_at || r.created_at);
      return {
        id: r.id,
        question: r.question,
        answer: r.answer,
        confidence_score: r.confidence_score,
        journey_context: r.journey_context,
        recalled_count: r.recalled_count || 0,
        score: r.score,
        verification_status: r.verification_status || 'researched',
        freshness_tier: r.freshness_tier || 'stable',
        is_fresh: fresh.fresh,
        last_verified_at: r.last_verified_at || r.created_at || null,
        next_review_at: r.next_review_at || null,
        source_url: r.source_url || '',
        source_type: r.source_type || '',
      };
    });

    const matches = scored.filter((m) => m.score > 0.15).slice(0, limit);

    // Increment recalled_count on the strongest match if it's a genuine hit.
    if (matches.length > 0 && matches[0].score >= 0.4) {
      try {
        await base44.asServiceRole.entities.McareKnowledge.update(matches[0].id, {
          recalled_count: (matches[0].recalled_count || 0) + 1,
        });
      } catch (_) { /* best-effort */ }
    }

    return ok({
      success: true,
      found: matches.length > 0,
      best_score: matches[0]?.score || 0,
      matches,
      message: matches.length > 0 ? 'Found a memorized answer.' : 'No strong match in the brain — research the question.',
    });
}, { name: 'recallMcareKnowledge', requireAuth: false }));
