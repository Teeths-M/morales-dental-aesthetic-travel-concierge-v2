import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, Fields } from '../../shared/validate.ts';
import { findDoctorBackup } from '../../shared/findDoctorBackup.ts';

const RespondToDoctorPortalCaseSchema = strictObject({
  doctor_portal_token: Fields.shortText(200),
  decision: z.enum(['confirmed', 'declined', 'withdrawn']),
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

  if (decision === 'confirmed') {
    const coordsUpdate = (clinic_lat && clinic_lng)
      ? { clinic_coords: { lat: parseFloat(String(clinic_lat)), lng: parseFloat(String(clinic_lng)) } }
      : {};
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      doctor_confirmation_status: 'Confirmed',
      doctor_confirmed_at: new Date().toISOString(),
      doctor_notes: doctor_notes || '',
      status: 'Vendor-Pending',
      ...(clinic_address ? { clinic_address } : {}),
      ...coordsUpdate,
    });

    // ── 3-Way Care Room handoff ───────────────────────────────────────────
    // The moment the doctor confirms is the moment the Care Room becomes a
    // genuine 3-way conversation. M-Care posts the "I'm adding your doctor to
    // our chat" system message so the patient sees the doctor join by name and
    // origin, and understands M-Care stays in the room as the translating,
    // transparency-keeping middleman. Best-effort and fully wrapped — a
    // failure here must never block the doctor's own confirm action above.
    try {
      const doctorEmail = caseRecord.doctor_email || '';
      const doctorName = caseRecord.doctor_selected || caseRecord.doctor_name || 'your doctor';
      let doctorCountry = caseRecord.procedure_country || '';
      if (doctorEmail) {
        const doctorRecords = await base44.asServiceRole.entities.Doctor.filter({ email: doctorEmail }, '-created_date', 1).catch(() => []);
        if (doctorRecords[0]?.clinic_country) doctorCountry = doctorRecords[0].clinic_country;
      }
      const originClause = doctorCountry ? `, joining from ${doctorCountry}` : '';
      await base44.asServiceRole.entities.QuoteMessage.create({
        case_id: caseRecord.id,
        quote_id: '',
        patient_email: caseRecord.client_email || '',
        doctor_email: doctorEmail,
        from_party: 'm_care',
        from_id: '',
        to_party: 'patient',
        message_type: 'message',
        body: `I've added Dr. ${doctorName} to our chat${originClause}. You can now coordinate your care directly with them right here — I'll stay in the room to translate in real time, keep us all on the same page, and flag anything that needs confirming. Nothing happens off-platform.`,
        body_translated: '',
        recipient_language: '',
        contact_scrubbed: false,
        status: 'unread',
        requires_confirmation: false,
        confirmed: false,
        created_at: new Date().toISOString(),
      });
    } catch (handoffError) {
      console.error('[respondToDoctorPortalCase] Care Room handoff message failed (non-fatal):', handoffError);
    }

    // Real trigger for travel-agency quote requests, now that
    // assignTravelAgency's own precondition actually matches what this
    // function writes ('Confirmed', mixed-case) and its portal token is
    // signed correctly. Awaited (not fire-and-forget) — this Deno isolate
    // may tear down immediately after the response is sent, per this repo's
    // established createHandler.ts reasoning about background work — but
    // wrapped so a failure here can never fail the doctor's own confirm
    // action, which must always succeed regardless.
    try {
      await base44.functions.invoke('assignTravelAgency', {
        caseId: caseRecord.id,
        internal_secret: Deno.env.get('CRON_SECRET'),
      });
    } catch (assignError) {
      console.error('[respondToDoctorPortalCase] assignTravelAgency dispatch failed (non-fatal):', assignError);
    }

    return ok({ success: true });
  }

  if (decision === 'withdrawn') {
    // Only a doctor who already confirmed can withdraw — a not-yet-confirmed
    // doctor uses 'declined' instead. Both end up calling the same backup
    // path below; this just keeps the two actions semantically distinct in
    // the audit trail (doctor_notes / timeline) and stops a stale/replayed
    // token from "withdrawing" a case that was never confirmed by this
    // doctor in the first place.
    const alreadyConfirmed = ['Confirmed', 'CONFIRMED'].includes(caseRecord.doctor_confirmation_status);
    if (!alreadyConfirmed) return err('This case was never confirmed, so it cannot be withdrawn — use decline instead', 409);
  }

  // decision is 'declined' or 'withdrawn' — in both cases the doctor is out
  // and the case needs a replacement doctor now, automatically, not just a
  // flag for an admin to notice later.
  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
    doctor_confirmation_status: decision === 'withdrawn' ? 'Withdrawn' : 'Declined',
    doctor_notes: doctor_notes || '',
  });
  const result = await findDoctorBackup(base44, { ...caseRecord, doctor_notes: doctor_notes || '' });

  return ok({ success: true, reassigned: result.success });
}, { name: 'respondToDoctorPortalCase', requireAuth: false, bodySchema: RespondToDoctorPortalCaseSchema }));