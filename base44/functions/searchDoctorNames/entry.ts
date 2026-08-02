import { createHandler, ok, type Base44Client } from '../../shared/createHandler.ts';
import { createMemoCache } from '../../shared/memoCache.ts';

// ── Roster cache ─────────────────────────────────────────────────────────────
// Powers the "is this doctor already on M?" fuzzy-search-first step in the
// doctor-nomination flow. The active roster changes on the order of
// hours-to-days, not per-request — same 5-min TTL as matchDoctorsForProcedure's
// roster cache, same _shared/memoCache.ts helper.
const ROSTER_CACHE_TTL_MS = 5 * 60 * 1000;

async function buildNameRoster(base44: Base44Client) {
  const doctors = await base44.asServiceRole.entities.Doctor.filter({ status: 'active' }, '-created_date', 500);
  return doctors.map((d: any) => ({
    id: d.id,
    name: d.full_name || '',
    clinic_name: d.clinic_name || '',
    country: d.clinic_country || d.country || '',
    city: d.clinic_city || '',
  }));
}

const getNameRoster = createMemoCache(buildNameRoster, ROSTER_CACHE_TTL_MS);

Deno.serve(createHandler(async ({ base44 }) => {
  const roster = await getNameRoster(base44);
  return ok({ doctors: roster });
}, { name: 'searchDoctorNames', requireAuth: true, allowedRoles: ['client', 'user', 'admin', 'platform_admin'] }));
