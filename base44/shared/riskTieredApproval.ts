// ── Risk-Tiered Approval Engine ──────────────────────────────────────────────
//
// Replaces the old siloed "doctor fraud_score <= 20 auto-activates, everyone
// else always manual" decision with a composite confidence score that combines
// ALL available verification signals (fraud scan + sanctions screening +
// registry match when available), and extends auto-approval to ALL eligible
// partner types — not just doctors.
//
// This is the "Approval-by-Policy" model: the orchestrator's verification
// pipeline runs multiple independent checks, and if the composite confidence
// exceeds a high bar (>= 90) with NO hard safety blocks, the partner is
// automatically moved to `verified` / `active` with zero human touch.
// Borderline scores (60-89) escalate to URGENT manual review. Below 60 is
// standard manual review. Sanctions flagged is an unconditional block.
//
// Safety invariants that can NEVER be bypassed by auto-approval:
//   1. Sanctions flagged            -> always blocked (handled before this runs)
//   2. Critical fraud indicators     -> always manual review
//   3. security_agency partner type  -> always manual review (highest-risk partner)
//   4. Doctor serving high-risk case -> always manual review (medical safety)
//
// These are structural — computeRiskTier returns auto_eligible=false when any
// hard block is present, regardless of the composite score. No call site can
// override this.

export interface VerificationSignals {
  /** AI document fraud scan result (0-100, lower is better). Always available. */
  fraud_score: number;
  /** Fraud indicators from analyzePartnerDocuments. */
  fraud_indicators?: Array<{ severity?: string; indicator?: string; description?: string }>;
  /** Sanctions screening result. 'clear' = passed, 'flagged' = blocked. */
  sanctions_status: 'clear' | 'flagged' | 'unknown';
  /** Registry/IATA lookup confidence (0-100, higher is better). Optional — only
   *  available when a real registry check was run (verifyDiscoveredCandidate,
   *  verifyIATACode, runRegistryLookup). */
  registry_confidence?: number | null;
  /** The partner entity type being verified. */
  partner_type: string;
}

export interface RiskTierResult {
  /** The approval tier assigned by the engine. */
  tier: 'auto_approved' | 'borderline_review' | 'standard_review' | 'blocked';
  /** Composite verification confidence (0-100, higher = more confident). */
  composite_score: number;
  /** True ONLY when tier === 'auto_approved' — the one field call sites check. */
  auto_eligible: boolean;
  /** Whether the review is urgent (borderline or high fraud score). */
  urgent: boolean;
  /** Human-readable explanations for the decision (shown to admin reviewers). */
  reasons: string[];
  /** Safety invariants that prevented auto-approval (for audit trail). */
  hard_blocks: string[];
}

// ── Thresholds ───────────────────────────────────────────────────────────────
// Composite confidence >= 90 -> auto-approve (with no hard blocks).
// 60-89 -> borderline, urgent manual review.
// < 60 -> standard manual review.
const AUTO_APPROVE_THRESHOLD = 90;
const BORDERLINE_THRESHOLD = 60;
const URGENT_FRAUD_THRESHOLD = 70;

// Partner types that can NEVER be auto-approved — they always require a human.
// security_agency: these partners have direct physical access to vulnerable
// patients in distress; the risk of auto-approving a bad actor is too high.
const ALWAYS_MANUAL_TYPES = new Set(['security_agency']);

/**
 * computeRiskTier — the core decision function.
 *
 * Takes all available verification signals and returns a tiered approval
 * decision with a composite confidence score. Pure function — no side
 * effects, no I/O, no base44 calls. Call sites use `result.auto_eligible`
 * as the single gate for whether to auto-activate the partner.
 */
export function computeRiskTier(signals: VerificationSignals): RiskTierResult {
  const reasons: string[] = [];
  const hardBlocks: string[] = [];

  // ── HARD BLOCK: Sanctions flagged ──────────────────────────────────────────
  if (signals.sanctions_status === 'flagged') {
    return {
      tier: 'blocked',
      composite_score: 0,
      auto_eligible: false,
      urgent: false,
      reasons: ['Sanctions screening flagged — application blocked. No further verification signals can override this.'],
      hard_blocks: ['sanctions_flagged'],
    };
  }

  // ── HARD BLOCK: Partner type always requires manual review ──────────────────
  if (ALWAYS_MANUAL_TYPES.has(signals.partner_type)) {
    hardBlocks.push(`partner_type_${signals.partner_type}_always_manual`);
    reasons.push(`Partner type "${signals.partner_type}" always requires manual human review — auto-approval is structurally disabled for this partner category.`);
  }

  // ── HARD BLOCK: Critical fraud indicators ───────────────────────────────────
  const criticalIndicators = (signals.fraud_indicators || []).filter((i) => {
    const sev = (i.severity || '').toLowerCase();
    return sev === 'critical' || sev === 'high';
  });
  if (criticalIndicators.length > 0) {
    hardBlocks.push('critical_fraud_indicator');
    reasons.push(`${criticalIndicators.length} critical/high fraud indicator(s) detected — auto-approval blocked regardless of composite score.`);
  }

  // ── Compute composite confidence score ─────────────────────────────────────
  // Each available signal contributes a 0-100 confidence value. The composite
  // is a simple average — no signal dominates unless it's the only one
  // available. This keeps the score honest: a strong registry match can lift
  // a borderline fraud score, but it can never mask a truly bad fraud score.
  const fraudConfidence = Math.max(0, 100 - signals.fraud_score);
  const scores: number[] = [fraudConfidence];
  reasons.push(`Document fraud scan confidence: ${fraudConfidence}/100 (fraud score ${signals.fraud_score}).`);

  if (typeof signals.registry_confidence === 'number' && signals.registry_confidence > 0) {
    scores.push(signals.registry_confidence);
    reasons.push(`Registry/IATA check confidence: ${signals.registry_confidence}/100.`);
  } else {
    reasons.push('No registry/IATA check available — composite relies on fraud scan + sanctions only.');
  }

  // Sanctions clear contributes confidence (it's a real signal — a clean
  // sanctions screening is meaningful), but doesn't dominate the average.
  if (signals.sanctions_status === 'clear') {
    scores.push(100);
    reasons.push('Sanctions screening: clear (passed).');
  } else if (signals.sanctions_status === 'unknown') {
    scores.push(50);
    reasons.push('Sanctions screening: inconclusive (neutral 50/100 weight).');
  }

  const composite_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // ── Determine tier ──────────────────────────────────────────────────────────
  let tier: RiskTierResult['tier'];
  let auto_eligible = false;
  let urgent = false;

  if (hardBlocks.length > 0) {
    // Hard blocks prevent auto-approval — route to manual review with urgency
    // based on the composite score.
    if (composite_score >= BORDERLINE_THRESHOLD) {
      tier = 'borderline_review';
      urgent = true;
    } else {
      tier = 'standard_review';
    }
    reasons.push(`Composite confidence ${composite_score}/100 — but ${hardBlocks.length} hard block(s) prevent auto-approval: ${hardBlocks.join(', ')}.`);
  } else if (composite_score >= AUTO_APPROVE_THRESHOLD) {
    tier = 'auto_approved';
    auto_eligible = true;
    reasons.push(`Composite confidence ${composite_score}/100 >= ${AUTO_APPROVE_THRESHOLD} — auto-approved with no manual review required.`);
  } else if (composite_score >= BORDERLINE_THRESHOLD) {
    tier = 'borderline_review';
    urgent = true;
    reasons.push(`Composite confidence ${composite_score}/100 is borderline (${BORDERLINE_THRESHOLD}-${AUTO_APPROVE_THRESHOLD - 1}) — escalated to urgent manual review.`);
  } else {
    tier = 'standard_review';
    urgent = signals.fraud_score > URGENT_FRAUD_THRESHOLD;
    reasons.push(`Composite confidence ${composite_score}/100 below borderline — standard manual review.`);
  }

  return { tier, composite_score, auto_eligible, urgent, reasons, hard_blocks: hardBlocks };
}