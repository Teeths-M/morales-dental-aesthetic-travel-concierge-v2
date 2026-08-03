import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

const GetDoctorPortalCaseSchema = strictObject({
  doctor_portal_token: Fields.shortText(200),
});

// BUG FIX (2026-08-03): PortalDoctor.jsx previously read the case directly via
// the unauthenticated client SDK — `base44.entities.CaseRecord.filter({ doctor_portal_token })`.
// CaseRecord's RLS only allows a read when the caller's own session matches
// client_email/doctor_email/an admin role. A real doctor clicking an emailed
// link, with no session at all, always got zero rows back ("Invalid or expired
// portal link"), regardless of how valid the token was — the exact same class
// of bug already fixed for travel-agency/taxi via getPortalData's asServiceRole
// lookup, just never applied here since the doctor token uses its own simpler
// format (`doc_{caseId}_{hex}`, from assignDoctorToCase) instead of the signed
// HMAC one. This mirrors that same asServiceRole pattern for this token format.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { doctor_portal_token } = await body();

  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ doctor_portal_token }).catch(() => []);
  const caseRecord = cases?.[0] ?? null;
  if (!caseRecord) return err('Invalid or expired portal link', 404);

  let consultation = null;
  if (caseRecord.consultation_id) {
    consultation = await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null);
  }

  // The doctor is meant to see full clinical detail for their own assigned
  // case (unlike the travel-agency/chauffeur portals, which intentionally see
  // only a minimal non-medical subset) — so unlike getPortalData, this returns
  // the case record as-is rather than a hand-picked field allowlist.
  return ok({ case: caseRecord, consultation });
}, { name: 'getDoctorPortalCase', requireAuth: false, bodySchema: GetDoctorPortalCaseSchema }));
