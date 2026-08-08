import { createHandler, ok, err } from '../../shared/createHandler.ts';

// ── mcareResearchAndLearn ─────────────────────────────────────────────────────
// M-Care's "when stuck, research and learn" brain. Given a question it can't
// confidently answer from memory, this function:
//   1. Checks the McareKnowledge brain for an existing >=80%-accurate answer
//      (so repeat questions are answered instantly and the recalled_count
//      increments).
//   2. If no good match, researches the question via an LLM with live web
//      context (factual, non-diagnostic), returning a structured answer with a
//      self-reported confidence score.
//   3. If confidence >= 80, persists the Q&A to McareKnowledge so the next
//      traveler who asks the same thing gets the answer from memory.
//   4. Returns the answer, the confidence, whether it was recalled vs freshly
//      researched, and whether it was saved to the brain.
//
// Public (requireAuth false) so an anonymous M-Care traveler can benefit, but
// the user (if any) is recorded as the learner. Web research uses a model that
// supports add_context_from_internet.

const ACCURACY_THRESHOLD = 80;

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

function bestMatch(question: string, records: any[]) {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0 || records.length === 0) return null;
  let best: any = null;
  let bestScore = 0;
  for (const r of records) {
    if (r.flagged_for_review) continue;
    const stored = new Set([
      ...tokenize(r.normalized_question || r.question || ''),
      ...((r.search_keywords || []).map((k: string) => k.toLowerCase())),
    ]);
    let overlap = 0;
    for (const t of qTokens) if (stored.has(t)) overlap++;
    const score = overlap / Math.max(qTokens.size, stored.size); // Jaccard-ish
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best ? { ...best, score: bestScore } : null;
}

Deno.serve(createHandler(async ({ base44, body }) => {
    let user: any = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }

    const payload = await body();
    const question = (payload?.question || '').toString().trim();
    const context = (payload?.context || '').toString().trim();
    if (!question) {
      return err('question is required');
    }

    // 1. Recall from brain first.
    let existing: any[] = [];
    try {
      existing = await base44.asServiceRole.entities.McareKnowledge.list('-created_date', 500);
    } catch (_) { existing = []; }
    const hit = bestMatch(question, existing);
    if (hit && hit.score >= 0.6) {
      try {
        await base44.asServiceRole.entities.McareKnowledge.update(hit.id, {
          recalled_count: (hit.recalled_count || 0) + 1,
        });
      } catch (_) { /* best-effort */ }
      return ok({
        success: true,
        source: 'brain',
        recalled: true,
        saved: false,
        answer: hit.answer,
        confidence_score: hit.confidence_score,
        knowledge_id: hit.id,
        match_score: hit.score,
      });
    }

    // 2. Research with live web context. gemini_3_flash supports
    //    add_context_from_internet; non-diagnostic, factual answers only.
    const schema = {
      type: 'object' as const,
      properties: {
        answer: { type: 'string', description: 'A clear, accurate, plain-English answer to the question' },
        confidence_score: { type: 'number', minimum: 0, maximum: 100, description: 'Self-estimated accuracy/confidence 0-100. Only >=80 should be treated as reliable.' },
        accuracy_estimation: { type: 'string', description: 'How accuracy was assessed (sources cross-checked, registry-confirmed, well-established, etc.)' },
        source_summary: { type: 'string', description: 'Brief note on the sources or reasoning behind the answer' },
        search_keywords: { type: 'array', items: { type: 'string' }, description: '5-10 keywords from the question for future matching' },
        journey_context: { type: 'string', enum: ['medical', 'travel', 'logistics', 'verification', 'safety', 'general'] },
      },
      required: ['answer', 'confidence_score'],
    };

    const prompt = `You are M-Care, a medical-travel concierge researching a factual question you were not certain about. Use live web context to answer accurately. Rules:
- Give a clear, plain-English answer a traveler or partner can act on.
- NEVER diagnose, prescribe, or give individual medical advice. If the question asks for diagnosis/prescription, answer with the general, factual information only and recommend consulting a licensed clinician.
- Estimate your confidence (0-100) honestly. Below 80 means you are not sure enough to memorize it.
- List the sources/reasoning briefly.
- Return JSON only matching the schema.

Question: """${question}"""
${context ? `Context: ${context}` : ''}`;

    let research: any;
    try {
      research = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        prompt,
        response_json_schema: schema,
      });
    } catch (llmErr) {
      return Response.json({ error: 'Research service unavailable right now.', detail: String(llmErr) }, { status: 503 });
    }

    const answer = (research?.answer || '').toString().trim();
    const confidence = Math.round(Number(research?.confidence_score || 0));
    if (!answer) {
      return err('Research returned no answer.', 502);
    }

    // 3. Persist only when accuracy meets the threshold.
    let saved = false;
    let knowledge_id: string | null = null;
    if (confidence >= ACCURACY_THRESHOLD) {
      try {
        const rec = await base44.asServiceRole.entities.McareKnowledge.create({
          question,
          normalized_question: question.toLowerCase(),
          answer,
          confidence_score: confidence,
          accuracy_estimation: (research?.accuracy_estimation || '').toString(),
          source_summary: (research?.source_summary || '').toString(),
          search_keywords: Array.isArray(research?.search_keywords) ? research.search_keywords.map((k: any) => String(k).toLowerCase()) : tokenize(question),
          journey_context: ['medical','travel','logistics','verification','safety','general'].includes(research?.journey_context) ? research.journey_context : 'general',
          recalled_count: 0,
          useful_feedback: 0,
          flagged_for_review: false,
          created_at: new Date().toISOString(),
          created_by: user?.email || 'mcare_agent',
        });
        saved = true;
        knowledge_id = rec?.id || null;
      } catch (e) {
        // Saving is best-effort — still return the answer to the traveler.
        console.error('[mcareResearchAndLearn] save failed', e);
      }
    }

    return ok({
      success: true,
      source: 'research',
      recalled: false,
      saved,
      answer,
      confidence_score: confidence,
      accuracy_estimation: research?.accuracy_estimation || '',
      source_summary: research?.source_summary || '',
      knowledge_id,
      threshold: ACCURACY_THRESHOLD,
      note: saved
        ? "Learned and saved to M-Care's brain for next time."
        : confidence < ACCURACY_THRESHOLD
          ? `Answered but confidence (${confidence}%) is below the ${ACCURACY_THRESHOLD}% memorization threshold — not saved to the brain.`
          : 'Answered; could not persist to the brain just now.',
    });
}, { name: 'mcareResearchAndLearn', requireAuth: false }));