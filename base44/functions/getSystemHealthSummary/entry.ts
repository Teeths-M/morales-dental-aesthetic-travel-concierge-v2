/**
 * getSystemHealthSummary — a public, honest summary of real operational
 * health, meant to put the same "this runs itself" evidence already visible
 * in this repo's own GitHub Actions history inside the actual product, for
 * anyone who hasn't gone digging into the repo.
 *
 * Two pieces, both real, neither fabricated:
 *  1. Aggregate `ReliabilityIncident` counts over a rolling window — total,
 *     by severity, and how many are still unresolved. `ReliabilityIncident`'s
 *     own RLS is admin-only (see base44/entities/ReliabilityIncident.jsonc),
 *     so this reads via asServiceRole and returns ONLY aggregate counts —
 *     never error_message, stack_trace, api_response, user_description,
 *     sentry_event_id, root_cause, resolution, preventive_action,
 *     user_email, session_id, browser, device, page, or feature. A public
 *     health page must never leak internal diagnostic detail, even in a
 *     form that could fingerprint a specific outage.
 *  2. A short, real, hand-maintained list of what actually runs on a
 *     schedule, matching .github/workflows/freshness-cron.yml's own real job
 *     categories and cadence. Deliberately static rather than a live GitHub
 *     Actions API call — that would add a new vendor/rate-limit dependency
 *     for a fact that's already true and rarely changes. Keep this list in
 *     sync by hand whenever that workflow file's real job list changes.
 *
 * requireAuth: false, matching /procedures and getEvidenceWatchFeed's own
 * public, pre-signup-trust-building openness.
 */
import { createHandler, ok } from '../../shared/createHandler.ts';

const WINDOW_DAYS = 30;

const AUTOMATION_CATEGORIES = [
  {
    category: 'Clinic & doctor verification',
    description: 'Re-checks clinic operating status and doctor license/credential freshness.',
    cadence: 'Daily',
  },
  {
    category: 'Partner trust scoring',
    description: 'Recomputes doctor, companion, and driver trust scores from real case history.',
    cadence: 'Daily',
  },
  {
    category: 'Visa & travel requirements',
    description: 'Re-verifies visa rules against a live source once a cached answer goes stale.',
    cadence: 'Weekly',
  },
  {
    category: 'Medical evidence monitoring',
    description: 'Scans public medical/regulatory sources and public incident reports for human review.',
    cadence: 'Weekly / Monthly',
  },
  {
    category: 'Booking & signup follow-ups',
    description: 'Sends reminders and recovers stalled bookings or signups, always link-only.',
    cadence: 'Hourly',
  },
  {
    category: 'System hygiene',
    description: 'Expires stale tokens, sessions, and rate-limit records.',
    cadence: 'Hourly / every 6 hours',
  },
  {
    category: 'Safety red-team suite',
    description: 'A deterministic, no-network test suite that must pass before any change reaches this app.',
    cadence: 'Every push to main',
  },
];

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
type Severity = (typeof SEVERITIES)[number];

Deno.serve(createHandler(async ({ base44 }) => {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const recent = await base44.asServiceRole.entities.ReliabilityIncident
    .filter({}, '-created_date', 500)
    .catch(() => []);

  const rows = Array.isArray(recent) ? recent : [];
  const inWindow = rows.filter((r: any) => typeof r?.created_date === 'string' && r.created_date >= sinceIso);

  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  let unresolvedCriticalOrHigh = 0;

  for (const r of inWindow) {
    const severity = r?.severity as Severity | undefined;
    if (severity && SEVERITIES.includes(severity)) {
      bySeverity[severity] += 1;
    }
    const isUnresolved = r?.status !== 'resolved' && r?.status !== 'closed';
    if (isUnresolved && (severity === 'critical' || severity === 'high')) {
      unresolvedCriticalOrHigh += 1;
    }
  }

  return ok({
    success: true,
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    incidents: {
      total: inWindow.length,
      by_severity: bySeverity,
      unresolved_critical_or_high: unresolvedCriticalOrHigh,
    },
    automation: AUTOMATION_CATEGORIES,
  });
}, { name: 'getSystemHealthSummary', requireAuth: false }));
