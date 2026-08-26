import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';
import { checkProviderBookingEligibility } from '../../shared/providerBookingEligibility.ts';
import { assessInterpreterNeed } from '../../shared/interpreterGate.ts';
import { createConsultationRoom } from '../../shared/dailyVideoAdapter.ts';
import { buildICS, icsDate, googleCalUrl, type ICSEvent } from '../../shared/icsBuilder.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * bookVirtualConsultation — books a real "Meet Your Care Team" virtual
 * consultation. Anchored on Consultation + Doctor, not CaseRecord (a real
 * case rarely exists yet at this point — see VirtualConsultation.jsonc's
 * header). Never blocks the booking if Daily.co isn't configured yet — the
 * appointment itself is real regardless of whether live video is active.
 *
 * TIMEZONE DESIGN NOTE: the client resolves the doctor's own local calendar
 * date/time (via Doctor.clinic_timezone + native Intl.DateTimeFormat) and
 * sends both that local date/time (to lock the real DoctorAvailability slot)
 * and the equivalent UTC instant (scheduled_at, stored as the source of
 * truth) — this function does no timezone arithmetic of its own, since no
 * timezone library is available in this Deno runtime without adding a real
 * dependency.
 */

const bodySchema = strictObject({
  consultation_id: Fields.shortText(100),
  doctor_id: Fields.shortText(100),
  scheduled_at: z.string().min(1, 'scheduled_at is required'),
  scheduled_date: Fields.isoDate(), // doctor-local YYYY-MM-DD, for the slot lock
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'scheduled_time must be HH:MM'),
  scheduled_duration_minutes: Fields.boundedInt(15, 120).optional().default(30),
  patient_timezone: Fields.shortText(100).optional().default(''),
  brief_goals: Fields.optionalText(2000),
  brief_budget_range: z.enum(['under_5k', '5k_10k', '10k_20k', '20k_plus', 'prefer_not_to_say']).optional(),
  brief_questions_for_doctor: Fields.optionalText(2000),
  brief_accessibility_companion_needs: Fields.optionalText(1000),
  brief_shared_fields: z.array(Fields.shortText(100)).max(30).optional().default([]),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const b = await body<z.infer<typeof bodySchema>>();

  const consultation = await base44.asServiceRole.entities.Consultation.get(b.consultation_id).catch(() => null);
  if (!consultation) return err('Consultation not found', 404);
  if (consultation.email !== user!.email && !['admin', 'platform_admin'].includes(user!.role)) {
    return err('Forbidden', 403);
  }

  const doctor = await base44.asServiceRole.entities.Doctor.get(b.doctor_id).catch(() => null);
  if (!doctor) return err('Provider not found', 404);

  // ── Eligibility gate — before any record is created ─────────────────────
  const [highReports, criticalReports] = await Promise.all([
    base44.asServiceRole.entities.ProviderConcernReport.filter({ doctor_id: b.doctor_id, severity: 'high', status: 'actioned' }).catch(() => []),
    base44.asServiceRole.entities.ProviderConcernReport.filter({ doctor_id: b.doctor_id, severity: 'critical', status: 'actioned' }).catch(() => []),
  ]);
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentHigh = (highReports as any[]).filter((r) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;
  const recentCritical = (criticalReports as any[]).filter((r) => new Date(r.created_at).getTime() >= ninetyDaysAgo).length;
  const eligibility = checkProviderBookingEligibility(doctor, { high: recentHigh, critical: recentCritical });
  if (!eligibility.eligible) {
    return err(`This provider cannot be booked right now: ${eligibility.reasons.join(' ')}`, 409);
  }

  // ── Slot lock: read-then-compare-and-swap, matching confirmProcedureDate's
  //    own pattern on this same entity ─────────────────────────────────────
  const existingAvail = (await base44.asServiceRole.entities.DoctorAvailability.filter({
    doctor_id: b.doctor_id, date: b.scheduled_date,
  }).catch(() => []))[0] as any;

  const currentSlots: any[] = Array.isArray(existingAvail?.consultation_slots) ? existingAvail.consultation_slots : [];
  const clash = currentSlots.find((s) => s.time === b.scheduled_time && s.booked_by_virtual_consultation_id);
  if (clash) {
    return err('That time slot was just booked by someone else — please pick another.', 409);
  }

  const availabilitySlotKey = `${b.doctor_id}|${b.scheduled_date}|${b.scheduled_time}`;
  const lockedAt = new Date().toISOString();

  // ── Resolve a real case if one already exists ────────────────────────────
  const existingCases = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id: b.consultation_id }).catch(() => []);
  const caseRecord = (existingCases as any[])[0] || null;

  // ── Interpreter gate — snapshotted, not a live join ──────────────────────
  const interpreterAssessment = assessInterpreterNeed(
    consultation.preferred_language, doctor.language_preference, consultation.needs_translator,
  );

  // ── Create the booking record ────────────────────────────────────────────
  const nowISO = new Date().toISOString();
  const vc = await base44.asServiceRole.entities.VirtualConsultation.create({
    consultation_id: b.consultation_id,
    case_id: caseRecord?.id || '',
    client_email: consultation.email,
    client_name: consultation.patient_name || '',
    doctor_id: b.doctor_id,
    doctor_email: doctor.email,
    doctor_name: doctor.full_name || '',
    status: 'confirmed',
    scheduled_at: b.scheduled_at,
    scheduled_duration_minutes: b.scheduled_duration_minutes,
    patient_timezone: b.patient_timezone,
    doctor_timezone: doctor.clinic_timezone || '',
    availability_slot_key: availabilitySlotKey,
    price_amount: doctor.consultation_price_amount ?? null,
    price_currency: doctor.consultation_price_currency || 'USD',
    cancellation_policy_snapshot: doctor.cancellation_policy || '',
    payment_status: doctor.consultation_price_amount ? 'pending' : 'not_required',
    brief_goals: b.brief_goals,
    brief_budget_range: b.brief_budget_range || '',
    brief_questions_for_doctor: b.brief_questions_for_doctor,
    brief_accessibility_companion_needs: b.brief_accessibility_companion_needs,
    brief_shared_fields: b.brief_shared_fields,
    brief_generated_at: nowISO,
    interpreter_languages_differ: interpreterAssessment.languages_differ,
    interpreter_patient_language: interpreterAssessment.patient_language,
    interpreter_doctor_language: interpreterAssessment.doctor_language,
    interpreter_flag_events: [],
    video_configured: false,
    created_at: nowISO,
    updated_at: nowISO,
  });

  // Now lock the availability slot against the real new booking id.
  const updatedSlots = [
    ...currentSlots.filter((s) => s.time !== b.scheduled_time),
    { time: b.scheduled_time, duration_minutes: b.scheduled_duration_minutes, booked_by_virtual_consultation_id: vc.id, locked_at: lockedAt },
  ];
  if (existingAvail) {
    await base44.asServiceRole.entities.DoctorAvailability.update(existingAvail.id, { consultation_slots: updatedSlots }).catch(() => {});
  } else {
    await base44.asServiceRole.entities.DoctorAvailability.create({
      doctor_id: b.doctor_id, doctor_email: doctor.email, date: b.scheduled_date,
      is_available: true, consultation_slots: updatedSlots,
    }).catch(() => {});
  }

  // ── Daily room — best-effort, honest, never blocks the booking ──────────
  const room = await createConsultationRoom(vc.id).catch(() => null);
  if (room?.supported) {
    await base44.asServiceRole.entities.VirtualConsultation.update(vc.id, {
      video_provider: 'daily',
      video_configured: true,
      video_room_name: room.room_name,
      video_room_url: room.room_url,
      video_room_created_at: room.created_at,
      video_room_expires_at: room.expires_at,
    }).catch(() => {});
  }

  // ── Calendar invite ───────────────────────────────────────────────────────
  const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
  const startISO = icsDate(b.scheduled_at);
  const endDate = new Date(b.scheduled_at);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + b.scheduled_duration_minutes);
  const endISO = icsDate(endDate.toISOString());
  const icsEvent: ICSEvent = {
    uid: `virtual-consult-${vc.id}`,
    start: startISO,
    end: endISO,
    summary: 'Meet Your Care Team — Virtual Consultation',
    description: `Your virtual consultation with your Morales-matched doctor.\n\nFull details are in your Morales dashboard.\n\nBooking Ref: ${String(vc.id).slice(-8).toUpperCase()}`,
    location: 'Video call — link in your Morales portal',
  };
  const icsContent = buildICS(consultation.patient_name || 'Patient', [icsEvent]);
  const googleCalLink = googleCalUrl(icsEvent.summary, icsEvent.start, icsEvent.end, icsEvent.description, icsEvent.location);

  let vaultId: string | null = null;
  try {
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(icsContent)));
    const vaultEntry = await base44.asServiceRole.entities.PassportVault.create({
      passport_token: `ICS_VC_${String(vc.id).slice(-8)}_${Date.now()}`,
      user_email: consultation.email,
      document_type: 'other',
      encrypted_file_uri: `data:text/calendar;base64,${b64}`,
      file_name: `Morales_Consultation_${String(vc.id).slice(-8)}.ics`,
      mime_type: 'text/calendar',
      file_size_bytes: icsContent.length,
      status: 'active',
      uploaded_at: nowISO,
      is_emergency_accessible: false,
    });
    vaultId = vaultEntry?.id ?? null;
  } catch (_) { /* calendar file storage is best-effort */ }

  await base44.asServiceRole.entities.VirtualConsultation.update(vc.id, { calendar_invite_sent_at: nowISO }).catch(() => {});

  if (consultation.email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Medical Travel Safety', to: consultation.email,
      subject: 'Your virtual consultation is booked | Morales Medical Travel Safety',
      body: linkOnlyEmail({
        from: 'bookVirtualConsultation/patient',
        title: 'Your virtual consultation is booked.',
        line: 'Meet the real care team, understand every step, and proceed only when you are confident. Your full booking details and calendar invite are ready in your Morales portal.',
        ctaLabel: 'Open My Consultations',
        ctaUrl: `${APP_URL}/dashboard`,
      }),
    }).catch(() => {});
  }
  if (doctor.email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Morales Medical Travel Safety', to: doctor.email,
      subject: 'A new virtual consultation needs your confirmation | Morales Medical Travel Safety',
      body: linkOnlyEmail({
        from: 'bookVirtualConsultation/doctor',
        title: 'You have a new virtual consultation request.',
        line: 'A prospective patient has booked a virtual consultation. Full details are in your doctor dashboard.',
        ctaLabel: 'Open Doctor Dashboard',
        ctaUrl: `${APP_URL}/doctor-dashboard`,
      }),
    }).catch(() => {});
  }

  // ── Proactive chat bubble — only when a real case already exists, since
  //    logJourneyEvent requires a real case_id ─────────────────────────────
  if (caseRecord?.id && consultation.email) {
    await logJourneyEvent(base44, {
      case_id: caseRecord.id,
      client_email: consultation.email,
      event_type: 'virtual_consultation_confirmed',
      source: 'bookVirtualConsultation',
      message_text: 'Your virtual consultation with your care team is booked. I\'ve sent a calendar invite and I\'ll remind you before it starts.',
      priority: 'medium',
      action_taken: `Booked a virtual consultation with Dr. ${doctor.full_name || 'your matched doctor'}`,
      tool_result: { virtual_consultation_id: vc.id, scheduled_at: b.scheduled_at },
    });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'virtual_consultation_booked',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'VirtualConsultation', resource_id: vc.id, case_id: caseRecord?.id || null,
    sensitive: true, timestamp: nowISO,
    details: { doctor_id: b.doctor_id, scheduled_at: b.scheduled_at },
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    virtual_consultation_id: vc.id,
    status: 'confirmed',
    video_configured: !!room?.supported,
    video_room_url: room?.supported ? room.room_url : null,
    ics_content: icsContent,
    google_cal_url: googleCalLink,
    vault_id: vaultId,
    interpreter_languages_differ: interpreterAssessment.languages_differ,
  });
}, { name: 'bookVirtualConsultation', requireAuth: true, bodySchema }));
