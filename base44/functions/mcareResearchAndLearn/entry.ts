import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { searchForProviders } from '../../shared/providerDiscovery.ts';
import { logExternalSearch } from '../../shared/logExternalSearch.ts';
import { findBestMcareKnowledgeMatch, knowledgeFreshnessKind, tokenize } from '../../shared/mcareKnowledgeMatch.ts';
import { freshnessState, flagForReview, TTL_MS } from '../../shared/freshness.ts';
import { reviseAndUpdate } from '../../shared/reviseAndUpdate.ts';

// ── mcareResearchAndLearn ─────────────────────────────────────────────────────
// M-Care's "when stuck, research and learn" brain. Given a question it can't
// confidently answer from memory, this function:
//   1. Checks the McareKnowledge brain for an existing, FRESH, non-conflicted
//      >=80%-accurate answer (recalled_count increments on a real hit). A
//      match that's due for review, or already flagged conflicted, is NOT
//      trusted blindly regardless of how old the disagreement is -- it falls
//      through to step 2 as a real revalidation attempt instead.
//   2. Researches the question. Tries Tavily first (real, structured,
//      inspectable search results embedded directly in the prompt -- see
//      providerDiscovery.ts) and, only when Tavily is unavailable or returns
//      nothing, falls straight through to the original Base44
//      InvokeLLM({add_context_from_internet:true}) black-box grounding call.
//      Every Tavily attempt is audit-logged via logExternalSearch regardless
//      of outcome. When this is a revalidation (a prior match existed), the
//      prior answer is embedded in the prompt and the model is asked whether
//      its fresh finding agrees or conflicts with it -- one extra field on
//      the same call, not a second round-trip.
//   3. Persists with real provenance (source_url/source_type/freshness_tier/
//      last_verified_at/next_review_at/jurisdiction/country) once confidence
//      >= 80. A revalidation that agrees with the prior answer updates it via
//      reviseAndUpdate -- the prior value is snapshotted to PatientDataRevision
//      before being overwritten, never a silent loss. A revalidation that
//      disagrees marks BOTH the old and new record verification_status:
//      'conflicted' and escalates to the existing DataFreshnessReview human
//      queue via flagForReview -- it never silently picks one answer over
//      the other. A revalidation that still can't clear the confidence bar
//      marks the prior record verification_status: 'stale' and returns its
//      OLD answer, honestly labeled as unrevalidated background information.
//   4. Returns the answer plus its real verification_status/freshness_tier/
//      is_fresh/source_url/source_type/last_verified_at/next_review_at so
//      M-Care can speak about it honestly (see RULE 35 in m_care.jsonc) --
//      never implying "verified" or "permanent" for a researched fact.
//
// verification_status deliberately has no 'verified' value anywhere in this
// file or the entity schema -- there is no authoritative registry for most of
// what this cache holds, so nothing here may ever claim that (the same
// discipline DiscoveredProviderCandidate.status already applies to provider
// leads). 'corroborated' is reachable only the honest way: a second,
// independent research pass, separated in time, that agrees with the first.
//
// Public (requireAuth false) so an anonymous M-Care traveler can benefit, but
// the user (if any) is recorded as the learner.

const ACCURACY_THRESHOLD = 80;
const FRESHNESS_TIERS = ['volatile', 'regulatory', 'stable'] as const;
const JOURNEY_CONTEXTS = ['medical', 'travel', 'logistics', 'verification', 'safety', 'general'];

function isTrustworthy(record: any): boolean {
  return !record.verification_status || record.verification_status === 'researched' || record.verification_status === 'corroborated';
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
    const hit = findBestMcareKnowledgeMatch(question, existing);

    let priorMatch: any = null;
    if (hit && hit.score >= 0.6) {
      const fresh = freshnessState(knowledgeFreshnessKind(hit.freshness_tier), hit.last_verified_at || hit.created_at);
      if (fresh.fresh && isTrustworthy(hit)) {
        try {
          await base44.asServiceRole.entities.McareKnowledge.update(hit.id, {
            recalled_count: (hit.recalled_count || 0) + 1,
          });
        } catch (_) { /* best-effort */ }
        const lastVerified = hit.last_verified_at || hit.created_at || null;
        return ok({
          success: true,
          source: 'brain',
          recalled: true,
          saved: false,
          revalidated: false,
          conflict_detected: false,
          answer: hit.answer,
          confidence_score: hit.confidence_score,
          accuracy_estimation: hit.accuracy_estimation || '',
          source_summary: hit.source_summary || '',
          used_tavily: hit.source_type === 'tavily_web_search',
          knowledge_id: hit.id,
          match_score: hit.score,
          threshold: ACCURACY_THRESHOLD,
          verification_status: hit.verification_status || 'researched',
          freshness_tier: hit.freshness_tier || 'stable',
          is_fresh: true,
          last_verified_at: lastVerified,
          next_review_at: hit.next_review_at || null,
          source_url: hit.source_url || '',
          source_type: hit.source_type || '',
          jurisdiction: hit.jurisdiction || '',
          country: hit.country || '',
          note: `Based on research checked on ${lastVerified ? String(lastVerified).slice(0, 10) : 'a prior date'}.`,
        });
      }
      // Not trustworthy as-is (due for review, or already flagged
      // conflicted) -- carry it forward so research compares against it
      // instead of researching blind or trusting it blind.
      priorMatch = hit;
    }

    // 2. Research. Try Tavily's structured, inspectable search first.
    const tavilyResult = await searchForProviders(question);
    await logExternalSearch(base44, {
      query: question,
      search_type: 'other',
      vendor: tavilyResult.supported ? 'tavily' : 'none',
      status: tavilyResult.supported ? 'success' : 'unavailable',
      result_count: tavilyResult.supported ? tavilyResult.results.length : 0,
      initiated_by: 'mcareResearchAndLearn',
    });
    const usedTavily = tavilyResult.supported && tavilyResult.results.length > 0;
    const topSourceUrl = usedTavily ? String((tavilyResult as any).results[0]?.url || '') : '';
    const sourceContext = usedTavily
      ? `\n\nReal web search results to ground your answer — cite what's relevant, ignore what isn't:\n${(tavilyResult as any).results.map((r: any, i: number) => `${i + 1}. ${r.title} (${r.url}): ${r.snippet}`).join('\n')}`
      : '';

    // gemini_3_flash supports add_context_from_internet; non-diagnostic,
    // factual answers only. Only falls back to the black-box grounding flag
    // when Tavily didn't supply real sources — preserves the exact original
    // research path as a fallback, unchanged.
    const properties: Record<string, any> = {
      answer: { type: 'string', description: 'A clear, accurate, plain-English answer to the question' },
      confidence_score: { type: 'number', minimum: 0, maximum: 100, description: 'Self-estimated accuracy/confidence 0-100. Only >=80 should be treated as reliable.' },
      accuracy_estimation: { type: 'string', description: 'How accuracy was assessed (sources cross-checked, registry-confirmed, well-established, etc.)' },
      source_summary: { type: 'string', description: 'Brief note on the sources or reasoning behind the answer' },
      search_keywords: { type: 'array', items: { type: 'string' }, description: '5-10 keywords from the question for future matching' },
      journey_context: { type: 'string', enum: JOURNEY_CONTEXTS },
      freshness_tier: {
        type: 'string',
        enum: FRESHNESS_TIERS,
        description: 'How quickly this kind of fact tends to change: volatile (prices/availability/current conditions), regulatory (visa/licensing/travel restrictions), or stable (general procedure/terminology/definitions).',
      },
      jurisdiction: { type: 'string', description: 'The broader jurisdiction this fact applies to, if jurisdiction-specific (e.g. "Federal / United States"). Empty string if not applicable.' },
      country: { type: 'string', description: 'The specific country this fact applies to, if country-specific. Empty string if general/global.' },
    };
    const required = ['answer', 'confidence_score', 'freshness_tier'];

    if (priorMatch) {
      properties.consistent_with_prior_finding = {
        type: 'boolean',
        description: 'Whether this new answer is consistent with the PRIOR STORED ANSWER given below (even if worded differently), or whether it meaningfully conflicts with it (a genuinely different fact).',
      };
      properties.conflict_explanation = {
        type: 'string',
        description: 'Only meaningful if consistent_with_prior_finding is false: a brief, honest note on how the new finding differs from the prior one.',
      };
      required.push('consistent_with_prior_finding');
    }

    const schema = {
      type: 'object' as const,
      properties,
      required,
    };

    const priorContext = priorMatch
      ? `\n\nA PRIOR STORED ANSWER exists for this exact question but is due for a fresh check: """${priorMatch.answer}""". Research the question fresh, on its own merits, and report plainly whether your new finding agrees with this prior answer or conflicts with it.`
      : '';

    const prompt = `You are M-Care, a medical-travel concierge researching a factual question you were not certain about. Use live web context to answer accurately. Rules:
- Give a clear, plain-English answer a traveler or partner can act on.
- NEVER diagnose, prescribe, or give individual medical advice. If the question asks for diagnosis/prescription, answer with the general, factual information only and recommend consulting a licensed clinician.
- Estimate your confidence (0-100) honestly. Below 80 means you are not sure enough to save it for reuse.
- Classify how quickly this kind of fact tends to change (freshness_tier), and note the jurisdiction/country if the fact is specific to one.
- List the sources/reasoning briefly.
- Return JSON only matching the schema.

Question: """${question}"""
${context ? `Context: ${context}` : ''}${sourceContext}${priorContext}`;

    let research: any;
    try {
      research = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: !usedTavily,
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

    const freshnessTier = FRESHNESS_TIERS.includes(research?.freshness_tier) ? research.freshness_tier : 'stable';
    const jurisdiction = (research?.jurisdiction || '').toString();
    const country = (research?.country || '').toString();
    const accuracyEstimation = (research?.accuracy_estimation || '').toString();
    const sourceSummary = (research?.source_summary || '').toString();
    const journeyContext = JOURNEY_CONTEXTS.includes(research?.journey_context) ? research.journey_context : 'general';
    const searchKeywords = Array.isArray(research?.search_keywords) ? research.search_keywords.map((k: any) => String(k).toLowerCase()) : tokenize(question);
    const sourceType = usedTavily ? 'tavily_web_search' : 'llm_grounding';
    const nowISO = new Date().toISOString();
    const nextReviewISO = new Date(Date.now() + TTL_MS[knowledgeFreshnessKind(freshnessTier)]).toISOString();

    const baseFields = {
      question,
      normalized_question: question.toLowerCase(),
      answer,
      confidence_score: confidence,
      accuracy_estimation: accuracyEstimation,
      source_summary: sourceSummary,
      search_keywords: searchKeywords,
      journey_context: journeyContext,
      source_url: topSourceUrl,
      source_type: sourceType,
      freshness_tier: freshnessTier,
      jurisdiction,
      country,
      last_verified_at: nowISO,
      next_review_at: nextReviewISO,
    };

    // 3a. Confidence too low to save for reuse.
    if (confidence < ACCURACY_THRESHOLD) {
      if (priorMatch) {
        // A failed revalidation attempt -- mark the prior record stale
        // (metadata only, its answer content is untouched) and return ITS
        // old content, honestly labeled, rather than the just-rejected
        // fresh research.
        try {
          await base44.asServiceRole.entities.McareKnowledge.update(priorMatch.id, { verification_status: 'stale' });
        } catch (_) { /* best-effort */ }
        return ok({
          success: true,
          source: 'research',
          recalled: false,
          saved: false,
          revalidated: true,
          conflict_detected: false,
          answer: priorMatch.answer,
          confidence_score: priorMatch.confidence_score,
          accuracy_estimation: priorMatch.accuracy_estimation || '',
          source_summary: priorMatch.source_summary || '',
          used_tavily: priorMatch.source_type === 'tavily_web_search',
          knowledge_id: priorMatch.id,
          threshold: ACCURACY_THRESHOLD,
          verification_status: 'stale',
          freshness_tier: priorMatch.freshness_tier || 'stable',
          is_fresh: false,
          last_verified_at: priorMatch.last_verified_at || priorMatch.created_at || null,
          next_review_at: priorMatch.next_review_at || null,
          source_url: priorMatch.source_url || '',
          source_type: priorMatch.source_type || '',
          jurisdiction: priorMatch.jurisdiction || '',
          country: priorMatch.country || '',
          note: "Re-checked this, but the fresh research didn't confirm it either — sharing the last known answer as unrevalidated background information, not as something current.",
        });
      }
      return ok({
        success: true,
        source: 'research',
        recalled: false,
        saved: false,
        revalidated: false,
        conflict_detected: false,
        answer,
        confidence_score: confidence,
        accuracy_estimation: accuracyEstimation,
        source_summary: sourceSummary,
        used_tavily: usedTavily,
        knowledge_id: null,
        threshold: ACCURACY_THRESHOLD,
        verification_status: 'researched',
        freshness_tier: freshnessTier,
        is_fresh: false,
        last_verified_at: null,
        next_review_at: null,
        source_url: topSourceUrl,
        source_type: sourceType,
        jurisdiction,
        country,
        note: `Answered but confidence (${confidence}%) is below the ${ACCURACY_THRESHOLD}% threshold to save for reuse — treat this as researched, not yet confirmed enough to rely on for anything consequential.`,
      });
    }

    // 3b. Confidence cleared the bar and this was a revalidation that
    // genuinely disagrees with the prior answer -- never silently pick one.
    if (priorMatch && research?.consistent_with_prior_finding === false) {
      try {
        await base44.asServiceRole.entities.McareKnowledge.update(priorMatch.id, { verification_status: 'conflicted' });
      } catch (_) { /* best-effort */ }
      let newId: string | null = null;
      try {
        const rec = await base44.asServiceRole.entities.McareKnowledge.create({
          ...baseFields,
          verification_status: 'conflicted',
          recalled_count: 0,
          useful_feedback: 0,
          flagged_for_review: false,
          created_at: nowISO,
          created_by: user?.email || 'mcare_agent',
        });
        newId = rec?.id || null;
      } catch (e) {
        console.error('[mcareResearchAndLearn] conflict save failed', e);
      }
      await flagForReview(base44, {
        subject_type: 'mcare_knowledge_conflict',
        subject_id: priorMatch.id,
        subject_label: question,
        change_type: 'source_changed',
        detail: `A revalidation of a McareKnowledge answer found a conflicting result. Prior: "${priorMatch.answer}". New: "${answer}". ${(research?.conflict_explanation || '').toString()}`,
        detected_via: 'live_check',
        previous_value: priorMatch.answer,
        new_value: answer,
        severity: 'warning',
      });
      return ok({
        success: true,
        source: 'research',
        recalled: false,
        saved: !!newId,
        revalidated: true,
        conflict_detected: true,
        answer,
        confidence_score: confidence,
        accuracy_estimation: accuracyEstimation,
        source_summary: sourceSummary,
        used_tavily: usedTavily,
        knowledge_id: newId,
        threshold: ACCURACY_THRESHOLD,
        verification_status: 'conflicted',
        freshness_tier: freshnessTier,
        is_fresh: false,
        last_verified_at: nowISO,
        next_review_at: nextReviewISO,
        source_url: topSourceUrl,
        source_type: sourceType,
        jurisdiction,
        country,
        note: 'I found conflicting information while re-checking this — the prior answer and this new research disagree, so neither should be presented as certain. This has been flagged for a human review.',
      });
    }

    // 3c. Confidence cleared the bar and this confirms a prior stale
    // answer -- refresh it in place, preserving the old value first.
    if (priorMatch) {
      try {
        await reviseAndUpdate(base44 as any, 'McareKnowledge', priorMatch.id, {
          ...baseFields,
          verification_status: 'corroborated',
        }, { actor: user?.email || 'mcare_agent', reason: 'Revalidation confirmed the prior answer' });
      } catch (e) {
        console.error('[mcareResearchAndLearn] revalidation save failed', e);
      }
      return ok({
        success: true,
        source: 'research',
        recalled: false,
        saved: true,
        revalidated: true,
        conflict_detected: false,
        answer,
        confidence_score: confidence,
        accuracy_estimation: accuracyEstimation,
        source_summary: sourceSummary,
        used_tavily: usedTavily,
        knowledge_id: priorMatch.id,
        threshold: ACCURACY_THRESHOLD,
        verification_status: 'corroborated',
        freshness_tier: freshnessTier,
        is_fresh: true,
        last_verified_at: nowISO,
        next_review_at: nextReviewISO,
        source_url: topSourceUrl,
        source_type: sourceType,
        jurisdiction,
        country,
        note: `Re-checked and confirmed — current information checked on ${nowISO.slice(0, 10)}.`,
      });
    }

    // 3d. Brand-new fact, confidence cleared the bar.
    let knowledge_id: string | null = null;
    let saved = false;
    try {
      const rec = await base44.asServiceRole.entities.McareKnowledge.create({
        ...baseFields,
        verification_status: 'researched',
        recalled_count: 0,
        useful_feedback: 0,
        flagged_for_review: false,
        created_at: nowISO,
        created_by: user?.email || 'mcare_agent',
      });
      saved = true;
      knowledge_id = rec?.id || null;
    } catch (e) {
      // Saving is best-effort — still return the answer to the traveler.
      console.error('[mcareResearchAndLearn] save failed', e);
    }

    return ok({
      success: true,
      source: 'research',
      recalled: false,
      saved,
      revalidated: false,
      conflict_detected: false,
      answer,
      confidence_score: confidence,
      accuracy_estimation: accuracyEstimation,
      source_summary: sourceSummary,
      used_tavily: usedTavily,
      knowledge_id,
      threshold: ACCURACY_THRESHOLD,
      verification_status: 'researched',
      freshness_tier: freshnessTier,
      is_fresh: saved,
      last_verified_at: saved ? nowISO : null,
      next_review_at: saved ? nextReviewISO : null,
      source_url: topSourceUrl,
      source_type: sourceType,
      jurisdiction,
      country,
      note: saved
        ? `Based on research checked on ${nowISO.slice(0, 10)}.`
        : 'Answered; could not save this for reuse just now.',
    });
}, { name: 'mcareResearchAndLearn', requireAuth: false, rateLimit: { max: 8, windowSeconds: 300 } }));
