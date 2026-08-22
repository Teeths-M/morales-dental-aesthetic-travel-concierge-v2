import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { findBestMatches } from '../../shared/procedureKnowledgeMatch.ts';
import { searchForProviders } from '../../shared/providerDiscovery.ts';
import { logExternalSearch } from '../../shared/logExternalSearch.ts';
import { z, strictObject } from '../../shared/validate.ts';

// ── explainProcedure ──────────────────────────────────────────────────────────
// M-Care's comprehensive, structured patient-education tool. Given a procedure
// name, returns the full 7-block educational content (overview, what happens,
// recovery realities, do's/don'ts, risks/benefits/alternatives, questions to
// ask the doctor, uncertainty notes) so M-Care can give a genuinely complete,
// clinician-quality explanation instead of a thin summary.
//
// This is deliberately a SEPARATE tool from getProcedureKnowledge, not a
// replacement — getProcedureKnowledge stays the safety-curated lookup
// (risk_level, complication_rate, red_flag_combinations, smoker_warning,
// questions_to_ask), permanently admin-write-only per this app's standing
// decision never to invent clinical risk content. explainProcedure only ever
// reads those fields (as anchor context, never rewriting them) and writes to a
// structurally separate set of "education_*"-prefixed narrative fields on the
// same ProcedureKnowledge row — general, population-level patient-education
// content, which Portia has already approved for confidence-gated AI research
// (see getProcedureKnowledge's own protocol step 3).
//
// Pipeline, mirroring mcareResearchAndLearn's proven recall-first /
// Tavily-first / add_context_from_internet-fallback / confidence-gated-persist
// shape, retargeted onto ProcedureKnowledge instead of the generic
// McareKnowledge Q&A cache:
//   1. Fuzzy-match the procedure against ProcedureKnowledge (same matcher +
//      threshold as getProcedureKnowledge).
//   2. Cache hit (education_source already generated, and if ai_researched,
//      confidence >= 80): return the row's education fields directly, no LLM
//      call.
//   3. Miss / ungenerated / low-confidence: research via Tavily first, LLM
//      structured-schema fallback second, seeded with whatever curated safety
//      fields already exist as anchor context the LLM must not contradict or
//      restate as newly discovered.
//   4. Persist (upsert, or create a new row with risk_level:'Not Yet
//      Assessed' if none existed) only when confidence >= 80, and NEVER
//      including risk_level/complication_rate/red_flag_combinations/
//      smoker_warning/common_complications in the write payload — that
//      boundary is structural here, not just descriptive, and is
//      redteam-checked.
//
// depth/focus are presentation hints for the agent, not separate fetch modes:
// the function always returns the full structured content in one call, so a
// follow-up question ("more on recovery", "what about alternatives") never
// needs a second round trip — the agent just re-narrates from fields it
// already has in context.

const EDUCATION_CONFIDENCE_THRESHOLD = 80; // matches mcareResearchAndLearn's ACCURACY_THRESHOLD convention

const bodySchema = strictObject({
  procedure_name: z.string().trim().min(1, 'Required').max(200),
  depth: z.enum(['overview', 'full']).optional(),
  focus: z.array(z.string()).max(10).optional(),
});

const EDUCATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    overview: {
      type: 'object',
      properties: {
        what_it_is: { type: 'string', description: 'Plain-language explanation of what the procedure actually is' },
        recommended_for: { type: 'string', description: 'Who this is typically recommended for, in general terms' },
        not_recommended_for: { type: 'string', description: 'Who this is typically NOT recommended for, in general terms' },
      },
      required: ['what_it_is'],
    },
    what_happens: {
      type: 'object',
      properties: {
        before: { type: 'string' },
        during: { type: 'string' },
        after: { type: 'string' },
        anesthesia_info: { type: 'string', description: 'Whether/what type of anesthesia or sedation is typically used and what it generally feels like' },
        room_time_typical: { type: 'string', description: "e.g. '45-90 minutes' - always hedged as typical, never a guarantee" },
        total_visit_time_typical: { type: 'string' },
      },
      required: ['before', 'during', 'after'],
    },
    recovery: {
      type: 'object',
      properties: {
        success_satisfaction_range: { type: 'string', description: 'Honestly hedged general range, e.g. "typically 85-95%, varies by technique and provider"' },
        common_side_effects: { type: 'array', items: { type: 'string' } },
        side_effect_duration: { type: 'string' },
        warning_signs: { type: 'array', items: { type: 'string' }, description: 'Signs that require immediate medical attention' },
        activity_restrictions: { type: 'string' },
        normal_life_resumes: { type: 'string' },
      },
      required: ['warning_signs'],
    },
    dos_and_donts: {
      type: 'object',
      properties: {
        pre_procedure: { type: 'array', items: { type: 'string' } },
        post_procedure_dos: { type: 'array', items: { type: 'string' } },
        post_procedure_donts: { type: 'array', items: { type: 'string' } },
        common_mistakes: { type: 'array', items: { type: 'string' } },
      },
      required: [],
    },
    risks_benefits_alternatives: {
      type: 'object',
      properties: {
        main_benefits: { type: 'array', items: { type: 'string' } },
        main_risks_and_complications: { type: 'array', items: { type: 'string' }, description: 'General/population-level, including rare-but-serious ones. Narrative only - never a substitute for the curated complication_rate/red_flag_combinations fields.' },
        common_alternatives: { type: 'array', items: { type: 'string' } },
        alternative_guidance: { type: 'string' },
      },
      required: [],
    },
    questions_for_doctor: { type: 'array', items: { type: 'string' }, description: 'Only used to fill a gap when the curated questions_to_ask list is empty' },
    uncertainty_notes: { type: 'string', description: 'What genuinely varies by region, clinic, or technique for this procedure' },
    confidence_score: { type: 'number', minimum: 0, maximum: 100, description: 'Self-estimated accuracy/confidence 0-100. Only >=80 should be treated as reliable enough to persist.' },
    source_summary: { type: 'string' },
  },
  required: ['overview', 'what_happens', 'recovery', 'confidence_score'],
};

function normalizeArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function eduFieldsFromRecord(r: any) {
  return {
    overview_what_it_is: r.overview_what_it_is || '',
    overview_recommended_for: r.overview_recommended_for || '',
    overview_not_recommended_for: r.overview_not_recommended_for || '',
    what_happens_before: r.what_happens_before || '',
    what_happens_during: r.what_happens_during || '',
    what_happens_after: r.what_happens_after || '',
    anesthesia_info: r.anesthesia_info || '',
    room_time_typical: r.room_time_typical || '',
    total_visit_time_typical: r.total_visit_time_typical || '',
    success_satisfaction_range: r.success_satisfaction_range || '',
    side_effect_duration: r.side_effect_duration || '',
    warning_signs: r.warning_signs || [],
    activity_restrictions: r.activity_restrictions || '',
    normal_life_resumes: r.normal_life_resumes || '',
    pre_procedure_instructions: r.pre_procedure_instructions || [],
    post_procedure_dos: r.post_procedure_dos || [],
    post_procedure_donts: r.post_procedure_donts || [],
    common_patient_mistakes: r.common_patient_mistakes || [],
    main_benefits: r.main_benefits || [],
    common_alternatives: r.common_alternatives || [],
    alternative_guidance: r.alternative_guidance || '',
    questions_to_ask: r.questions_to_ask || [],
    // Curated, safety-tier fields — read-only anchor context, never written by this function.
    risk_level: r.risk_level && r.risk_level !== 'Not Yet Assessed' ? r.risk_level : null,
    complication_rate: r.complication_rate || null,
    common_complications: r.common_complications || [],
    recovery_time: r.recovery_time || '',
  };
}

Deno.serve(createHandler(async ({ base44, body }) => {
  const payload: any = await body();
  const query = (payload.procedure_name || '').toString().trim();
  const depth = payload.depth;
  const focus = payload.focus;

  const all: any[] = await base44.asServiceRole.entities.ProcedureKnowledge.list('-updated_at', 400);
  const active = all.filter((r) => r.is_active !== false);
  const matched = findBestMatches(query, active, { threshold: 0.2, limit: 1 })[0] || null;

  // ── Cache hit: education content already generated and trustworthy ────────
  const hasUsableEducation = matched
    && matched.education_source
    && matched.education_source !== 'not_yet_generated'
    && (matched.education_source !== 'ai_researched' || (matched.education_confidence_score ?? 0) >= EDUCATION_CONFIDENCE_THRESHOLD);

  if (hasUsableEducation) {
    return ok({
      success: true,
      procedure_name: matched.procedure_name,
      source: 'cache',
      education_source: matched.education_source,
      confidence_score: matched.education_confidence_score ?? 100,
      uncertainty_notes: matched.education_uncertainty_notes || '',
      depth: depth || 'full',
      focus: focus || [],
      ...eduFieldsFromRecord(matched),
      message: 'Comprehensive procedure education, from M-Care\'s knowledge base.',
    });
  }

  // ── Research: Tavily first, LLM structured-schema fallback second ─────────
  const researchQuery = `${query} procedure: what it involves, how it is done, typical recovery timeline, common risks and complications, benefits, alternatives, and what patients should know before and after`;
  const tavilyResult = await searchForProviders(researchQuery);
  await logExternalSearch(base44, {
    query: researchQuery,
    search_type: 'procedure',
    vendor: tavilyResult.supported ? 'tavily' : 'none',
    status: tavilyResult.supported ? 'success' : 'unavailable',
    result_count: tavilyResult.supported ? tavilyResult.results.length : 0,
    initiated_by: 'explainProcedure',
  });
  const usedTavily = tavilyResult.supported && tavilyResult.results.length > 0;
  const sourceContext = usedTavily
    ? `\n\nReal web search results to ground your answer - cite what's relevant, ignore what isn't:\n${(tavilyResult as any).results.map((r: any, i: number) => `${i + 1}. ${r.title} (${r.url}): ${r.snippet}`).join('\n')}`
    : '';

  const anchorContext = matched
    ? `\n\nKnown curated safety facts for this procedure - do not contradict these, do not restate them as if newly discovered, only fill in the general education content around them:\n`
      + (matched.risk_level && matched.risk_level !== 'Not Yet Assessed' ? `- Risk level: ${matched.risk_level}\n` : '')
      + (matched.complication_rate ? `- Complication rate: ${matched.complication_rate}\n` : '')
      + (matched.smoker_warning ? `- Smoker warning: ${matched.smoker_warning}\n` : '')
      + ((matched.red_flag_combinations || []).length ? `- Red-flag combinations: ${matched.red_flag_combinations.map((c: any) => c.combination).join('; ')}\n` : '')
    : '';

  const prompt = `You are a careful, experienced clinician-educator writing patient-education content for a medical tourism concierge (M-Care). Write comprehensive, honest, calm, non-alarming, non-pushy general patient education for the procedure below. Rules:
- General, population-level information only - never a personalized diagnosis, prescription, or individualized risk assessment for one specific patient.
- Be comprehensive and specific (typical durations, real general risk/benefit categories, real alternatives) but always hedge numeric ranges as typical/varies - never present a number as guaranteed for any one patient.
- Never invent a "cleared", "safe", "approved", or guaranteed-outcome claim.
- Cover rare-but-serious risks honestly alongside common ones - do not over-reassure and do not fear-monger.
- If something genuinely varies a lot by region, clinic, or technique, say so plainly in uncertainty_notes rather than picking one number.
- Estimate your confidence (0-100) honestly. Below 80 means this should not be treated as reliable enough to memorize.
- Return JSON only, matching the schema.

Procedure: """${query}"""${anchorContext}${sourceContext}`;

  let research: any;
  try {
    research = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: !usedTavily,
      prompt,
      response_json_schema: EDUCATION_SCHEMA,
    });
  } catch (llmErr) {
    return Response.json({ error: 'Research service unavailable right now.', detail: String(llmErr) }, { status: 503 });
  }

  const confidence = Math.round(Number(research?.confidence_score || 0));
  if (!research?.overview?.what_it_is) {
    return err('Research returned no usable content.', 502);
  }

  const overview = research.overview || {};
  const whatHappens = research.what_happens || {};
  const recovery = research.recovery || {};
  const dos = research.dos_and_donts || {};
  const rba = research.risks_benefits_alternatives || {};

  const educationFields = {
    overview_what_it_is: overview.what_it_is || '',
    overview_recommended_for: overview.recommended_for || '',
    overview_not_recommended_for: overview.not_recommended_for || '',
    what_happens_before: whatHappens.before || '',
    what_happens_during: whatHappens.during || '',
    what_happens_after: whatHappens.after || '',
    anesthesia_info: whatHappens.anesthesia_info || '',
    room_time_typical: whatHappens.room_time_typical || '',
    total_visit_time_typical: whatHappens.total_visit_time_typical || '',
    success_satisfaction_range: recovery.success_satisfaction_range || '',
    side_effect_duration: recovery.side_effect_duration || '',
    warning_signs: normalizeArray(recovery.warning_signs),
    activity_restrictions: recovery.activity_restrictions || '',
    normal_life_resumes: recovery.normal_life_resumes || '',
    pre_procedure_instructions: normalizeArray(dos.pre_procedure),
    post_procedure_dos: normalizeArray(dos.post_procedure_dos),
    post_procedure_donts: normalizeArray(dos.post_procedure_donts),
    common_patient_mistakes: normalizeArray(dos.common_mistakes),
    main_benefits: normalizeArray(rba.main_benefits),
    common_alternatives: normalizeArray(rba.common_alternatives),
    alternative_guidance: rba.alternative_guidance || '',
  };
  const researchedQuestions = normalizeArray(research.questions_for_doctor);
  const uncertaintyNotes = (research.uncertainty_notes || '').toString();

  // ── Persist only when confident. NEVER writes risk_level / complication_rate /
  // red_flag_combinations / smoker_warning / common_complications - those stay
  // permanently admin-write-only, structurally excluded from this payload. ────
  let persisted = false;
  if (confidence >= EDUCATION_CONFIDENCE_THRESHOLD) {
    const writePayload: Record<string, unknown> = {
      ...educationFields,
      education_source: 'ai_researched',
      education_confidence_score: confidence,
      education_updated_at: new Date().toISOString(),
      education_uncertainty_notes: uncertaintyNotes,
    };
    // Only fill questions_to_ask if the curated list is genuinely empty.
    if (matched && (!matched.questions_to_ask || matched.questions_to_ask.length === 0) && researchedQuestions.length) {
      writePayload.questions_to_ask = researchedQuestions;
    }
    try {
      if (matched) {
        await base44.asServiceRole.entities.ProcedureKnowledge.update(matched.id, writePayload);
      } else {
        await base44.asServiceRole.entities.ProcedureKnowledge.create({
          procedure_name: query,
          category: 'Other',
          risk_level: 'Not Yet Assessed',
          is_active: true,
          questions_to_ask: researchedQuestions,
          updated_at: new Date().toISOString(),
          ...writePayload,
        });
      }
      persisted = true;
    } catch (e) {
      console.error('[explainProcedure] persist failed', e);
    }
  }

  return ok({
    success: true,
    procedure_name: matched?.procedure_name || query,
    source: 'research',
    education_source: 'ai_researched',
    confidence_score: confidence,
    threshold: EDUCATION_CONFIDENCE_THRESHOLD,
    persisted,
    uncertainty_notes: uncertaintyNotes,
    depth: depth || 'full',
    focus: focus || [],
    ...educationFields,
    questions_to_ask: (matched?.questions_to_ask && matched.questions_to_ask.length ? matched.questions_to_ask : researchedQuestions),
    risk_level: matched?.risk_level && matched.risk_level !== 'Not Yet Assessed' ? matched.risk_level : null,
    complication_rate: matched?.complication_rate || null,
    common_complications: matched?.common_complications || [],
    recovery_time: matched?.recovery_time || '',
    message: confidence >= EDUCATION_CONFIDENCE_THRESHOLD
      ? 'Comprehensive procedure education, researched and saved for next time.'
      : `Comprehensive procedure education, but confidence (${confidence}%) is below the ${EDUCATION_CONFIDENCE_THRESHOLD}% threshold - present it honestly as less certain, and it was not saved to the knowledge base.`,
  });
}, { name: 'explainProcedure', requireAuth: false, rateLimit: { max: 8, windowSeconds: 300 }, bodySchema }));
