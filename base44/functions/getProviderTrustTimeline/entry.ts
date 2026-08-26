import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

/**
 * getProviderTrustTimeline — redacted chronological verification-evidence
 * history for a doctor. Public (matches getProviderTrustProfile). Pulls from
 * PartnerVerification, PatientDataRevision (Doctor entries only, allowlisted
 * fields), DoctorVerification, and a ProviderConcernReport AGGREGATE COUNT
 * only — never raw reviewer identity, admin notes, or individual complaint
 * text, which stay admin-only.
 */

const ALLOWLISTED_REVISION_FIELDS = new Set([
  'verification_status',
  'license_verification_status',
  'identity_verification_status',
  'background_check_status',
  'booking_suspended',
]);

const bodySchema = strictObject({ doctor_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, body }) => {
  const { doctor_id } = await body<{ doctor_id: string }>();

  const doctor = await base44.asServiceRole.entities.Doctor.get(doctor_id).catch(() => null);
  if (!doctor) return err('Provider not found', 404);

  const events: Array<{ at: string; kind: string; detail: string }> = [];

  // ── PartnerVerification: status/verified_at/expires_at only ────────────────
  const verifications = await base44.asServiceRole.entities.PartnerVerification.filter({
    partner_type: 'doctor', partner_id: doctor_id,
  }).catch(() => []);
  for (const v of (verifications as any[])) {
    if (v.verified_at) {
      events.push({ at: v.verified_at, kind: 'verification', detail: `Verification completed (status: ${v.verification_status || 'unknown'}).` });
    }
    if (v.expires_at) {
      events.push({ at: v.expires_at, kind: 'expiry', detail: 'Verification scheduled to expire / be re-checked.' });
    }
  }

  // ── PatientDataRevision: Doctor-entity rows, allowlisted fields only ────────
  const revisions = await base44.asServiceRole.entities.PatientDataRevision.filter({
    entity_name: 'Doctor', record_id: doctor_id,
  }).catch(() => []);
  for (const r of (revisions as any[])) {
    const changed = r.changed_fields && typeof r.changed_fields === 'object' ? Object.keys(r.changed_fields) : [];
    const allowed = changed.filter((f) => ALLOWLISTED_REVISION_FIELDS.has(f));
    if (allowed.length > 0) {
      events.push({
        at: r.created_at,
        kind: 'status_change',
        // Actor is intentionally redacted to a generic label — never the
        // real reviewer identity.
        detail: `Updated by the Morales team: ${allowed.join(', ')}.`,
      });
    }
  }

  // ── DoctorVerification: registry checks, already patient-safe ──────────────
  const registryChecks = await base44.asServiceRole.entities.DoctorVerification.filter({
    doctor_id,
  }).catch(() => []);
  for (const d of (registryChecks as any[])) {
    if (d.verified_at) {
      events.push({
        at: d.verified_at,
        kind: 'registry_check',
        detail: `Checked against ${d.registry_name || 'an official registry'}${d.expires_at ? ' — re-check scheduled' : ''}.`,
      });
    }
  }

  // ── ProviderConcernReport: aggregate count only ─────────────────────────────
  const concerns = await base44.asServiceRole.entities.ProviderConcernReport.filter({ doctor_id }).catch(() => []);
  const resolvedCount = (concerns as any[]).filter((c) => c.status === 'actioned' || c.status === 'dismissed').length;

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return ok({
    doctor_id,
    timeline: events,
    concern_summary: concerns.length > 0
      ? `${concerns.length} concern${concerns.length === 1 ? '' : 's'} reported, ${resolvedCount} resolved.`
      : 'No concerns reported.',
  });
}, { name: 'getProviderTrustTimeline', requireAuth: false, bodySchema }));
