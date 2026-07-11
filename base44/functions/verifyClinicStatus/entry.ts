import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { verifyClinicOperating } from '../_shared/clinicVerify.ts';
import { TTL_MS, isFresh, flagForReview } from '../_shared/freshness.ts';

/**
 * verifyClinicStatus — the AGENTIC clinic verifier. Runs on a schedule and keeps
 * clinic operating status fresh WITHOUT a human doing the routine work.
 *
 * FAIL-SAFE:
 *   • Confident 'operating'  → attest (status_source 'agent_verified') + refresh
 *     the timestamp the booking gate reads; resolve open stale flags.
 *   • Confident 'closed'     → set closed (this BLOCKS bookings — the safe side)
 *     and flag a human to confirm.
 *   • Anything unconfirmed   → leave as-is (stays blocked) and flag a human to
 *     attest manually. The agent NEVER asserts 'operating' on a weak signal.
 *
 * So a person is only pulled in on exceptions the agent couldn't resolve.
 * Batch-capped to protect integration credits. requireAuth:false + cron/admin guard.
 */
const BATCH = 15;

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const clinics = await base44.asServiceRole.entities.Clinic.filter(
    { active: true }, 'status_verified_at', 300,
  ).catch(() => []);

  // Due = not already confirmed-fresh-operating. (Closed clinics are re-checked
  // too, in case they reopened — but only a confident signal flips them back.)
  const due = clinics.filter((c: any) => {
    const freshOperating = c.operating_status === 'operating' && isFresh(c.status_verified_at, TTL_MS.clinic_status);
    return !freshOperating;
  }).slice(0, BATCH);

  const nowISO = new Date().toISOString();
  let confirmed = 0, closed = 0, unresolved = 0;

  for (const clinic of due) {
    const result = await verifyClinicOperating(base44, clinic);

    if (result.operating === 'operating') {
      await base44.asServiceRole.entities.Clinic.update(clinic.id, {
        operating_status: 'operating',
        status_source: 'external_registry',
        status_verified_at: nowISO,
        status_verified_by: 'agent',
        status_notes: `Agent-verified operating (${result.confidence}%)${result.source ? ` — ${result.source}` : ''}.`,
      }).catch(() => {});
      // Resolve the stale/unavailable flags this verification answers.
      const openFlags = await base44.asServiceRole.entities.DataFreshnessReview.filter({
        subject_type: 'clinic_status', subject_id: clinic.id, status: 'pending',
      }, '-detected_at', 25).catch(() => []);
      for (const f of openFlags) {
        if (f.change_type === 'stale_no_reverification' || f.change_type === 'source_unavailable') {
          await base44.asServiceRole.entities.DataFreshnessReview.update(f.id, {
            status: 'actioned', reviewer_name: 'agent', reviewed_at: nowISO,
            resolution: `Agent re-verified operating (${result.confidence}%).`,
          }).catch(() => {});
        }
      }
      confirmed++;
      continue;
    }

    if (result.operating === 'closed') {
      // Fail-safe: mark closed (blocks bookings) and ask a human to confirm.
      await base44.asServiceRole.entities.Clinic.update(clinic.id, {
        operating_status: 'closed',
        status_source: 'external_registry',
        status_verified_at: nowISO,
        status_verified_by: 'agent',
        status_notes: `Agent found closed (${result.confidence}%)${result.source ? ` — ${result.source}` : ''}. Awaiting human confirmation.`,
      }).catch(() => {});
      await flagForReview(base44, {
        subject_type: 'clinic_status', subject_id: clinic.id,
        subject_label: `${clinic.name} (${clinic.country || '—'})`,
        change_type: 'closed',
        detail: `Agent verification indicates this clinic may be closed: ${result.summary}. Bookings are blocked; confirm before reopening it.`,
        detected_via: 'scheduled', previous_value: clinic.operating_status, new_value: 'closed', severity: 'critical',
      });
      closed++;
      continue;
    }

    // Unknown / weak signal → stays blocked, ask a human to attest.
    unresolved++;
    await flagForReview(base44, {
      subject_type: 'clinic_status', subject_id: clinic.id,
      subject_label: `${clinic.name} (${clinic.country || '—'})`,
      change_type: 'source_unavailable',
      detail: `Agent could not confirm operating status (${result.summary}). Clinic remains unconfirmed and blocked until someone attests it at /admin/clinics.`,
      detected_via: 'scheduled', severity: 'warning',
    });
  }

  console.log(`[verifyClinicStatus] due=${due.length} confirmed=${confirmed} closed=${closed} unresolved=${unresolved}`);
  return ok({ success: true, checked: due.length, confirmed, closed, unresolved });
}, { name: 'verifyClinicStatus', requireAuth: false }));
