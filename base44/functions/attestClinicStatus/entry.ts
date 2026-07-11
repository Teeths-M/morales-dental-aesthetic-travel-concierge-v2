import { createHandler, ok, err } from '../_shared/createHandler.ts';

/**
 * attestClinicStatus — a HUMAN confirms a clinic's current operating status,
 * refreshing its 'last verified' timestamp. This is the confirmation step that
 * lets checkClinicStatus pass a booking. Admins may attest any clinic; a doctor
 * may attest a clinic they are linked to (partner-attested).
 *
 * Attesting 'operating' also resolves any open stale/unavailable review flags
 * for that clinic — the flag existed to demand exactly this human confirmation.
 */
const ADMIN_ROLES = ['admin', 'platform_admin'];

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    clinic_id, clinic_name, country, city, registration_ref,
    operating_status, notes,
  } = await body<{
    clinic_id?: string; clinic_name?: string; country?: string; city?: string;
    registration_ref?: string; operating_status?: string; notes?: string;
  }>();

  const status = operating_status || 'operating';
  if (!['operating', 'closed', 'suspended', 'unknown'].includes(status)) {
    return err('operating_status must be one of: operating, closed, suspended, unknown.');
  }

  const isAdmin = ADMIN_ROLES.includes(user!.role);

  // ── Resolve or (admin-only) create the clinic ──────────────────────────────
  let clinic: any = null;
  if (clinic_id) {
    clinic = await base44.asServiceRole.entities.Clinic.get(clinic_id).catch(() => null);
    if (!clinic) return err('Clinic not found.', 404);
  } else if (clinic_name && country) {
    const matches = await base44.asServiceRole.entities.Clinic.filter({ name: clinic_name, country }, '-created_date', 1).catch(() => []);
    clinic = matches?.[0] || null;
    if (!clinic) {
      if (!isAdmin) return err('This clinic is not on file yet — an administrator must add it first.', 403);
      clinic = await base44.asServiceRole.entities.Clinic.create({
        name: clinic_name, country, city: city || '', registration_ref: registration_ref || '',
        operating_status: 'unknown', active: true,
      });
    }
  } else {
    return err('Provide clinic_id, or clinic_name + country.');
  }

  // ── Authorize: admin (any) or linked partner (their own clinic) ────────────
  let source = 'admin_attested';
  if (!isAdmin) {
    const linked = Array.isArray(clinic.linked_doctor_ids) && clinic.linked_doctor_ids.includes(user!.id);
    if (!linked) return err('You can only attest a clinic you are linked to.', 403);
    source = 'partner_attested';
  }

  const nowISO = new Date().toISOString();
  await base44.asServiceRole.entities.Clinic.update(clinic.id, {
    operating_status: status,
    status_source: source,
    status_verified_at: nowISO,
    status_verified_by: user!.email,
    ...(notes ? { status_notes: notes } : {}),
  });

  // ── Attesting 'operating' resolves the flags that demanded this confirmation ─
  let resolved = 0;
  if (status === 'operating') {
    const openFlags = await base44.asServiceRole.entities.DataFreshnessReview.filter({
      subject_type: 'clinic_status', subject_id: clinic.id, status: 'pending',
    }, '-detected_at', 25).catch(() => []);
    for (const f of openFlags) {
      if (f.change_type === 'stale_no_reverification' || f.change_type === 'source_unavailable') {
        await base44.asServiceRole.entities.DataFreshnessReview.update(f.id, {
          status: 'actioned',
          reviewer_id: user!.id,
          reviewer_name: user!.email,
          reviewed_at: nowISO,
          resolution: `Clinic re-attested '${status}' by ${user!.email}.`,
        }).catch(() => {});
        resolved++;
      }
    }
  }

  return ok({
    clinic_id: clinic.id,
    operating_status: status,
    status_source: source,
    status_verified_at: nowISO,
    resolved_flags: resolved,
  });
}, { name: 'attestClinicStatus', requireAuth: true }));
