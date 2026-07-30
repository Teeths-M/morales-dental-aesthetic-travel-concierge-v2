// ── Bring Your Own Journey (BYOJ) — shared spine ──────────────────────────────
// Protection layer for a procedure or trip booked OUTSIDE Morales. Morales did not
// select or vet the provider, so our duty is monitor / alert / escalate — never
// prevent or guarantee. This module holds the canonical service promise, the
// legal-approved disclosure (medical + non-medical variants), and the honest
// verification-aggregation helpers.

/**
 * R1 — the canonical INTERNAL service promise. This is what we actually commit to.
 * Public-facing disclosure copy must be derived from this and reviewed by counsel
 * before it ships (see BYOJ_DISCLOSURE_STATUS).
 */
export const BYOJ_SERVICE_PROMISE = {
  we_do: ['verification of what is publicly knowable', 'continuous journey monitoring', 'alerting', 'human-coordinator escalation', '24/7 emergency response'],
  we_do_not: ['select or vet the provider', 'prevent a procedure', 'control the clinic', 'guarantee a medical outcome'],
  one_line: 'Morales provides monitoring, alerting, and human-coordinator escalation — not prevention or a guarantee of outcome.',
} as const;

/**
 * R1 — disclosure copy is legal-approved as of this status/version. `enrollExternalJourney`
 * stamps this version on the accepted record so acceptances can be tied back to
 * exactly which reviewed wording the user agreed to.
 */
export const BYOJ_DISCLOSURE_STATUS = 'legal_approved';
export const BYOJ_DISCLOSURE_VERSION = 'byoj-disclosure-v1';
export const BYOJ_DISCLOSURE_TEXT =
  'Morales did not select, vet, or approve this doctor or clinic, and we cannot control their actions or your ' +
  'medical care. What we provide is independent verification of what is publicly knowable, continuous journey ' +
  'monitoring, and 24/7 emergency response. We cannot guarantee a medical outcome. By enrolling, you are choosing ' +
  'Morales as your safety net — not as the party responsible for the procedure itself.';
// Non-medical (Travel-mode) variant — same commitments/limitations, clause for
// clause, with only the medical-specific nouns swapped for generic ones.
export const BYOJ_DISCLOSURE_TEXT_NONMEDICAL =
  'Morales did not select, vet, or approve this provider or venue, and we cannot control their actions or your ' +
  'safety during this trip. What we provide is independent verification of what is publicly knowable, continuous ' +
  'journey monitoring, and 24/7 emergency response. We cannot guarantee an outcome. By enrolling, you are choosing ' +
  'Morales as your safety net — not as the party responsible for the trip itself.';

// R3 — one-time only at launch. Recurring tiers are defined but MUST stay disabled
// until Stripe Subscriptions + webhooks are built and tested.
export const BYOJ_PLANS = {
  single_journey: { id: 'single_journey', label: 'Single Journey', billing: 'one_time', enabled: true },
  journey_recovery: { id: 'journey_recovery', label: 'Journey + Recovery', billing: 'monthly', enabled: false },
  always_covered: { id: 'always_covered', label: 'Always Covered', billing: 'annual', enabled: false },
} as const;

// ── Verification aggregation (R5: honest completeness, never a false green) ─────
export type CheckStatus = 'verified' | 'concern' | 'unconfirmed';
export interface CheckResult {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** true only when the check actually completed (reached a real answer). */
  completed: boolean;
}

/**
 * Rolls per-check results into an honest overall. Key R5 rule: the overall can be
 * 'verified' ONLY if every check completed AND none is a concern. If any check
 * could not complete (credits/registry/timeout), the overall is 'incomplete' —
 * never a green "verified" over data we didn't actually get.
 */
export function aggregateVerification(checks: CheckResult[]) {
  const total = checks.length;
  const completedCount = checks.filter((c) => c.completed).length;
  const concerns = checks.filter((c) => c.status === 'concern');
  const completeness = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  let overall: 'verified' | 'concerns' | 'incomplete';
  if (concerns.length > 0) overall = 'concerns';
  else if (completedCount < total) overall = 'incomplete';
  else overall = 'verified';

  return { overall, completeness, completed: completedCount, total, concern_keys: concerns.map((c) => c.key) };
}
