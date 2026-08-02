import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { verifyClinicOperating } from '../../shared/clinicVerify.ts';
import { TTL_MS, isFresh, flagForReview } from '../../shared/freshness.ts';

/**
 * verifyClinicStatus — the AGENTIC clinic verifier. Runs on a schedule and keeps
 * clinic operating status fresh WITHOUT a human doing the routine work.
 *
 * FAIL-SAFE + SAFETY-DECISION HARDENING:
 *   • Confident 'operating'  → the agent does NOT auto-clear the clinic. It writes
 *     a 'agent_proposed_operating' review item with its evidence for a human to
 *     confirm at /admin/clinics. The AI can never write the permissive value that
 *     lets a booking proceed — only a human (attestClinicStatus) can.
 *   • Confident 'closed'     → set closed (this BLOCKS bookings — the safe side)
 *     and flag a human. The AI may move toward MORE caution autonomously.
 *   • Anything unconfirmed   → leave as-is (stays blocked) and flag a human.
 *
 * So the AI only ever proposes clearance or auto-applies a block; a person makes
 * the permissive call. Batch-capped for credits. requireAuth:false + cron/admin guard.
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
  let proposed = 0, closed = 0, unresolved = 0;

  for (const clinic of due) {
    const result = await verifyClinicOperating(base44, clinic);

    if (result.operating === 'operating') {
      // HARDENED: the AI does NOT write the permissive 'operating' status. It
      // records its evidence and asks a human to confirm — only attestClinicStatus
      // (a person) can clear a clinic for bookings. The AI cannot clear anything.
      await base44.asServiceRole.entities.Clinic.update(clinic.id, {
        status_notes: `Agent evidence: likely operating (${result.confidence}%)${result.source ? ` — ${result.source}` : ''}. Awaiting human confirmation.`,
      }).catch(() => {});
      await flagForReview(base44, {
        subject_type: 'clinic_status', subject_id: clinic.id,
        subject_label: `${clinic.name} (${clinic.country || '—'})`,
        change_type: 'agent_proposed_operating',
        detail: `Agent found evidence this clinic is operating (${result.confidence}%): ${result.summary}. Confirm at /admin/clinics to allow bookings — the agent cannot clear it on its own.`,
        detected_via: 'scheduled', new_value: `operating? (${result.confidence}%)`, severity: 'info',
      });
      proposed++;
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

  console.log(`[verifyClinicStatus] due=${due.length} proposed=${proposed} closed=${closed} unresolved=${unresolved}`);
  return ok({ success: true, checked: due.length, proposed_for_confirmation: proposed, closed, unresolved });
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — rate-limiting the
// scheduler itself would risk throttling legitimate runs.
}, { name: 'verifyClinicStatus', requireAuth: false, rateLimit: false }));
