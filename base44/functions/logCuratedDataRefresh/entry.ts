import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';

/**
 * logCuratedDataRefresh — records what the monthly curated-data-refresh.yml
 * GitHub Action did to src/lib/visaMatrix.js / src/lib/travelReadiness.js.
 * The auto-apply decision (or the decision NOT to apply, on a gate failure)
 * already happened in that workflow before this call — this function only
 * logs the outcome into the existing DataFreshnessReview queue so it's
 * visible on /admin/data-freshness, not just in a GitHub Actions log nobody
 * checks. It never decides anything itself.
 *
 * Deliberately does NOT go through _shared/freshness.ts's flagForReview():
 * that helper hard-codes status:'pending' and de-dupes against open
 * 'pending' rows for the same subject — correct for every OTHER freshness
 * job (advisory-only, a human must confirm before anything changes for
 * users), but wrong here. A successful auto-apply is not something waiting
 * for review — it already happened — so it's logged straight to 'actioned'
 * with a reviewer_name identifying it as automated. A gate FAILURE (nothing
 * was applied) logs 'pending'/'critical' instead, so a real problem still
 * surfaces for a person the normal way.
 */
Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const {
    subject_type, subject_label, change_type, detail,
    previous_value = '', new_value = '', severity = 'info',
    status = 'actioned', commit_sha = '',
  } = await body<{
    subject_type?: string; subject_label?: string; change_type?: string; detail?: string;
    previous_value?: string; new_value?: string; severity?: string; status?: string; commit_sha?: string;
  }>();

  if (!subject_type || !subject_label || !change_type || !detail) {
    return err('subject_type, subject_label, change_type, and detail are required', 400);
  }

  const nowISO = new Date().toISOString();
  await base44.asServiceRole.entities.DataFreshnessReview.create({
    subject_type, subject_label, change_type, detail,
    detected_via: 'scheduled',
    previous_value, new_value,
    severity,
    status,
    detected_at: nowISO,
    last_seen_at: nowISO,
    ...(status === 'actioned' ? {
      reviewer_name: 'curated-data-refresh (automated)',
      reviewed_at: nowISO,
      resolution: commit_sha ? `Auto-applied in commit ${commit_sha}` : 'Auto-applied',
    } : {}),
  });

  return ok({ success: true });
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — this is called
// exclusively by curated-data-refresh.yml, never by a user-facing surface.
}, { name: 'logCuratedDataRefresh', requireAuth: false, rateLimit: false }));
