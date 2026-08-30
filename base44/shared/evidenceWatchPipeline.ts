/**
 * evidenceWatchPipeline — the real logic behind the Medical Evidence Watch
 * pipeline (scan -> analyze -> evaluate), extracted into plain importable
 * async functions so each stage's own entry.ts can be a thin
 * cronAuthorized-gated wrapper (independently triggerable for debugging)
 * AND runEvidenceWatchOrchestrator/entry.ts can call all three in-process
 * with zero extra network hop — matches this repo's established
 * "extract once, thin wrappers call it" pattern (incidentPipelineStages.ts,
 * weatherEngine.ts).
 *
 * Three stages, not four — unlike the sibling Evidence Monitoring
 * (incident) pipeline's separate "propose" step, which drafts a NEW
 * artifact from corroborated evidence, here MedicalDiscovery itself already
 * IS the human-facing review artifact once evaluated. There is nothing
 * separate to draft.
 *
 * Two real cadences share this one pipeline via the `scope` param: 'full'
 * (monthly) runs the 3 real Tier-1 government/research APIs
 * (pubmedAdapter.ts, clinicalTrialsAdapter.ts, openFdaAdapter.ts — all
 * free and keyless) plus Tavily for Tier 2/3 discovery/reporting.
 * 'recalls_only' (weekly) runs just openFDA's device/drug enforcement
 * (recall) endpoints against a narrower query set — "an optional weekly
 * check for regulator recalls and safety alerts," per the spec.
 *
 * THE ONE HARD BOUNDARY: nothing in this file imports, calls, or writes to
 * _shared/safeTEngine.ts, computeSafeT, SafeTScreening, or any of
 * ProcedureKnowledge's clinical fields (risk_level, complication_rate,
 * red_flag_combinations, smoker_warning, common_complications) — even
 * though this pipeline is literally about medical treatments, it never
 * updates a procedure's own risk data or touches the app's deterministic
 * safety-decision engine. It surfaces human-reviewable research
 * observations, nothing more. See tests/redteam/invariants.spec.js's
 * "MEDICAL EVIDENCE WATCH" tests, which pin this structurally.
 */

import { searchPubMed } from './pubmedAdapter.ts';
import { searchClinicalTrials } from './clinicalTrialsAdapter.ts';
import { searchFdaDeviceClearances, searchFdaRecalls } from './openFdaAdapter.ts';
import { searchForProviders } from './providerDiscovery.ts';
import { logExternalSearch } from './logExternalSearch.ts';
import { classifyEvidenceSourceTier, bestTier, type SourceTier, type EvidenceAdapter } from './evidenceSourceTier.ts';
import { computeConfidenceTier, type EvidenceStage } from './evidenceConfidence.ts';
import { containsBannedClaim } from './evidenceLanguageGuard.ts';
import { computeContentHash, truncateToWords } from './incidentTextAnalysis.ts';

export const DEFAULT_EVIDENCE_QUERIES = [
  'dental implant',
  'porcelain veneers',
  'bariatric surgery',
  'joint replacement',
  'rhinoplasty',
  'breast augmentation surgery',
  'IVF fertility treatment',
  'cardiac valve replacement',
];

// A narrower query set for the weekly recalls_only scope — device/drug
// categories matching those same procedure areas.
export const RECALL_QUERIES = [
  'dental implant',
  'breast implant',
  'dermal filler',
  'orthopedic implant',
  'cardiac device',
];

const MAX_ITEMS_PER_STAGE = 200; // safety valve, not the normal operating limit
const PUBMED_COURTESY_DELAY_MS = 400; // courtesy to PubMed's 3 req/sec limit — trivial at this volume either way
const EVIDENCE_STAGES: EvidenceStage[] = [
  'lab_preclinical', 'human_study', 'clinical_trial_recruiting', 'trial_completed',
  'regulator_cleared_approved', 'commercially_available', 'recall_safety_alert',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type StageFailure = { stage: string; url_or_query: string; error_message: string };

type RawItem = {
  title: string;
  url: string;
  snippet: string;
  publisher_domain: string;
  published_at?: string;
  identifier?: string;
  adapter: EvidenceAdapter;
  query: string;
};

// ── Stage 1: scan ────────────────────────────────────────────────────────

export async function runEvidenceScanStage(
  base44: any,
  opts: { runId: string; scope?: 'full' | 'recalls_only' },
): Promise<{ discovered: number; deduped: number; failures: StageFailure[] }> {
  const scope = opts.scope || 'full';
  const failures: StageFailure[] = [];
  let discovered = 0;
  let deduped = 0;

  // Bounded recent set of known content hashes, for near-duplicate detection
  // across repeat queries/runs without re-fetching the whole table per item.
  let recentHashes = new Set<string>();
  try {
    const recent = await base44.asServiceRole.entities.MedicalDiscovery.filter({}, '-created_at', 500);
    recentHashes = new Set((recent as any[]).map((r) => r.content_hash).filter(Boolean));
  } catch (_) { /* start empty — worst case a rare re-discovery, never a crash */ }

  const rawItems: RawItem[] = [];

  if (scope === 'recalls_only') {
    for (const query of RECALL_QUERIES) {
      const [deviceResult, drugResult] = await Promise.all([
        searchFdaRecalls(query, 'device'),
        searchFdaRecalls(query, 'drug'),
      ]);
      for (const result of [deviceResult, drugResult]) {
        await logExternalSearch(base44, {
          query, search_type: 'other', vendor: 'none',
          status: result.supported ? 'success' : 'failed',
          result_count: result.supported ? result.results.length : 0,
          initiated_by: 'scanEvidenceWatch',
        });
        if (!result.supported) { failures.push({ stage: 'scan', url_or_query: query, error_message: result.message }); continue; }
        for (const item of result.results) rawItems.push({ ...item, adapter: 'openfda', query });
      }
    }
  } else {
    // full scope — real Tier-1 government/research APIs, plus Tavily for
    // Tier 2/3 discovery/reporting.
    for (const query of DEFAULT_EVIDENCE_QUERIES) {
      const pubmedResult = await searchPubMed(query);
      await logExternalSearch(base44, {
        query, search_type: 'other', vendor: 'none',
        status: pubmedResult.supported ? 'success' : 'failed',
        result_count: pubmedResult.supported ? pubmedResult.results.length : 0,
        initiated_by: 'scanEvidenceWatch',
      });
      if (pubmedResult.supported) rawItems.push(...pubmedResult.results.map((r) => ({ ...r, adapter: 'pubmed' as const, query })));
      else failures.push({ stage: 'scan', url_or_query: query, error_message: pubmedResult.message });
      await sleep(PUBMED_COURTESY_DELAY_MS);

      const trialsResult = await searchClinicalTrials(query);
      await logExternalSearch(base44, {
        query, search_type: 'other', vendor: 'none',
        status: trialsResult.supported ? 'success' : 'failed',
        result_count: trialsResult.supported ? trialsResult.results.length : 0,
        initiated_by: 'scanEvidenceWatch',
      });
      if (trialsResult.supported) rawItems.push(...trialsResult.results.map((r) => ({ ...r, adapter: 'clinicaltrials' as const, query })));
      else failures.push({ stage: 'scan', url_or_query: query, error_message: trialsResult.message });

      const fdaResult = await searchFdaDeviceClearances(query);
      await logExternalSearch(base44, {
        query, search_type: 'other', vendor: 'none',
        status: fdaResult.supported ? 'success' : 'failed',
        result_count: fdaResult.supported ? fdaResult.results.length : 0,
        initiated_by: 'scanEvidenceWatch',
      });
      if (fdaResult.supported) rawItems.push(...fdaResult.results.map((r) => ({ ...r, adapter: 'openfda' as const, query })));
      else failures.push({ stage: 'scan', url_or_query: query, error_message: fdaResult.message });

      const tavilyResult = await searchForProviders(query);
      await logExternalSearch(base44, {
        query, search_type: 'other', vendor: tavilyResult.supported ? 'tavily' : 'none',
        status: tavilyResult.supported ? 'success' : 'unavailable',
        result_count: tavilyResult.supported ? tavilyResult.results.length : 0,
        initiated_by: 'scanEvidenceWatch',
      });
      if (tavilyResult.supported) {
        for (const r of tavilyResult.results) {
          let domain = '';
          try { domain = new URL(r.url).hostname.replace(/^www\./, ''); } catch (_) { /* leave blank on a malformed URL */ }
          rawItems.push({ title: r.title, url: r.url, snippet: r.snippet, publisher_domain: domain, published_at: r.timestamp, adapter: 'tavily', query });
        }
      } else {
        failures.push({ stage: 'scan', url_or_query: query, error_message: tavilyResult.message });
      }
    }
  }

  for (const item of rawItems) {
    if (discovered + deduped >= MAX_ITEMS_PER_STAGE) break;
    try {
      // Dedupe by exact URL first (check-before-create).
      const existingByUrl = await base44.asServiceRole.entities.MedicalDiscovery.filter({ url: item.url }, '-created_at', 1);
      if (existingByUrl.length > 0) { deduped++; continue; }

      const contentHash = await computeContentHash(item.title, item.snippet);
      if (recentHashes.has(contentHash)) { deduped++; continue; }
      recentHashes.add(contentHash);

      const sourceTier: SourceTier = classifyEvidenceSourceTier(item.adapter, item.publisher_domain);

      await base44.asServiceRole.entities.MedicalDiscovery.create({
        url: item.url,
        title: item.title,
        snippet: truncateToWords(item.snippet || '', 80), // bounded — never the full article/abstract body
        retrieved_at: new Date().toISOString(),
        published_at: item.published_at || '',
        source_query: item.query,
        content_hash: contentHash,
        identifier: item.identifier || '',
        sources: [{ tier: sourceTier, adapter: item.adapter, url: item.url, publisher_domain: item.publisher_domain, retrieved_at: new Date().toISOString() }],
        source_reliability_tier: sourceTier,
        status: 'new',
        created_by_run_id: opts.runId,
        created_at: new Date().toISOString(),
      });
      discovered++;
    } catch (e) {
      failures.push({ stage: 'scan', url_or_query: item.url, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { discovered, deduped, failures };
}

// ── Stage 2: analyze ─────────────────────────────────────────────────────

const ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    condition_or_procedure: { type: 'string', description: "The medical condition or procedure this concerns, or 'unknown' if not stated." },
    device_or_treatment_name: { type: 'string', description: "The specific device, drug, or treatment name, or 'unknown' if not named." },
    country: { type: 'string', description: "The country of the institution, trial, or regulator, or 'unknown' if not stated." },
    institution: { type: 'string', description: "The research institution, hospital, sponsor, or company, or 'unknown' if not named." },
    evidence_stage: { type: 'string', enum: EVIDENCE_STAGES },
    study_size: { type: 'number', description: 'Number of participants/subjects studied, or 0 if not stated.' },
    study_type: { type: 'string', description: "e.g. 'randomized controlled trial', 'case series', 'preclinical animal study', or 'unknown'." },
    plain_language_summary: {
      type: 'string',
      description: 'A short, neutral, factual summary in plain language (2-4 sentences). NEVER use the words "cure", "cures", "fully restores", "breakthrough", "guaranteed", "miracle", "100% effective", "completely safe", "proven safe", "safe and effective", "risk-free", or "no side effects" — regardless of how strong the evidence is, always hedge (e.g. "verify local availability", "availability depends on eligibility").',
    },
    limitations_and_unknowns: { type: 'string', description: 'What is NOT yet known or established about this, in plain language.' },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['condition_or_procedure', 'evidence_stage', 'plain_language_summary', 'confidence'],
};

const ANALYSIS_PROMPT = `You are extracting structured facts from a source about a medical or regulatory development relevant to medical travel (a new treatment, device, clinical trial, approval, or recall). Follow these rules strictly:
- Use "unknown" for any field the text does not explicitly state.
- NEVER infer a fact that is not literally stated in the text.
- NEVER use absolute-claim language anywhere in your summary: no "cure", "cures", "fully restores", "breakthrough", "guaranteed", "miracle", "100% effective", "completely safe", "proven safe", "safe and effective", "risk-free", or "no side effects" — this applies at EVERY evidence stage, including an already regulator-approved device. Always hedge (e.g. "verify local availability", "availability depends on eligibility").
- This is general research information, never a medical recommendation for any specific patient — do not suggest a treatment plan or diagnose anyone.
- Return JSON only, matching the schema.`;

/**
 * Small, deterministic fallback used ONLY when the real LLM extraction call
 * fails. Deliberately minimal — it never guesses evidence_stage beyond the
 * most conservative value, and never fabricates a summary. A row extracted
 * this way is routed to needs_more_evidence by the evaluate stage (never
 * queued_for_review), since a blank/minimal extraction isn't safely
 * reviewable content for something that may end up patient-facing.
 */
function fallbackAnalyzeEvidence(): {
  condition_or_procedure: string; device_or_treatment_name: string; country: string; institution: string;
  evidence_stage: EvidenceStage; study_size: number; study_type: string;
  plain_language_summary: string; limitations_and_unknowns: string; analysis_confidence: number;
} {
  return {
    condition_or_procedure: 'unknown',
    device_or_treatment_name: 'unknown',
    country: 'unknown',
    institution: 'unknown',
    evidence_stage: 'lab_preclinical',
    study_size: 0,
    study_type: 'unknown',
    plain_language_summary: '',
    limitations_and_unknowns: 'Automatic extraction failed for this item — needs manual review before any summary can be shown.',
    analysis_confidence: 5,
  };
}

export async function runEvidenceAnalyzeStage(
  base44: any,
): Promise<{ analyzed: number; analysis_failures: number; failures: StageFailure[] }> {
  const failures: StageFailure[] = [];
  let analyzed = 0;
  let analysis_failures = 0;

  const toAnalyze = await base44.asServiceRole.entities.MedicalDiscovery
    .filter({ status: 'new' }, '-created_at', MAX_ITEMS_PER_STAGE)
    .catch(() => []);
  if (!toAnalyze.length) return { analyzed: 0, analysis_failures: 0, failures };

  for (const row of toAnalyze as any[]) {
    let extracted: any;
    let analysisMethod: 'llm' | 'fallback' = 'llm';
    try {
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: false,
        prompt: `${ANALYSIS_PROMPT}\n\nTitle: """${row.title}"""\nSource excerpt: """${row.snippet || ''}"""`,
        response_json_schema: ANALYSIS_SCHEMA,
      });
      extracted = {
        condition_or_procedure: (llmResult?.condition_or_procedure || 'unknown').toString(),
        device_or_treatment_name: (llmResult?.device_or_treatment_name || 'unknown').toString(),
        country: (llmResult?.country || 'unknown').toString(),
        institution: (llmResult?.institution || 'unknown').toString(),
        evidence_stage: EVIDENCE_STAGES.includes(llmResult?.evidence_stage) ? llmResult.evidence_stage : 'lab_preclinical',
        study_size: Number(llmResult?.study_size || 0),
        study_type: (llmResult?.study_type || 'unknown').toString(),
        plain_language_summary: truncateToWords((llmResult?.plain_language_summary || '').toString(), 120),
        limitations_and_unknowns: (llmResult?.limitations_and_unknowns || '').toString(),
        analysis_confidence: Math.round(Number(llmResult?.confidence || 0)),
      };
    } catch (llmErr) {
      analysisMethod = 'fallback';
      extracted = fallbackAnalyzeEvidence();
      failures.push({ stage: 'analyze', url_or_query: row.url, error_message: llmErr instanceof Error ? llmErr.message : String(llmErr) });
      analysis_failures++;
    }

    try {
      await base44.asServiceRole.entities.MedicalDiscovery.update(row.id, {
        condition_or_procedure: extracted.condition_or_procedure,
        device_or_treatment_name: extracted.device_or_treatment_name,
        country: extracted.country,
        institution: extracted.institution,
        evidence_stage: extracted.evidence_stage,
        study_size: extracted.study_size,
        study_type: extracted.study_type,
        plain_language_summary: extracted.plain_language_summary,
        limitations_and_unknowns: extracted.limitations_and_unknowns,
        analysis_confidence: extracted.analysis_confidence,
        analysis_method: analysisMethod,
        status: 'analyzed',
      });
      analyzed++;
    } catch (e) {
      failures.push({ stage: 'analyze', url_or_query: row.url, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { analyzed, analysis_failures, failures };
}

// ── Stage 3: evaluate ────────────────────────────────────────────────────

export async function runEvidenceEvaluateStage(
  base44: any,
): Promise<{ evaluated: number; queued_for_review: number; failures: StageFailure[] }> {
  const failures: StageFailure[] = [];
  let evaluatedCount = 0;
  let queuedForReview = 0;

  const toEvaluate = await base44.asServiceRole.entities.MedicalDiscovery
    .filter({ status: 'analyzed' }, '-created_at', MAX_ITEMS_PER_STAGE)
    .catch(() => []);
  if (!toEvaluate.length) return { evaluated: 0, queued_for_review: 0, failures };

  for (const row of toEvaluate as any[]) {
    try {
      const sourceTiers: SourceTier[] = Array.isArray(row.sources) && row.sources.length
        ? row.sources.map((s: any) => s.tier).filter(Boolean)
        : [(row.source_reliability_tier as SourceTier) || 'tier_3'];
      const topTier = bestTier(sourceTiers);

      const confidence = computeConfidenceTier(sourceTiers, row.evidence_stage);

      // THE HARD STRUCTURAL GATE — a banned-language hit, or a
      // fallback-only extraction, can never silently reach queued_for_review.
      // Checked here in code, not just relied on from the LLM prompt.
      const hasBannedLanguage = containsBannedClaim(row.plain_language_summary || '') || containsBannedClaim(row.limitations_and_unknowns || '');
      const isFallback = row.analysis_method === 'fallback';
      const nextStatus: string = (hasBannedLanguage || isFallback) ? 'needs_more_evidence' : 'queued_for_review';
      if (nextStatus === 'queued_for_review') queuedForReview++;

      await base44.asServiceRole.entities.MedicalDiscovery.update(row.id, {
        source_reliability_tier: topTier,
        confidence,
        freshness_date: new Date().toISOString(),
        status: nextStatus,
      });
      evaluatedCount++;
    } catch (e) {
      failures.push({ stage: 'evaluate', url_or_query: row.url, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { evaluated: evaluatedCount, queued_for_review: queuedForReview, failures };
}
