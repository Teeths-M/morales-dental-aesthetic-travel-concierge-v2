/**
 * incidentPipelineStages — the real logic behind the Evidence Monitoring
 * pipeline (scan -> analyze -> evaluate -> propose), extracted into plain
 * importable async functions so each stage's own entry.ts can be a thin
 * cronAuthorized-gated wrapper (independently triggerable for debugging)
 * AND runIncidentEvidenceOrchestrator/entry.ts can call all four in-process
 * with zero extra network hop — matches this repo's established
 * "extract once, thin wrappers call it" pattern (weatherEngine.ts /
 * checkWeatherAlerts / checkJourneyWeather).
 *
 * At a monthly cadence, one run's raw volume is small (4 queries x up to 10
 * results = <=40 raw hits before dedup) — well within a single function's
 * execution budget. Every stage processes its FULL current backlog in one
 * pass rather than a small capped slice with "leftover rolls to next tick"
 * — a partial batch left over for a month would be real staleness, not a
 * minor inefficiency. A generous cap (MAX_ITEMS_PER_STAGE) still exists
 * purely as a safety valve against a genuinely abnormal run.
 *
 * THE ONE HARD BOUNDARY: nothing in this file imports, calls, or writes to
 * _shared/safeTEngine.ts, computeSafeT, SafeTScreening, or
 * ProcedureKnowledge.risk_level. This pipeline proposes human-reviewable
 * observations — it never diagnoses a patient, never auto-blocks a clinic,
 * and never touches the app's deterministic safety-decision engine. See
 * tests/redteam/invariants.spec.js's "EVIDENCE MONITORING" tests, which pin
 * this structurally, not just by convention.
 */

import { searchForProviders } from './providerDiscovery.ts';
import { logExternalSearch } from './logExternalSearch.ts';
import { classifySourceReliability, computeCorroborationEligibility, type SourceReliabilityTier } from './incidentSourceQuality.ts';
import { computeContentHash, truncateToWords, fallbackAnalyze } from './incidentTextAnalysis.ts';
import { isLikelyKnownProvider, DUPLICATE_MATCH_THRESHOLD, type KnownProviderSignature } from './providerCandidateMatch.ts';
import { PARTNER_TYPE_CONFIG, partnerDisplayName, type PartnerType } from './partnerTypeConfig.ts';

export const DEFAULT_INCIDENT_QUERIES = [
  'medical tourism death',
  'plastic surgery complication',
  'patient died abroad surgery',
  'medical tourism lawsuit',
];

const MAX_ITEMS_PER_STAGE = 200; // safety valve, not the normal operating limit
const MAX_EVIDENCE_QUOTE_WORDS = 25;
const MIN_PARTNER_MATCH_CONFIDENCE = Math.round(DUPLICATE_MATCH_THRESHOLD * 100); // 55

export type StageFailure = { stage: string; url_or_query: string; error_message: string };

// ── Stage 1: scan ────────────────────────────────────────────────────────

export async function runScanStage(
  base44: any,
  opts: { runId: string; queries?: string[] },
): Promise<{ discovered: number; deduped: number; failures: StageFailure[] }> {
  const queries = opts.queries?.length ? opts.queries : DEFAULT_INCIDENT_QUERIES;
  const failures: StageFailure[] = [];
  let discovered = 0;
  let deduped = 0;

  // Bounded recent set of known content hashes, for near-duplicate detection
  // across repeat queries/months without re-fetching the whole table per item.
  let recentHashes = new Set<string>();
  try {
    const recent = await base44.asServiceRole.entities.IncidentCandidate.filter({}, '-created_at', 500);
    recentHashes = new Set((recent as any[]).map((r) => r.content_hash).filter(Boolean));
  } catch (_) { /* start empty — worst case a rare re-discovery, never a crash */ }

  for (const query of queries) {
    const result = await searchForProviders(query);
    await logExternalSearch(base44, {
      query,
      search_type: 'other',
      vendor: result.supported ? 'tavily' : 'none',
      status: result.supported ? 'success' : 'unavailable',
      result_count: result.supported ? result.results.length : 0,
      initiated_by: 'scanIncidentEvidence',
    });

    if (!result.supported) {
      failures.push({ stage: 'scan', url_or_query: query, error_message: result.message });
      continue;
    }

    for (const item of result.results) {
      if (discovered + deduped >= MAX_ITEMS_PER_STAGE) break;
      try {
        // Dedupe by exact URL first (check-before-create).
        const existingByUrl = await base44.asServiceRole.entities.IncidentCandidate.filter({ url: item.url }, '-created_at', 1);
        if (existingByUrl.length > 0) {
          deduped++;
          continue;
        }

        const contentHash = await computeContentHash(item.title, item.snippet);
        if (recentHashes.has(contentHash)) {
          deduped++;
          continue;
        }
        recentHashes.add(contentHash);

        let publisherDomain = '';
        try {
          publisherDomain = new URL(item.url).hostname.replace(/^www\./, '');
        } catch (_) { /* leave blank on a malformed URL */ }

        await base44.asServiceRole.entities.IncidentCandidate.create({
          url: item.url,
          title: item.title,
          snippet: truncateToWords(item.snippet, 80), // bounded — never the full article body
          publisher_domain: publisherDomain,
          retrieved_at: item.timestamp,
          language: 'en',
          source_query: query,
          content_hash: contentHash,
          status: 'new',
          created_by_run_id: opts.runId,
          created_at: new Date().toISOString(),
        });
        discovered++;
      } catch (e) {
        failures.push({ stage: 'scan', url_or_query: item.url, error_message: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return { discovered, deduped, failures };
}

// ── Stage 2: analyze ─────────────────────────────────────────────────────

const ANALYSIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    incident_type: { type: 'string', enum: ['death', 'complication', 'legal_action', 'other', 'unknown'] },
    procedure_type: { type: 'string', description: "The medical/dental/cosmetic procedure the article describes, or 'unknown' if not stated." },
    destination_country: { type: 'string', description: "The country the incident took place in, or 'unknown' if not stated." },
    provider_or_clinic_mentioned: { type: 'string', description: "The clinic or provider name exactly as named in the article, or 'unknown' if none is named." },
    reported_outcome: { type: 'string', description: 'What the article reports happened, in plain factual terms.' },
    risk_factors_mentioned: { type: 'array', items: { type: 'string' } },
    evidence_quotes: { type: 'array', items: { type: 'string' }, description: 'Short direct quotes from the article, each under 25 words.' },
    is_allegation: { type: 'boolean', description: 'True unless the article reports a fully adjudicated/settled legal outcome.' },
    missing_information: { type: 'array', items: { type: 'string' }, description: 'What could not be determined from the article.' },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['incident_type', 'procedure_type', 'destination_country', 'provider_or_clinic_mentioned', 'reported_outcome', 'is_allegation', 'confidence'],
};

const ANALYSIS_PROMPT = `You are extracting structured facts from a public news article snippet about a possible medical-tourism safety incident. Follow these rules strictly:
- Use "unknown" for any field the text does not explicitly state.
- NEVER infer a patient's age, a clinic's legal responsibility, a specific cause of death, or any medical fact not literally stated in the text.
- This is a public news report, not a medical record — do not diagnose or speculate.
- Quote only short, direct excerpts (each under 25 words).
- Return JSON only, matching the schema.`;

async function buildKnownPartnerSignatures(base44: any): Promise<KnownProviderSignature[]> {
  const signatures: KnownProviderSignature[] = [];
  for (const partnerType of Object.keys(PARTNER_TYPE_CONFIG) as PartnerType[]) {
    const cfg = PARTNER_TYPE_CONFIG[partnerType];
    try {
      const rows = await base44.asServiceRole.entities[cfg.entity].filter({}, '-created_date', 300);
      for (const p of rows as any[]) {
        signatures.push({
          id: p.id,
          partner_type: partnerType,
          name: partnerDisplayName(cfg, p),
          city: cfg.cityField ? p[cfg.cityField] : undefined,
          country: p[cfg.countryField],
        });
      }
    } catch (_) { /* one partner type failing to load must never block the others */ }
  }
  return signatures;
}

export async function runAnalyzeStage(
  base44: any,
): Promise<{ analyzed: number; analysis_failures: number; failures: StageFailure[] }> {
  const failures: StageFailure[] = [];
  let analyzed = 0;
  let analysis_failures = 0;

  const toAnalyze = await base44.asServiceRole.entities.IncidentCandidate
    .filter({ status: 'new' }, '-created_at', MAX_ITEMS_PER_STAGE)
    .catch(() => []);
  if (!toAnalyze.length) return { analyzed: 0, analysis_failures: 0, failures };

  const knownSignatures = await buildKnownPartnerSignatures(base44);

  for (const row of toAnalyze as any[]) {
    let extracted: any = null;
    let analysisMethod: 'llm' | 'fallback' = 'llm';
    try {
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        add_context_from_internet: false,
        prompt: `${ANALYSIS_PROMPT}\n\nArticle title: """${row.title}"""\nArticle snippet: """${row.snippet}"""`,
        response_json_schema: ANALYSIS_SCHEMA,
      });
      extracted = {
        incident_type: llmResult?.incident_type || 'unknown',
        procedure_type: (llmResult?.procedure_type || 'unknown').toString(),
        destination_country: (llmResult?.destination_country || 'unknown').toString(),
        provider_or_clinic_mentioned: (llmResult?.provider_or_clinic_mentioned || 'unknown').toString(),
        reported_outcome: (llmResult?.reported_outcome || 'unknown').toString(),
        risk_factors_mentioned: Array.isArray(llmResult?.risk_factors_mentioned) ? llmResult.risk_factors_mentioned.map((s: any) => String(s)) : [],
        evidence_quotes: Array.isArray(llmResult?.evidence_quotes)
          ? llmResult.evidence_quotes.slice(0, 5).map((q: any) => truncateToWords(String(q), MAX_EVIDENCE_QUOTE_WORDS))
          : [],
        is_allegation: llmResult?.is_allegation !== false,
        missing_information: Array.isArray(llmResult?.missing_information) ? llmResult.missing_information.map((s: any) => String(s)) : [],
        analysis_confidence: Math.round(Number(llmResult?.confidence || 0)),
      };
    } catch (llmErr) {
      // Deterministic fallback — never a second LLM attempt, always low confidence.
      analysisMethod = 'fallback';
      const fb = fallbackAnalyze(row.title, row.snippet);
      extracted = fb;
      failures.push({ stage: 'analyze', url_or_query: row.url, error_message: llmErr instanceof Error ? llmErr.message : String(llmErr) });
      analysis_failures++;
    }

    // Provider-mention resolution — always capped, never auto-trusted. Reuses
    // providerCandidateMatch.ts's own scorer/threshold, no duplicate logic.
    let matched_partner_type: string | undefined;
    let matched_partner_id: string | undefined;
    let match_confidence = 0;
    if (extracted.provider_or_clinic_mentioned && extracted.provider_or_clinic_mentioned !== 'unknown') {
      const match = isLikelyKnownProvider(
        { title: extracted.provider_or_clinic_mentioned, snippet: extracted.reported_outcome || '' },
        knownSignatures,
      );
      match_confidence = Math.round(match.score * 100);
      if (match.matched && match.provider) {
        matched_partner_type = match.provider.partner_type;
        matched_partner_id = match.provider.id;
      }
    }

    try {
      await base44.asServiceRole.entities.IncidentCandidate.update(row.id, {
        incident_type: extracted.incident_type,
        procedure_type: extracted.procedure_type,
        destination_country: extracted.destination_country,
        provider_or_clinic_mentioned: extracted.provider_or_clinic_mentioned,
        reported_outcome: extracted.reported_outcome,
        risk_factors_mentioned: extracted.risk_factors_mentioned,
        evidence_quotes: extracted.evidence_quotes,
        is_allegation: extracted.is_allegation,
        missing_information: extracted.missing_information,
        analysis_confidence: extracted.analysis_confidence,
        analysis_method: analysisMethod,
        matched_partner_type,
        matched_partner_id,
        match_confidence,
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

/** Deterministic "is this describing the same real-world story" check. */
function sameStory(a: any, b: any): boolean {
  if (a.content_hash && b.content_hash && a.content_hash === b.content_hash) return true;
  const fieldsKnown = (r: any) => r.incident_type !== 'unknown' && r.destination_country !== 'unknown' && r.procedure_type !== 'unknown';
  if (!fieldsKnown(a) || !fieldsKnown(b)) return false;
  return a.incident_type === b.incident_type && a.destination_country === b.destination_country && a.procedure_type === b.procedure_type;
}

export async function runEvaluateStage(
  base44: any,
): Promise<{ evaluated: number; failures: StageFailure[] }> {
  const failures: StageFailure[] = [];
  let evaluatedCount = 0;

  const toEvaluate = await base44.asServiceRole.entities.IncidentCandidate
    .filter({ status: 'analyzed' }, '-created_at', MAX_ITEMS_PER_STAGE)
    .catch(() => []);
  if (!toEvaluate.length) return { evaluated: 0, failures };

  // Read-only reference pool — includes older already-evaluated/proposed
  // rows so a freshly-analyzed row can corroborate against real history,
  // but this stage only ever WRITES to rows currently in toEvaluate.
  let pool: any[] = [];
  try {
    const [evaluated, proposed] = await Promise.all([
      base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'evaluated' }, '-created_at', 300),
      base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'proposed_rule_created' }, '-created_at', 300),
    ]);
    pool = [...toEvaluate, ...evaluated, ...proposed];
  } catch (_) {
    pool = [...toEvaluate];
  }

  for (const row of toEvaluate as any[]) {
    try {
      const source_reliability_tier: SourceReliabilityTier = classifySourceReliability(row.publisher_domain);

      const matches = pool.filter((other) => other.id !== row.id && sameStory(row, other));

      let corroboration_status: 'single_source_unverified' | 'corroborated' | 'conflicting' = 'single_source_unverified';
      let corroborating_candidate_ids: string[] = [];

      if (matches.length > 0) {
        // Same-content-hash matches disagreeing on incident_type is a cheap,
        // deterministic sign of extraction disagreement — flag, never
        // silently pick one.
        const exactTextMatches = matches.filter((m) => m.content_hash === row.content_hash);
        const conflicting = exactTextMatches.some((m) => m.incident_type && m.incident_type !== 'unknown' && m.incident_type !== row.incident_type);

        if (conflicting) {
          corroboration_status = 'conflicting';
          corroborating_candidate_ids = matches.map((m) => m.id);
        } else {
          const sources = [
            { domain: row.publisher_domain, tier: source_reliability_tier },
            ...matches.map((m) => ({
              domain: m.publisher_domain,
              tier: (m.source_reliability_tier as SourceReliabilityTier) || classifySourceReliability(m.publisher_domain),
            })),
          ];
          if (computeCorroborationEligibility(sources)) {
            corroboration_status = 'corroborated';
            corroborating_candidate_ids = matches.map((m) => m.id);
          }
        }
      }

      await base44.asServiceRole.entities.IncidentCandidate.update(row.id, {
        source_reliability_tier,
        corroboration_status,
        corroborating_candidate_ids,
        status: 'evaluated',
      });
      evaluatedCount++;
    } catch (e) {
      failures.push({ stage: 'evaluate', url_or_query: row.url, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { evaluated: evaluatedCount, failures };
}

// ── Stage 4: propose ─────────────────────────────────────────────────────

const RULE_DRAFT_SCHEMA = {
  type: 'object' as const,
  properties: {
    rule_text: { type: 'string', description: 'A plain-language observation for a qualified clinician to review — never a numeric threshold, never phrased as an already-active policy, never a specific age/clinic verdict.' },
    rule_category: { type: 'string', enum: ['procedure_combination_risk', 'destination_risk', 'provider_risk', 'general_advisory'] },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['rule_text', 'rule_category', 'confidence'],
};

const RULE_DRAFT_PROMPT = `You are drafting a REVIEW PROMPT for a qualified clinician, based on corroborated public incident reports about medical tourism. This is NOT a rule the system will apply automatically — it is a suggestion for a human to consider. Rules:
- Never state a numeric age cutoff, a specific clinic verdict, or a diagnosis.
- Phrase it as something worth a clinician's attention, not an established fact.
- Be concise and plain-language.
- Return JSON only, matching the schema.`;

async function findExistingReviewTask(base44: any, matched_partner_id: string): Promise<any | null> {
  try {
    const rows = await base44.asServiceRole.entities.ProviderSafetyReviewTask.filter({ matched_partner_id }, '-created_at', 20);
    return (rows as any[]).find((t) => t.status === 'open' || t.status === 'in_review') || null;
  } catch (_) {
    return null;
  }
}

async function findExistingRuleForGroupmate(base44: any, groupIds: string[]): Promise<any | null> {
  if (!groupIds.length) return null;
  try {
    const recent = await base44.asServiceRole.entities.ProposedSafetyRule.filter({}, '-created_at', 200);
    return (recent as any[]).find((r) => Array.isArray(r.evidence_incident_ids) && r.evidence_incident_ids.some((id: string) => groupIds.includes(id))) || null;
  } catch (_) {
    return null;
  }
}

export async function runProposeStage(
  base44: any,
): Promise<{ rules_proposed: number; review_tasks_created: number; failures: StageFailure[] }> {
  const failures: StageFailure[] = [];
  let rules_proposed = 0;
  let review_tasks_created = 0;

  // Never acts on single_source_unverified alone — gated in the query
  // itself, not just by prompt wording.
  const [corroborated, conflicting] = await Promise.all([
    base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'evaluated', corroboration_status: 'corroborated' }, '-created_at', MAX_ITEMS_PER_STAGE).catch(() => []),
    base44.asServiceRole.entities.IncidentCandidate.filter({ status: 'evaluated', corroboration_status: 'conflicting' }, '-created_at', MAX_ITEMS_PER_STAGE).catch(() => []),
  ]);
  const actionable = [...corroborated, ...conflicting];
  if (!actionable.length) return { rules_proposed: 0, review_tasks_created: 0, failures };

  // 4a. Provider safety review tasks — only when >=2 DISTINCT corroborated
  // incidents share the same, real, high-confidence matched partner.
  const byPartner = new Map<string, any[]>();
  for (const row of actionable) {
    if (row.corroboration_status !== 'corroborated') continue; // conflicting evidence never singles out a partner
    if (!row.matched_partner_id || (row.match_confidence || 0) < MIN_PARTNER_MATCH_CONFIDENCE) continue;
    const list = byPartner.get(row.matched_partner_id) || [];
    list.push(row);
    byPartner.set(row.matched_partner_id, list);
  }
  for (const [partnerId, rows] of byPartner.entries()) {
    if (rows.length < 2) continue;
    try {
      const existing = await findExistingReviewTask(base44, partnerId);
      const incidentIds = Array.from(new Set(rows.map((r) => r.id)));
      if (existing) {
        const merged = Array.from(new Set([...(existing.incident_ids || []), ...incidentIds]));
        await base44.asServiceRole.entities.ProviderSafetyReviewTask.update(existing.id, {
          incident_ids: merged,
          updated_at: new Date().toISOString(),
        });
      } else {
        const priority = rows.some((r) => r.incident_type === 'death') ? 'high' : 'medium';
        const nowISO = new Date().toISOString();
        await base44.asServiceRole.entities.ProviderSafetyReviewTask.create({
          matched_partner_type: rows[0].matched_partner_type,
          matched_partner_id: partnerId,
          matched_partner_name_as_reported: rows[0].provider_or_clinic_mentioned,
          match_confidence: Math.max(...rows.map((r) => r.match_confidence || 0)),
          incident_ids: incidentIds,
          status: 'open',
          priority,
          evidence_summary: {
            incident_count: rows.length,
            incident_types: Array.from(new Set(rows.map((r) => r.incident_type))),
            source_reliability_tiers: Array.from(new Set(rows.map((r) => r.source_reliability_tier))),
          },
          sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: nowISO,
          updated_at: nowISO,
        });
        review_tasks_created++;
      }
    } catch (e) {
      failures.push({ stage: 'propose', url_or_query: partnerId, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  // 4b. Draft (or reuse) a ProposedSafetyRule per real story group.
  for (const row of actionable) {
    try {
      const groupIds = Array.from(new Set([row.id, ...(row.corroborating_candidate_ids || [])]));
      const existingRule = await findExistingRuleForGroupmate(base44, row.corroborating_candidate_ids || []);
      if (existingRule) {
        const merged = Array.from(new Set([...(existingRule.evidence_incident_ids || []), row.id]));
        await base44.asServiceRole.entities.ProposedSafetyRule.update(existingRule.id, { evidence_incident_ids: merged });
        await base44.asServiceRole.entities.IncidentCandidate.update(row.id, { status: 'proposed_rule_created' });
        continue;
      }

      let draft: any;
      try {
        draft = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          add_context_from_internet: false,
          prompt: `${RULE_DRAFT_PROMPT}\n\nIncident type: ${row.incident_type}\nProcedure: ${row.procedure_type}\nDestination: ${row.destination_country}\nReported outcome: ${row.reported_outcome}\nRisk factors mentioned: ${(row.risk_factors_mentioned || []).join(', ') || 'none stated'}\nCorroboration: ${row.corroboration_status} (${groupIds.length} source(s))`,
          response_json_schema: RULE_DRAFT_SCHEMA,
        });
      } catch (llmErr) {
        failures.push({ stage: 'propose', url_or_query: row.url, error_message: llmErr instanceof Error ? llmErr.message : String(llmErr) });
        continue; // never fabricate a rule when drafting fails — just leave it evaluated
      }

      const ruleText = (draft?.rule_text || '').toString().trim();
      if (!ruleText) continue;

      const nowISO = new Date().toISOString();
      await base44.asServiceRole.entities.ProposedSafetyRule.create({
        rule_text: ruleText,
        rule_category: ['procedure_combination_risk', 'destination_risk', 'provider_risk', 'general_advisory'].includes(draft?.rule_category) ? draft.rule_category : 'general_advisory',
        evidence_incident_ids: groupIds,
        confidence: Math.round(Number(draft?.confidence || 0)),
        source_count: groupIds.length,
        review_status: 'pending_review',
        version: 1,
        expiry_review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: nowISO,
      });
      rules_proposed++;

      await base44.asServiceRole.entities.IncidentCandidate.update(row.id, { status: 'proposed_rule_created' });
    } catch (e) {
      failures.push({ stage: 'propose', url_or_query: row.url, error_message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { rules_proposed, review_tasks_created, failures };
}
