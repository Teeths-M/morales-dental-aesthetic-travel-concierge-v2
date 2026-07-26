import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { cronAuthorized } from '../_shared/cronAuth.ts';

/**
 * backfillClinicsFromDoctors — auto-creates Clinic records from the clinic fields
 * already on Doctor records, so nobody hand-types them. New clinics start at
 * operating_status 'unknown' (NOT attested) — the agentic verifier (or a human)
 * confirms them before any booking can proceed. Idempotent: skips clinics that
 * already exist (matched on name + country).
 *
 * Runs on a schedule (via GitHub Actions cron) and is also triggerable by an
 * admin from /admin/clinics. requireAuth:false + cron/admin guard.
 */
const key = (name: string, country: string) => `${(name || '').trim().toLowerCase()}|${(country || '').trim().toLowerCase()}`;

Deno.serve(createHandler(async ({ req, base44 }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const doctors = await base44.asServiceRole.entities.Doctor.list('-created_date', 1000).catch(() => []);
  const existing = await base44.asServiceRole.entities.Clinic.list('-created_date', 2000).catch(() => []);
  const have = new Set(existing.map((c: any) => key(c.name, c.country)));

  let created = 0;
  const seenThisRun = new Set<string>();

  for (const d of doctors) {
    const doc = d.data || d;
    const name = doc.clinic_name;
    const country = doc.clinic_country;
    if (!name || !country) continue;

    const k = key(name, country);
    if (have.has(k) || seenThisRun.has(k)) continue;
    seenThisRun.add(k);

    await base44.asServiceRole.entities.Clinic.create({
      name: String(name).trim(),
      country: String(country).trim(),
      city: doc.clinic_city ? String(doc.clinic_city).trim() : '',
      operating_status: 'unknown', // never auto-attested — verifier/human confirms
      active: true,
      linked_doctor_ids: [d.id],
    }).catch(() => {});
    created++;
  }

  return ok({ success: true, scanned_doctors: doctors.length, created });
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — rate-limiting the
// scheduler itself would risk throttling legitimate runs.
}, { name: 'backfillClinicsFromDoctors', requireAuth: false, rateLimit: false }));
