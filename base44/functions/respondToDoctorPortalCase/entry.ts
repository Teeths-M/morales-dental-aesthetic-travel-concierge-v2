import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';

const RespondToDoctorPortalCaseSchema = strictObject({
  doctor_portal_token: Fields.shortText(200),
  decision: z.enum(['confirmed', 'declined']),
  doctor_notes: Fields.shortText(4000).optional(),
  clinic_address: Fields.shortText(500).optional(),
  clinic_lat: z.union([z.string(), z.number()]).optional(),
  clinic_lng: z.union([z.string(), z.number()]).optional(),
});

// BUG FIX (2026-08-03): PortalDoctor.jsx's "Confirm Availability"/"Not Available"
// buttons wrote directly via the unauthenticated client SDK
// (`base44.entities.CaseRecord.update(...)`), which CaseRecord's RLS blocks for
// a real doctor with no session — same root cause, and same asServiceRole fix,
// as getDoctorPortalCase's read path. Values mirror exactly what PortalDoctor.jsx
// already set client-side (doctor_confirmation_status/status) — this is a
// delivery-path fix, not a change to what a confirm/decline actually records.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { doctor_portal_token, decision, doctor_notes, clinic_address, clinic_lat, clinic_lng } = await body();

  const cases = await base44.asServiceRole.entities.CaseRecord.filter({ doctor_portal_token }).catch(() => []);
  const caseRecord = cases?.[0] ?? null;
  if (!caseRecord) return err('Invalid or expired portal link', 404);

  const coordsUpdate = (clinic_lat && clinic_lng)
    ? { clinic_coords: { lat: parseFloat(String(clinic_lat)), lng: parseFloat(String(clinic_lng)) } }
    : {};

  const update = decision === 'confirmed'
    ? {
        doctor_confirmation_status: 'Confirmed',
        doctor_confirmed_at: new Date().toISOString(),
        doctor_notes: doctor_notes || '',
        status: 'Vendor-Pending',
        ...(clinic_address ? { clinic_address } : {}),
        ...coordsUpdate,
      }
    : {
        doctor_confirmation_status: 'Declined',
        doctor_notes: doctor_notes || '',
        status: 'Admin-Review',
      };

  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, update);

  return ok({ success: true });
}, { name: 'respondToDoctorPortalCase', requireAuth: false, bodySchema: RespondToDoctorPortalCaseSchema }));
