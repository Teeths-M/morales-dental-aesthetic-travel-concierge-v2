import { createHandler, ok } from '../../shared/createHandler.ts';

// Backfills the 26 already-seeded EmergencyContacts rows with the two new
// Tier 2 fields (has_human_safety_partner, languages_supported) added after
// those rows were created. Idempotent — a row that already has both fields
// set is skipped, so this is safe to re-run at any time. Mirrors
// seedEmergencyContacts's own admin-only, filter-before-write shape.
//
// Never sets has_human_safety_partner to true for anyone — a row that
// somehow already has it true (an admin's own later, legitimate decision) is
// preserved as-is via `?? false`, never silently reset.
Deno.serve(createHandler(async ({ base44 }) => {
  const rows = await base44.asServiceRole.entities.EmergencyContacts.list('country_name', 200);
  const results: { country_name: string; status: 'backfilled' | 'already_backfilled' }[] = [];

  for (const row of rows) {
    const needsBackfill =
      row.has_human_safety_partner === undefined || row.has_human_safety_partner === null ||
      row.languages_supported === undefined || row.languages_supported === null;
    if (!needsBackfill) {
      results.push({ country_name: row.country_name, status: 'already_backfilled' });
      continue;
    }
    await base44.asServiceRole.entities.EmergencyContacts.update(row.id, {
      has_human_safety_partner: row.has_human_safety_partner ?? false,
      languages_supported: row.languages_supported ?? [],
    });
    results.push({ country_name: row.country_name, status: 'backfilled' });
  }

  const backfilledCount = results.filter((r) => r.status === 'backfilled').length;
  return ok({
    total: results.length,
    backfilled: backfilledCount,
    already_backfilled: results.length - backfilledCount,
    results,
  });
}, { name: 'backfillEmergencyContactsTier2Fields', allowedRoles: ['admin', 'platform_admin'] }));
