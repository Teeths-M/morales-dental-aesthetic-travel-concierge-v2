import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { isFresh, TTL_MS } from '../../shared/freshness.ts';

/**
 * getCaseRiskSummary — a real, deterministic Risk Engine combining signals
 * that already exist elsewhere in this app into ONE severity view, per the
 * requested Critical / Needs attention / Monitor / Cleared vocabulary. No
 * LLM call anywhere in this file — every signal is either a plain read of
 * a real field/record or a re-derivation of an already-computed real check
 * (checkCaseRequirements, invoked directly, never duplicated). Nothing is
 * invented: a category with no real signal to report is simply omitted
 * rather than guessed at.
 *
 * Signals combined (all real, all already live elsewhere):
 *   - checkCaseRequirements: passport document/validity, visa status/doc,
 *     both real consent booleans.
 *   - SafeTScreening (base44/functions/_shared/safeTEngine.ts's real,
 *     deterministic decision — this file only ever READS the already-
 *     written decision, never re-scores anything itself).
 *   - MedGuard's real in-trip risk score, read from its own AuditLog entry
 *     (medguard_analysis) — the same pattern AdminMissionControl.jsx
 *     already uses to show a real score instead of a fabricated one.
 *   - VisaRequirementSnapshot's own freshness (a cheap, no-LLM read — this
 *     function never triggers a fresh visa lookup itself, since that would
 *     mean an LLM call hiding inside what's meant to be a fast, pure
 *     aggregator).
 *   - CaseRecord/Consultation fields already real elsewhere in this app:
 *     payment_status, requires_companion/companion_requirement_status,
 *     procedure_date/departure_date.
 *
 * Each returned risk item carries a fixed, reviewed why_it_matters/
 * next_step string (never LLM-authored) and a real evidence reference —
 * the underlying record's own type/id/detail, never a fabricated citation.
 */

type Severity = 'cleared' | 'monitor' | 'needs_attention' | 'critical';
const SEVERITY_RANK: Record<Severity, number> = { cleared: 0, monitor: 1, needs_attention: 2, critical: 3 };
function worst(a: Severity, b: Severity): Severity { return SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a; }

type RiskItem = {
  category: 'document_readiness' | 'visa_transit' | 'medical_safety' | 'travel_timing' | 'consent_payment' | 'companion_needs';
  label: string;
  severity: Severity;
  why_it_matters: string;
  evidence: Record<string, unknown>;
  owner: 'patient' | 'care_team' | 'doctor';
  next_step: string;
  deadline: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const bodySchema = strictObject({ case_id: Fields.shortText(100) });

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body<{ case_id: string }>();

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isOwner = !!user && user.email === caseRecord.client_email;
  const isAdmin = !!user && ['admin', 'platform_admin'].includes(user.role);
  if (!isOwner && !isAdmin) return err('Forbidden', 403);

  const consultation = caseRecord.consultation_id
    ? await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null)
    : null;

  const deadline = (caseRecord.procedure_date || caseRecord.departure_date || null) as string | null;

  const items: RiskItem[] = [];

  // ── document_readiness ────────────────────────────────────────────────────
  const reqRes = await base44.functions.invoke('checkCaseRequirements', { case_id }).catch(() => null);
  const reqItems: any[] = reqRes?.data?.items || [];
  const passportDocItem = reqItems.find((i) => i.key === 'passport_document');
  const passportValidityItem = reqItems.find((i) => i.key === 'passport_validity');

  let docSeverity: Severity = 'cleared';
  const docDetails: string[] = [];
  if (passportDocItem) {
    if (passportDocItem.status === 'missing') { docSeverity = worst(docSeverity, 'needs_attention'); docDetails.push(passportDocItem.detail); }
  }
  if (passportValidityItem) {
    if (passportValidityItem.status === 'attention') {
      // Re-derive just the expired/not-expired split (arithmetic only, not
      // a policy decision) so a genuinely expired passport reads as
      // critical rather than the same needs_attention as "a bit short."
      const expiry = consultation?.passport_expiry_date as string | undefined;
      const reference = deadline || null;
      let isExpired = false;
      if (expiry) {
        const daysAtTravel = Math.ceil((new Date(expiry).getTime() - new Date(reference || new Date().toISOString()).getTime()) / DAY_MS);
        isExpired = daysAtTravel < 0;
      }
      docSeverity = worst(docSeverity, isExpired ? 'critical' : 'needs_attention');
      docDetails.push(passportValidityItem.detail);
    }
  }
  if (docDetails.length > 0 || passportDocItem || passportValidityItem) {
    items.push({
      category: 'document_readiness',
      label: 'Passport readiness',
      severity: docSeverity,
      why_it_matters: 'A missing or soon-to-expire passport is one of the most common reasons a trip gets delayed at the airport, not before it.',
      evidence: { type: 'checkCaseRequirements', items: [passportDocItem, passportValidityItem].filter(Boolean) },
      owner: 'patient',
      next_step: docSeverity === 'cleared'
        ? 'Nothing to do right now.'
        : 'Upload or renew the passport, or ask M-Care to check the real destination-specific validity requirement.',
      deadline,
    });
  }

  // ── visa_transit ──────────────────────────────────────────────────────────
  const visaItem = reqItems.find((i) => i.key === 'visa');
  if (visaItem) {
    let visaSeverity: Severity = 'cleared';
    if (visaItem.status === 'missing') {
      visaSeverity = String(consultation?.visa_required_status || '') === 'embassy' ? 'critical' : 'needs_attention';
    } else if (visaItem.status === 'attention') {
      visaSeverity = 'needs_attention';
    }

    // Cheap, no-LLM freshness read of the last real visa determination —
    // never triggers a fresh lookup itself.
    let visaSnapshotFresh: boolean | null = null;
    const nationality = consultation?.nationality as string | undefined;
    const destination = caseRecord.procedure_country as string | undefined;
    if (nationality && destination) {
      const snap = (await base44.asServiceRole.entities.VisaRequirementSnapshot.filter(
        { nationality, destination_country: destination }, '-last_confirmed_at', 1,
      ).catch(() => []))?.[0];
      visaSnapshotFresh = snap ? isFresh(snap.last_confirmed_at, TTL_MS.visa_rule) : false;
      if (visaSnapshotFresh === false && visaSeverity === 'cleared') visaSeverity = 'monitor';
    }

    items.push({
      category: 'visa_transit',
      label: 'Visa / entry requirement',
      severity: visaSeverity,
      why_it_matters: 'An embassy-issued visa can take weeks to obtain — the biggest schedule risk in this category is finding out too late.',
      evidence: { type: 'checkCaseRequirements', item: visaItem, visa_check_fresh: visaSnapshotFresh },
      owner: 'patient',
      next_step: visaSeverity === 'cleared' ? 'Nothing to do right now.' : 'Confirm the current visa requirement and start any needed application early.',
      deadline,
    });
  }

  // ── medical_safety ───────────────────────────────────────────────────────
  if (consultation) {
    const screening = (await base44.asServiceRole.entities.SafeTScreening.filter(
      { consultation_ref: caseRecord.consultation_id, phase: 'decision' }, '-created_at', 1,
    ).catch(() => []))?.[0];
    const safetySeverity: Severity = !screening
      ? 'monitor'
      : screening.risk_level === 'review' ? 'critical'
      : screening.risk_level === 'elevated' ? 'needs_attention'
      : screening.risk_level === 'moderate' ? 'monitor'
      : 'cleared';
    items.push({
      category: 'medical_safety',
      label: 'Pre-trip medical safety screening',
      severity: safetySeverity,
      why_it_matters: 'A higher SAFE-T risk level means the case needs closer review before travel, per the platform\'s own safety gate.',
      evidence: screening
        ? { type: 'SafeTScreening', id: screening.id, risk_level: screening.risk_level, flags: screening.flags || [] }
        : { type: 'SafeTScreening', id: null, detail: 'No screening on file yet.' },
      owner: 'care_team',
      next_step: !screening ? 'Complete the SAFE-T screening.' : safetySeverity === 'cleared' ? 'Nothing to do right now.' : 'Care team review before this case proceeds further.',
      deadline: null,
    });
  }

  const medguardLog = (await base44.asServiceRole.entities.AuditLog.filter(
    { event_type: 'medguard_analysis', resource_id: case_id }, '-timestamp', 1,
  ).catch(() => []))?.[0];
  if (medguardLog) {
    const mgLevel = medguardLog.details?.risk_level as string | undefined;
    const mgSeverity: Severity = mgLevel === 'CRITICAL' ? 'critical' : mgLevel === 'ALERT' ? 'needs_attention' : mgLevel === 'WATCH' ? 'monitor' : 'cleared';
    items.push({
      category: 'medical_safety',
      label: 'In-trip safety monitoring (MedGuard)',
      severity: mgSeverity,
      why_it_matters: 'MedGuard tracks real check-in and location signals during active travel — a rising score means something on the ground needs a closer look.',
      evidence: { type: 'AuditLog', id: medguardLog.id, risk_level: mgLevel, score: medguardLog.details?.score },
      owner: 'care_team',
      next_step: mgSeverity === 'cleared' ? 'Nothing to do right now.' : 'Care team should review the traveler\'s recent check-in and location activity.',
      deadline: null,
    });
  }

  // ── travel_timing ────────────────────────────────────────────────────────
  if (!caseRecord.procedure_date && !caseRecord.departure_date) {
    items.push({
      category: 'travel_timing',
      label: 'Travel dates',
      severity: 'needs_attention',
      why_it_matters: 'Without a procedure or departure date, timing-sensitive items (visa lead time, passport renewal, document deadlines) can\'t be assessed against a real deadline.',
      evidence: { type: 'CaseRecord', fields: ['procedure_date', 'departure_date'], detail: 'Neither is set yet.' },
      owner: 'care_team',
      next_step: 'Confirm a procedure or departure date.',
      deadline: null,
    });
  } else if (deadline) {
    const daysToDeadline = Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS);
    const urgentDocsIssue = docSeverity !== 'cleared' || (visaItem && visaItem.status !== 'present' && visaItem.status !== 'not_applicable');
    if (daysToDeadline >= 0 && daysToDeadline < 45 && urgentDocsIssue) {
      items.push({
        category: 'travel_timing',
        label: 'Timing pressure',
        severity: 'needs_attention',
        why_it_matters: 'The travel date is close and a real document item is still outstanding — the two combined are a genuine schedule risk, not two separate minor items.',
        evidence: { type: 'CaseRecord', field: 'procedure_date/departure_date', days_to_deadline: daysToDeadline },
        owner: 'care_team',
        next_step: 'Prioritize the outstanding document item(s) above given how close the date is.',
        deadline,
      });
    }
  }

  // ── consent_payment ──────────────────────────────────────────────────────
  const dataConsent = !!consultation?.data_processing_consent;
  const medConsent = !!consultation?.medical_history_share_consent;
  const paymentStatus = String(caseRecord.payment_status || 'Pending');
  let cpSeverity: Severity = 'cleared';
  const cpDetails: string[] = [];
  if (!dataConsent) { cpSeverity = worst(cpSeverity, 'critical'); cpDetails.push('Data-processing consent not yet recorded.'); }
  if (!medConsent) { cpSeverity = worst(cpSeverity, 'needs_attention'); cpDetails.push('Medical-history-share consent not yet recorded — needed before a doctor can be given the medical history.'); }
  if (paymentStatus === 'Failed') { cpSeverity = worst(cpSeverity, 'critical'); cpDetails.push('Last payment attempt failed.'); }
  else if (paymentStatus === 'Refunded') { cpSeverity = worst(cpSeverity, 'monitor'); cpDetails.push('This case has a refund on record — worth confirming the case is still active as intended.'); }
  else if (paymentStatus !== 'Paid In Full') { cpSeverity = worst(cpSeverity, 'monitor'); cpDetails.push(`Payment status: ${paymentStatus}.`); }
  items.push({
    category: 'consent_payment',
    label: 'Consent & payment status',
    severity: cpSeverity,
    why_it_matters: 'Both consents are real prerequisites elsewhere in this app (sharing medical history, proceeding with booking) — a missing one silently blocks a later step rather than failing loudly.',
    evidence: { type: 'Consultation/CaseRecord', data_processing_consent: dataConsent, medical_history_share_consent: medConsent, payment_status: paymentStatus },
    owner: 'patient',
    next_step: cpDetails.length ? cpDetails.join(' ') : 'Nothing to do right now.',
    deadline: null,
  });

  // ── companion_needs ──────────────────────────────────────────────────────
  if (caseRecord.requires_companion) {
    const status = String(caseRecord.companion_requirement_status || 'not_required');
    const compSeverity: Severity =
      status === 'assigned' || status === 'not_required' ? 'cleared'
      : status === 'companion_declined_with_waiver' ? 'monitor'
      : 'needs_attention';
    items.push({
      category: 'companion_needs',
      label: 'Companion requirement',
      severity: compSeverity,
      why_it_matters: 'A required companion who isn\'t yet assigned is a real gap the traveler will feel on the ground, not just on paper.',
      evidence: { type: 'CaseRecord', field: 'companion_requirement_status', status },
      owner: 'patient',
      next_step: compSeverity === 'cleared' ? 'Nothing to do right now.' : 'Confirm or assign the required companion.',
      deadline,
    });
  }

  const overallSeverity = items.reduce((acc, i) => worst(acc, i.severity), 'cleared' as Severity);

  return ok({
    case_id,
    overall_severity: overallSeverity,
    risk_items: items,
    computed_at: new Date().toISOString(),
  });
}, { name: 'getCaseRiskSummary', requireAuth: true, bodySchema }));
