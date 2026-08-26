import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { mapDoctorTrustStatus } from '../../shared/providerTrustStatus.ts';

/**
 * getDecisionRoomSummary — the real, aggregated post-call "Decision Room"
 * view: the doctor's own written plan, real risk data (getCaseRiskSummary if
 * a real case exists yet, an honest Consultation-only subset otherwise —
 * see VirtualConsultation.jsonc's own "Finding A" header note), a real
 * comparison against other verified doctors (via matchDoctorsForProcedure,
 * current doctor excluded), and any real unanswered questions from the Care
 * Room thread if one exists. No LLM call anywhere in this file.
 */

const bodySchema = strictObject({ virtual_consultation_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { virtual_consultation_id } = await body<{ virtual_consultation_id: string }>();

  const vc = await base44.asServiceRole.entities.VirtualConsultation.get(virtual_consultation_id).catch(() => null);
  if (!vc) return err('Consultation not found', 404);

  const isOwner = user!.email === vc.client_email;
  const isAdmin = ['admin', 'platform_admin'].includes(user!.role);
  if (!isOwner && !isAdmin) return err('Forbidden', 403);

  const consultation = await base44.asServiceRole.entities.Consultation.get(vc.consultation_id).catch(() => null);

  // ── Risk data ────────────────────────────────────────────────────────────
  let riskSummary: any = null;
  let riskSource: 'case' | 'consultation_only' = 'consultation_only';
  if (vc.case_id) {
    const res = await base44.functions.invoke('getCaseRiskSummary', { case_id: vc.case_id }).catch(() => null);
    riskSummary = res?.data || res || null;
    if (riskSummary) riskSource = 'case';
  }
  if (!riskSummary) {
    // Honest, smaller subset — no CaseRecord exists yet, so the real
    // deterministic risk engine can't run. Never fabricate a fuller picture.
    riskSummary = {
      overall_severity: 'monitor',
      risk_items: [],
      note: 'A full case review runs once you proceed to booking — this consultation was booked before a case exists yet.',
    };
  }

  // ── Comparison against other verified options ───────────────────────────
  let comparison: any[] = [];
  if (consultation?.procedure_interest) {
    const matchRes = await base44.functions.invoke('matchDoctorsForProcedure', {
      procedure_interest: consultation.procedure_interest,
      client_email: vc.client_email,
    }).catch(() => null);
    const matched = (matchRes?.data || matchRes)?.matched_doctors || [];
    comparison = (matched as any[])
      .filter((d) => d.id !== vc.doctor_id)
      .slice(0, 5)
      .map((d) => ({
        id: d.id, name: d.name, clinic_country: d.clinic_country, clinic_city: d.clinic_city,
        rating: d.rating, years_experience: d.years_experience, verification_status: d.verification_status,
      }));
  }

  // ── Unanswered questions from the real Care Room thread, if one exists ──
  let unansweredQuestions: any[] = [];
  if (vc.case_id) {
    const messages = await base44.asServiceRole.entities.QuoteMessage.filter({ case_id: vc.case_id }).catch(() => []);
    unansweredQuestions = (messages as any[])
      .filter((m) => m.message_type === 'info_request' && m.status !== 'answered')
      .slice(0, 20)
      .map((m) => ({ id: m.id, body: m.body, from_party: m.from_party, created_at: m.created_at }));
  }

  const doctor = await base44.asServiceRole.entities.Doctor.get(vc.doctor_id).catch(() => null);

  return ok({
    virtual_consultation_id,
    clinician_plan: {
      summary: vc.doctor_plan_summary || null,
      included: Array.isArray(vc.doctor_plan_included) ? vc.doctor_plan_included : [],
      excluded: Array.isArray(vc.doctor_plan_excluded) ? vc.doctor_plan_excluded : [],
      submitted_at: vc.doctor_plan_submitted_at || null,
    },
    cost: {
      estimated_amount: vc.price_amount ?? null,
      currency: vc.price_currency || 'USD',
      payment_status: vc.payment_status,
      note: 'Consultation cost only. A full procedure cost estimate is available once you proceed to booking.',
    },
    risk: riskSummary,
    risk_source: riskSource,
    provider_trust_status: doctor ? mapDoctorTrustStatus(doctor) : 'not_available',
    comparison,
    unanswered_questions: unansweredQuestions,
    decision_recorded: {
      next_step: vc.decision_next_step || null,
      at: vc.decision_next_step_at || null,
    },
  });
}, { name: 'getDecisionRoomSummary', requireAuth: true, bodySchema }));
