import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── recallMcareKnowledge ──────────────────────────────────────────────────────
// Read-only lookup into M-Care's brain. Given a question, returns the best
// matching memorized answer(s) (>=80% accurate when stored) so M-Care can
// answer instantly from memory instead of re-researching. Increments
// recalled_count on the top match used. No research happens here — pair with
// mcareResearchAndLearn when no good memory exists.

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','of','to','in','on','for','with','is','are','am','i','you','he','she','it','we','they','my','your','his','her','its','our','their','me','him','us','them','this','that','these','those','do','does','did','can','could','would','should','will','what','when','where','why','who','how','which','be','been','being','have','has','had','not','no','so','at','by','from','as','about','into','than','was','were'
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user: any = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }

    let body: any = null;
    try { body = await req.json(); } catch (_) {
      const url = new URL(req.url);
      body = { question: url.searchParams.get('question'), limit: url.searchParams.get('limit') };
    }
    const question = (body?.question || '').toString().trim();
    const limit = Math.min(Number(body?.limit || 3), 10);
    if (!question) {
      return Response.json({ error: 'question is required' }, { status: 400 });
    }

    const records: any[] = await base44.asServiceRole.entities.McareKnowledge.list('-created_date', 500);
    const active = records.filter((r) => !r.flagged_for_review);
    if (active.length === 0) {
      return Response.json({ success: true, found: false, matches: [], message: 'M-Care brain is empty for this question.' });
    }

    const qTokens = new Set(tokenize(question));
    const scored = active.map((r) => {
      const stored = new Set([
        ...tokenize(r.normalized_question || r.question || ''),
        ...((r.search_keywords || []).map((k: string) => k.toLowerCase())),
      ]);
      let overlap = 0;
      for (const t of qTokens) if (stored.has(t)) overlap++;
      const score = qTokens.size === 0 ? 0 : overlap / Math.max(qTokens.size, stored.size);
      return { id: r.id, question: r.question, answer: r.answer, confidence_score: r.confidence_score, journey_context: r.journey_context, recalled_count: r.recalled_count || 0, score };
    }).sort((a, b) => b.score - a.score);

    const matches = scored.filter((m) => m.score > 0.15).slice(0, limit);

    // Increment recalled_count on the strongest match if it's a genuine hit.
    if (matches.length > 0 && matches[0].score >= 0.4) {
      try {
        await base44.asServiceRole.entities.McareKnowledge.update(matches[0].id, {
          recalled_count: (matches[0].recalled_count || 0) + 1,
        });
      } catch (_) { /* best-effort */ }
    }

    return Response.json({
      success: true,
      found: matches.length > 0,
      best_score: matches[0]?.score || 0,
      matches,
      message: matches.length > 0 ? 'Found a memorized answer.' : 'No strong match in the brain — research the question.',
    });
  } catch (error) {
    console.error('[recallMcareKnowledge]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});