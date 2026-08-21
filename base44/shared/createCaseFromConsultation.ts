// ── Case Creation ──────────────────────────────────────────────────────────
// The ONE place a CaseRecord gets built from a Consultation (the marketplace
// entry point: high-risk gate, Safe-T scan, doctor fan-out). Extracted from
// iq200Pipeline's admin-only `create` action so `pipelineOnConsultationFeePaid`
// (a cron/webhook trigger with no user session) can call the same logic
// in-process — no HTTP round-trip, no auth-forwarding needed.
//
// Why this exists: for a real payment (Stripe checkout redirect, the only
// live method), nothing used to call this. iq200Pipeline's `create` action
// required an admin session; the one client-side call to it ran as the
// paying PATIENT and always 403'd (caught, logged, silently ignored);
// stripePaymentWebhook's payment handler never called it either. Net effect:
// no CaseRecord — and therefore no doctor ever assigned — was created for
// any real patient. pipelineOnConsultationFeePaid already fires reliably
// (cron-authorized entity-trigger on ConsultationFee.fee_paid) and is now
// the guaranteed-to-fire trigger for this too.
import { linkOnlyEmail } from './notify.ts';
import { buildInformedConsentHtml } from './informedConsentArchive.ts';
import { createMedicationFromText } from './createMedicationFromText.ts';

export async function createCaseFromConsultation(base44: any, consultation_id: string): Promise<any> {
  const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);

  if (!consultation) {
    return { error: 'Consultation not found', status: 404 };
  }

  // IDEMPOTENCY: return existing CaseRecord if already created
  const existing = await base44.asServiceRole.entities.CaseRecord.filter({ consultation_id });
  if (existing && existing.length > 0) {
    return {
      success: true,
      case_record: existing[0],
      case_id: existing[0].id,
      already_exists: true,
      message: 'CaseRecord already exists for this consultation',
    };
  }

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.create({
    consultation_id: consultation.id,
    client_name: consultation.patient_name,
    client_email: consultation.email,
    client_phone: consultation.phone,
    client_country: consultation.client_country,
    emergency_contact: consultation.emergency_contact_name,
    procedure_country: consultation.destination_country,
    procedures: [consultation.procedure_interest],
    consultation_summary: consultation.notes || 'No summary provided',
    medications: consultation.takes_medications ? consultation.medication_types?.join(', ') : 'None',
    allergies: consultation.allergies?.join(', ') || 'None',
    smoking_status: consultation.lifestyle_habits?.includes('Smoking'),
    alcohol_use: consultation.lifestyle_habits?.includes('Alcohol') ? 'Moderate' : 'None',
    medical_conditions: consultation.medical_conditions?.join(', ') || 'None',
    anesthesia_history: consultation.anesthesia_complications ? 'Previous complications' : 'No complications',
    mental_health_notes: consultation.emotional_notes || 'N/A',
    pregnancy_status: consultation.pregnancy_status === 'Yes',
    exercise_level: consultation.activity_level || 'Moderate',
    // Signed liability/arbitration disclosure — already durably captured on the
    // Consultation at booking-submission time (Booking.jsx's MedicalRiskDisclosure
    // step, well before payment). Copying it here is all that's needed to make
    // the archive below real — no client payment call ever has to carry it.
    signature_data: consultation.signature_data || '',
    accepted_arbitration_clause: !!consultation.accepted_arbitration_clause,
    signature_timestamp: consultation.signature_timestamp || consultation.created_date,
    status: 'Submitted',
    safe_t_result: 'PENDING',
    timeline_log: [{
      timestamp: new Date().toISOString(),
      action: 'created',
      details: 'Case created from consultation'
    }]
  });

  // ── Structured medication seeding from intake ────────────────────────────
  // consultation.medication_notes is the ONE intake field that can carry real
  // drug names/doses (medication_types above is just checkbox categories) —
  // it used to be silently dropped here entirely, meaning nothing a patient
  // actually typed at intake ever reached a real medication record. Seeds via
  // the exact same normalize/reconcile/create path reportMedication uses, so
  // an intake-reported medication still requires the same patient-confirm
  // step as any other source before it counts as active.
  if (consultation.medication_notes && String(consultation.medication_notes).trim()) {
    try {
      await createMedicationFromText(base44, {
        case_id: caseRecord.id,
        patient_email: consultation.email,
        doctor_email: '',
        raw_text: String(consultation.medication_notes),
        source_type: 'patient',
        source_record_id: consultation.id,
        reported_by_email: consultation.email,
        reported_by_note: 'Reported at intake',
        allergy_text: caseRecord.allergies,
      });
    } catch (e: any) {
      console.error('[createCaseFromConsultation] Medication seeding failed (non-fatal):', e?.message);
    }
  }

  // ── Informed consent archive — only for consultations that actually went
  // through the signature step (Booking.jsx today; /intake has no equivalent
  // step yet). Absence is not an error, just nothing to archive.
  if (consultation.signature_data) {
    try {
      const html = buildInformedConsentHtml({
        clientName: consultation.patient_name || 'Valued Client',
        clientEmail: consultation.email,
        procedures: consultation.procedure_interest,
        signatureData: consultation.signature_data,
        signatureTimestamp: consultation.signature_timestamp,
        signatureIp: consultation.signature_ip_address,
        acceptedArbitration: consultation.accepted_arbitration_clause,
      });
      await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
        informed_consent_email_html: html,
        informed_consent_email_sent_at: new Date().toISOString(),
      });
      if (consultation.email) {
        const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: consultation.email,
          from_name: 'Morales Travel Concierge',
          subject: '⚖️ Informed Consent Confirmed — SAFE-T 4LIFE™',
          body: linkOnlyEmail({
            title: 'Your consent and payment receipt are ready',
            line: 'View and download your signed consent and payment receipt in your Morales portal.',
            ctaUrl: `${appUrl}/dashboard`,
            ctaLabel: 'Open My Portal',
            from: 'createCaseFromConsultation',
          }),
        });
      }
    } catch (e) {
      // Archive/email failure must never block case creation, which already succeeded.
      console.error('[createCaseFromConsultation] Consent archive/email failed (non-fatal):', e.message);
    }
  }

  // AUTO-ASSIGN: Fetch default doctor from DB (admin-configurable via DefaultDoctorConfig entity)
  // HIGH-RISK GATE: Skip auto-assignment entirely for flagged consultations.
  // These stay at Admin-Review until a concierge admin manually clears and assigns.
  if (consultation.high_risk_medical_review === true) {
    await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, {
      status: 'Admin-Review',
      timeline_log: [
        ...(caseRecord.timeline_log || []),
        {
          timestamp: new Date().toISOString(),
          action: 'high_risk_hold',
          details: `Case held for Senior Medical Review — flagged condition: ${consultation.high_risk_flagged_condition || 'high-risk condition'}. Doctor assignment blocked until admin clears.`
        }
      ]
    });

    // Notify Slack — fire-and-forget, never blocks the pipeline
    base44.functions.invoke('notifySlackHighRisk', {
      patient_name: consultation.patient_name,
      flagged_condition: consultation.high_risk_flagged_condition || 'High-risk condition',
      procedure: consultation.procedure_interest,
      case_id: caseRecord.id,
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch((e: any) => console.error('[createCaseFromConsultation] Slack notify failed (non-fatal):', e.message));
  }

  // ── SAFETY-FIRST: deterministic Safe-T scan BEFORE any doctor is contacted ─
  // MARKETPLACE MODEL: matched specialist doctors are INVITED to quote once
  // Safe-T clears, and the PATIENT chooses (requestDoctorQuotes → selectDoctorQuote).
  // No doctor is contacted, and no proposal is sent, until Safe-T has genuinely cleared.
  try {
    await base44.functions.invoke('safeT4LifeScan', { caseId: caseRecord.id });
  } catch (scanError: any) {
    console.error('[createCaseFromConsultation] Safe-T scan failed:', scanError.message);
  }

  // Re-read the authoritative safe_t_result the scan wrote to the case.
  const scanned = await base44.asServiceRole.entities.CaseRecord.get(caseRecord.id).catch(() => caseRecord);
  const safeTCleared = scanned?.safe_t_result === 'PASSED';

  // A harmless proposal token for later. The proposal is now sent only AFTER the
  // patient picks a doctor and the package is assembled — NEVER here.
  const proposalToken = `prop_${caseRecord.id}`;
  await base44.asServiceRole.entities.CaseRecord.update(caseRecord.id, { proposal_token: proposalToken }).catch(() => {});

  // ── MARKETPLACE FAN-OUT — FAIL-CLOSED ────────────────────────────────────
  // Invite matched specialists to quote ONLY when Safe-T cleared AND the case is
  // not held for high-risk review. Otherwise no doctor is contacted; the case waits
  // for a human (Admin-Review) or a signed waiver. requestDoctorQuotes re-checks the
  // same gate defensively.
  let doctorsInvited = false;
  if (safeTCleared && consultation.high_risk_medical_review !== true) {
    try {
      const r = await base44.functions.invoke('requestDoctorQuotes', { case_id: caseRecord.id });
      doctorsInvited = !!(r?.data?.fanned_out ?? r?.fanned_out);
    } catch (e: any) {
      console.error('[createCaseFromConsultation] requestDoctorQuotes failed (non-fatal):', e.message);
    }
  }

  return {
    status: 'CREATED',
    case_id: caseRecord.id,
    proposal_token: proposalToken,
    safe_t_result: scanned?.safe_t_result || 'PENDING',
    doctors_invited: doctorsInvited,
    message: doctorsInvited
      ? 'Case created. Safe-T cleared — matched specialist doctors invited to quote; the patient will choose.'
      : (consultation.high_risk_medical_review === true
        ? 'Case created and held for Senior Medical Review — no doctor contacted.'
        : 'Case created. Safe-T review initiated — no doctor contacted until it clears.'),
  };
}
