import { PARTNER_TYPE_CONFIG, type PartnerType } from './partnerTypeConfig.ts';
import { findNearReadyPartners } from './checkNearReadyPartners.ts';
import { findDiscoveredCandidates } from './findDiscoveredCandidates.ts';
import { askDispatchOrchestrator } from './askDispatchOrchestrator.ts';
import { escapeHtml } from './emailTemplate.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

// ── widenPartnerSearch ────────────────────────────────────────────────────────
// The one real implementation behind "M-Care never gives up" across all 5
// partner types. Called by every partner-dispatch give-up branch
// (findDoctorBackup, findDriverBackup, findCompanionBackup, assignTravelAgency,
// assignChauffeurServices, dispatchSecurityForCheckIn) the moment the normal
// search comes up empty.
//
// Architectural decision (Portia confirmed): the LLM (mcare_orchestrator)
// stays read-only and narration-only — "search/retry only, never executes
// consequentially" is still the right boundary for it. The actual "safe next
// step" decision here is 100% deterministic: this function calls the two
// read-only lookups DIRECTLY (plain function calls, no LLM round trip), so
// it's fast and reliable rather than dependent on an LLM call succeeding in
// time. askDispatchOrchestrator is still called, best-effort, purely to add
// narrative color to the admin email — it never drives what this function
// decides or does.
//
// What "safe next step" concretely means, given what a near-ready partner
// actually needs: every one of the 5 partner types' pending->active
// transition is gated on a human background-check click (CLAUDE.md's
// "nothing automated may mark a background check passed" invariant, true
// for doctors AND the other 4 types per activatePartner's own design) — the
// partner has already done everything on their end. Nudging THEM would be a
// no-op courtesy message, not something that speeds anything up. The actual
// bottleneck is always the admin's required click, so the safe, effective
// next step this function takes is making that click as fast and certain as
// possible: a structured, guaranteed-to-appear, clearly-actionable admin
// escalation (not dependent on an LLM successfully phrasing a paragraph in
// time) plus an honest, specific message back to the traveler reflecting
// what was actually found. Cold-contacting a freshly-discovered candidate is
// deliberately NOT done here — no sender exists for that anywhere in this
// codebase, a compliance-reviewed outreach channel is still a real,
// unresolved dependency (see discoverProviderCandidates's own header).

export interface WidenSearchParams {
  partnerType: PartnerType;
  specialty?: string;
  country?: string;
  /** Free-text need description for live discovery + orchestrator narration, e.g. "a ground transport company", "a recovery companion", "a security escort". */
  need: string;
  /** Free-text location for live discovery, e.g. a country name. */
  location: string;
  case_id?: string;
  /** Set false to skip the live web-discovery fallback (e.g. no meaningful need/location text available). Defaults true. */
  runLiveDiscoveryIfEmpty?: boolean;
}

export interface WidenSearchOutcome {
  outcome: 'near_ready' | 'candidate' | 'nothing';
  nearReadyCount: number;
  candidateCount: number;
  liveDiscoveryRan: boolean;
  /** Ready-to-embed HTML <div> section — append directly into an existing admin critical-alert email body. */
  adminHtml: string;
  /** Fixed-template, partner-type-specific patient message for logJourneyEvent's message_text. */
  journeyMessage: string;
  journeyPriority: 'high' | 'critical';
  /** Short plain-text summary for DispatchFailureLog.failure_reason / ai_recommendation fields. */
  failureReasonSuffix: string;
  aiRecommendation: string;
}

export async function widenPartnerSearch(base44: any, params: WidenSearchParams): Promise<WidenSearchOutcome> {
  const cfg = PARTNER_TYPE_CONFIG[params.partnerType];

  const nearReady = await findNearReadyPartners(base44, params.partnerType, {
    specialty: params.specialty, country: params.country,
  }).catch(() => []);

  let candidates: Awaited<ReturnType<typeof findDiscoveredCandidates>> = [];
  let liveDiscoveryRan = false;

  if (nearReady.length === 0) {
    candidates = await findDiscoveredCandidates(base44, params.partnerType, {
      specialty: params.specialty, country: params.country,
    }).catch(() => []);

    if (candidates.length === 0 && params.runLiveDiscoveryIfEmpty !== false && params.need && params.location) {
      liveDiscoveryRan = true;
      try {
        const res = await base44.asServiceRole.functions.invoke('discoverProviderCandidates', {
          need: params.need,
          location: params.location,
          case_id: params.case_id || '',
          partner_type: params.partnerType,
        });
        const resultBody: any = res?.data ?? res ?? {};
        if (Array.isArray(resultBody.candidates) && resultBody.candidates.length > 0) {
          candidates = resultBody.candidates.slice(0, 5).map((c: any) => ({
            id: c.id,
            title: c.title,
            procedure_context: params.need,
            country_iso: c.extracted_country_iso || '',
            identity_confidence: c.identity_confidence ?? 0,
            registry_check_status: c.registry_check_status || 'not_attempted',
            registry_result: null,
            note: c.reason || 'Just discovered via live web search — not verified, needs human review before any contact.',
          }));
        }
      } catch (_) {
        // Live discovery is best-effort — a failure here just means the
        // "nothing found" branch below runs, same as before this existed.
      }
    }
  }

  // Best-effort narration, decoupled from the decision above — a slow or
  // failed orchestrator call never delays or changes the deterministic
  // outcome already computed.
  const situation = [
    `Dispatch failure: no verified ${cfg.noun} is available for a case.`,
    params.specialty ? `Need: ${params.specialty}.` : '',
    params.country ? `Destination/location: ${params.country}.` : '',
    `The deterministic search already checked every active, verified ${cfg.noun} and found none.`,
    'Check for any faster path forward using your available tools.',
  ].filter(Boolean).join(' ');
  const aiRecommendation = await askDispatchOrchestrator(base44, situation).catch(() => null) || '';

  let outcome: WidenSearchOutcome['outcome'] = 'nothing';
  let adminHtml = '';
  let journeyMessage = `I'm actively searching for another verified ${cfg.noun} for you right now — I'll update you the moment this is resolved.`;
  let journeyPriority: WidenSearchOutcome['journeyPriority'] = 'critical';
  let failureReasonSuffix = 'No near-ready partner or discovered candidate found.';

  if (nearReady.length > 0) {
    outcome = 'near_ready';
    const top = nearReady[0];
    adminHtml = `<div style="margin-top:16px;padding:14px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:6px;">
      <p style="margin:0 0 4px;font-weight:bold;color:#065f46;">Fast path available — a near-ready ${escapeHtml(cfg.noun)}:</p>
      <p style="margin:0;color:#065f46;">${escapeHtml(top.name)}${top.country ? ` (${escapeHtml(top.country)})` : ''} — ${escapeHtml(top.note)}</p>
      <p style="margin:6px 0 0;"><a href="${escapeHtml(APP_URL + cfg.adminReviewUrl)}" style="color:#065f46;font-weight:bold;">Review now →</a></p>
      </div>`;
    journeyMessage = `I found another ${cfg.noun} who's nearly ready and flagged them for immediate review — I'll update you as soon as this is confirmed.`;
    journeyPriority = 'high';
    failureReasonSuffix = `A near-ready ${cfg.noun} (${top.name}) was found and flagged for expedited admin review.`;
  } else if (candidates.length > 0) {
    outcome = 'candidate';
    const top = candidates[0];
    adminHtml = `<div style="margin-top:16px;padding:14px;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;">
      <p style="margin:0 0 4px;font-weight:bold;color:#9a3412;">Possible lead${liveDiscoveryRan ? ' (just found via live web search)' : ''}:</p>
      <p style="margin:0;color:#7c2d12;">${escapeHtml(top.title)} — ${escapeHtml(top.note)}</p>
      <p style="margin:6px 0 0;color:#9a3412;">Not verified — needs a human to review before any contact is made.</p>
      </div>`;
    journeyMessage = `I'm actively searching for another verified ${cfg.noun} for you and found a promising lead our team is reviewing now.`;
    journeyPriority = 'high';
    failureReasonSuffix = `A discovered candidate lead ("${top.title}") was surfaced for admin review — not yet contacted or verified.`;
  }

  if (aiRecommendation) {
    adminHtml += `<div style="margin-top:12px;padding:12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;">
      <p style="margin:0 0 4px;font-weight:bold;color:#334155;">Additional AI-checked context (not acted on):</p>
      <p style="margin:0;color:#475569;">${escapeHtml(aiRecommendation)}</p></div>`;
  }

  return {
    outcome,
    nearReadyCount: nearReady.length,
    candidateCount: candidates.length,
    liveDiscoveryRan,
    adminHtml,
    journeyMessage,
    journeyPriority,
    failureReasonSuffix,
    aiRecommendation,
  };
}
