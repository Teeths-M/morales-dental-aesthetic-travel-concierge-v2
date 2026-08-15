import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { findBestMatches } from '../../shared/procedureKnowledgeMatch.ts';

// ── getProcedureKnowledge ─────────────────────────────────────────────────────
// Fuzzy lookup into M-Care's ProcedureKnowledge safety knowledge base. Given a
// casual procedure name ("butt lift", "tummy tuck", "dental implants"), returns
// the best matching record(s) with full risk/recovery/complication/qualification
// data PLUS the behavioral protocol M-Care MUST follow: ask medical background
// first, flag risks against that background, never diagnose, include the medical
// disclaimer, and guide to a safe next step. If no match, returns found:false
// with an honest message + a safe next-step so M-Care never leaves the traveler
// stuck.
//
// The fuzzy scorer itself lives in ../../shared/procedureKnowledgeMatch.ts,
// shared with getProcedureRiskSummaries (the bulk lookup behind the public
// procedures catalog page) so the matching logic exists in exactly one place.

Deno.serve(createHandler(async ({ req, base44, body }) => {
    let payload = await body();
    if (!payload?.query) {
      const url = new URL(req.url);
      payload = { query: url.searchParams.get('query'), limit: url.searchParams.get('limit') };
    }
    const query = (payload?.query || '').toString().trim();
    const limit = Math.min(Number(payload?.limit || 3), 10);
    if (!query) {
      return err('query (procedure name) is required');
    }

    // Excludes 'Not Yet Assessed' rows (a picture-only record from
    // generateProcedureIllustrations, no real clinical review yet) — this is
    // the safety-lookup path, it must only ever return a record someone has
    // actually assessed. getProcedureIllustration is the sibling that reads
    // every row with a real image, including these.
    const all: any[] = await base44.asServiceRole.entities.ProcedureKnowledge.list('-updated_at', 400);
    const active = all.filter((r) => r.is_active !== false && r.risk_level !== 'Not Yet Assessed');
    if (active.length === 0) {
      return ok({
        success: true,
        found: false,
        matches: [],
        m_care_protocol,
        message: "I don't have detailed procedure-safety information in my knowledge base yet, but I can help you find a verified specialist who can. Would you like me to do that?",
      });
    }

    const scored = findBestMatches(query, active, { threshold: 0.2, limit });
    const matches = scored.map((r) => ({
      id: r.id,
      procedure_name: r.procedure_name,
      category: r.category,
      description: r.description,
      typical_duration: r.typical_duration,
      recovery_time: r.recovery_time,
      risk_level: r.risk_level,
      risk_factors: r.risk_factors || [],
      complication_rate: r.complication_rate,
      common_complications: r.common_complications || [],
      recommended_qualifications: r.recommended_qualifications,
      pre_op_requirements: r.pre_op_requirements || [],
      red_flag_combinations: r.red_flag_combinations || [],
      smoker_warning: r.smoker_warning,
      questions_to_ask: r.questions_to_ask || [],
      score: r.score,
    }));

    return ok({
      success: true,
      found: matches.length > 0,
      best_score: matches[0]?.score || 0,
      matches,
      m_care_protocol,
      message: matches.length > 0
        ? 'Use this procedure-safety knowledge to guide the traveler.'
        : "I don't have detailed information about that specific procedure yet, but I can help you find a verified specialist who can guide you. Would you like me to do that?",
    });
}, { name: 'getProcedureKnowledge', requireAuth: false }));

// The behavioral protocol M-Care MUST follow whenever it discusses a procedure.
// Returned alongside the data so the agent applies it consistently even when its
// global instructions don't enumerate every step.
const m_care_protocol = {
  rule: 'PROCEDURE INQUIRY PROTOCOL — follow exactly, in order.',
  steps: [
    '0. SHOW A REAL PICTURE FIRST, BOLDLY. Right after a short 1-2 sentence description, include the real illustrative image via the {{media:PROCEDURE_NAME}} token immediately, in this same reply — do not ask permission, do not wait for a yes, do not defer it behind medical background. A generic illustration is never a risk figure, so it is always safe to show right away.',
    '1. ASK MEDICAL BACKGROUND. Before sharing any risk figures or clinical facts (not the general picture/overview you already gave in step 0), ask: "Before I dive into the details, I need to understand your health background. This helps me assess safety and give you the right guidance. Do you have any medical conditions (diabetes, high blood pressure, heart issues, etc.)? Are you on any medications? Have you had any previous surgeries?" Only after the traveler answers may you share risk figures.',
    '2. FLAG RISKS AGAINST THEIR BACKGROUND. Cross-reference the procedure against the traveler\'s disclosed conditions. Call out specific concerns: "Based on what you\'ve shared, I want to flag a few things to be aware of..." and "This procedure carries a higher risk for patients with [condition]. I recommend discussing this with a specialist." If they mention smoking, surface the smoker_warning. If their profile matches a red_flag_combination, state the severity and the required qualification plainly.',
    '3. BE HONEST ABOUT LIMITS. If getProcedureKnowledge returned found:false, first try recallMcareKnowledge then mcareResearchAndLearn (rule 14 — LEARN-AND-RECALL BRAIN) before giving up — a confident (>=80%) researched answer can be shared as general procedure information, clearly labeled as researched rather than from the curated safety database. Only if that also comes up empty or under 80% confident, say: "I don\'t have detailed information about that specific procedure yet, but I can help you find a verified specialist who can guide you. Would you like me to do that?" — do not invent risk data either way.',
    '4. NEVER DIAGNOSE OR RECOMMEND. Every procedure response must include this disclaimer: "I\'m not a doctor — I\'m here to organize information and help you make informed decisions. Always consult a qualified medical professional before proceeding." Never state a patient is "cleared", "safe", or "approved" based on this knowledge base — only the Safe-T4life screening + a clinician decide that.',
    '5. GUIDE TO A SAFE NEXT STEP. Always end a procedure discussion with one clear action, offered via the choices token when closed-set: "Would you like me to help you find a verified specialist for this procedure?" or "Would you like me to prepare a list of questions to ask your surgeon?"',
  ],
  disclaimer: "I'm not a doctor — I'm here to organize information and help you make informed decisions. Always consult a qualified medical professional before proceeding.",
  background_question: "Before I dive into the details, I need to understand your health background. This helps me assess safety and give you the right guidance. Do you have any medical conditions (diabetes, high blood pressure, heart issues, etc.)? Are you on any medications? Have you had any previous surgeries?",
};