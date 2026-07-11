import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';
import { fetchVisaRequirement } from '../_shared/visaLookup.ts';
import { TTL_MS, isFresh, flagForReview } from '../_shared/freshness.ts';

/**
 * recheckVisaRequirements — scheduled WEEKLY refresh of cached visa snapshots so
 * stored requirements never drift past the visa TTL. Batch-capped to protect
 * integration credits. When a requirement CHANGES from what we had, it flags the
 * admin/legal queue (advisory — patients on affected journeys should be told).
 *
 * Cron-registered in Base44 (weekly), runs under the scheduler's admin identity.
 */
const BATCH = 25;

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);
  const snapshots = await base44.asServiceRole.entities.VisaRequirementSnapshot.filter(
    {}, 'last_confirmed_at', 200,
  ).catch(() => []);

  const due = snapshots.filter((s: any) => !isFresh(s.last_confirmed_at, TTL_MS.visa_rule)).slice(0, BATCH);

  let refreshed = 0, changed = 0;
  const nowISO = new Date().toISOString();

  for (const s of due) {
    const policy = await fetchVisaRequirement(base44, s.nationality, s.destination_country);
    const statusChanged = policy.visa_status !== 'unknown' && s.visa_status !== 'unknown' && policy.visa_status !== s.visa_status;

    await base44.asServiceRole.entities.VisaRequirementSnapshot.update(s.id, {
      visa_status: policy.visa_status,
      summary: policy.summary,
      medical_notes: policy.medical_notes || '',
      source_url: policy.source_url || '',
      confidence: policy.confidence,
      last_confirmed_at: nowISO,
      checked_via: 'scheduled',
    }).catch(() => {});
    refreshed++;

    if (statusChanged) {
      changed++;
      await flagForReview(base44, {
        subject_type: 'visa_rule',
        subject_id: s.id,
        subject_label: `${s.nationality} → ${s.destination_country}`,
        change_type: 'status_changed',
        detail: `Entry requirement changed on scheduled re-check. Patients on affected journeys may need to be updated.`,
        detected_via: 'scheduled',
        previous_value: s.visa_status,
        new_value: policy.visa_status,
        severity: 'warning',
      });
    }
  }

  console.log(`[recheckVisaRequirements] due=${due.length} refreshed=${refreshed} changed=${changed}`);
  return ok({ success: true, checked: due.length, refreshed, changed });
}, { name: 'recheckVisaRequirements', requireAuth: false }));
