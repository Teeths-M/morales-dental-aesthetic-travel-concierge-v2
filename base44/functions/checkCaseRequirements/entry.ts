import { createHandler, ok, err } from '../../shared/createHandler.ts';

/**
 * checkCaseRequirements — the real "what's missing" check behind M-Care's
 * autonomous case-management framing (see RULE 37 in m_care.jsonc). Fully
 * deterministic: no LLM, no external call, just the caller's real
 * CaseRecord + Consultation fields and real VaultDocument records compared
 * against a fixed, honest checklist. Never invents a requirement this app
 * doesn't already treat as real elsewhere.
 *
 * The passport-validity rule (180-day / 6-month sentinel) is ported from
 * src/lib/travelReadiness.js's real, already-shipped logic — that file is a
 * frontend-only pure module, not importable into this Deno runtime, so the
 * threshold/wording is kept in sync manually here. Same tradeoff
 * getVisaRequirement/entry.ts's own LIVE_TO_APP comment already documents
 * for the exact same reason. 'unknown'/'attention' stay deliberately
 * distinct from a false 'present' — an unanswered question never renders
 * as a reassuring checkmark, matching travelReadiness.js's own stated
 * principle.
 */

const SENTINEL_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

type RequirementStatus = 'present' | 'missing' | 'attention' | 'not_applicable';

type RequirementItem = {
  key: string;
  label: string;
  status: RequirementStatus;
  detail: string;
};

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body<{ case_id?: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isOwner = !!user && user.email === caseRecord.client_email;
  const isAdmin = !!user && ['admin', 'platform_admin'].includes(user.role);
  if (!isOwner && !isAdmin) return err('Forbidden', 403);

  const consultation = caseRecord.consultation_id
    ? await base44.asServiceRole.entities.Consultation.get(caseRecord.consultation_id).catch(() => null)
    : null;

  const documents = await base44.asServiceRole.entities.VaultDocument.filter({
    owner_email: caseRecord.client_email,
    owner_type: 'patient',
  }).catch(() => []);
  const hasDoc = (type: string) => documents.some((d: any) => d.document_type === type);

  const items: RequirementItem[] = [];

  // ── Passport: real document presence + real 180-day validity rule ──────────
  items.push(hasDoc('passport')
    ? { key: 'passport_document', label: 'Passport on file', status: 'present', detail: 'A passport document is on file.' }
    : { key: 'passport_document', label: 'Passport on file', status: 'missing', detail: 'No passport document has been uploaded to the vault yet.' });

  const passportExpiry = consultation?.passport_expiry_date as string | undefined;
  const travelDate = (caseRecord.departure_date || caseRecord.procedure_date) as string | undefined;
  if (!passportExpiry) {
    items.push({
      key: 'passport_validity', label: 'Passport validity', status: 'attention',
      detail: "No passport expiry date on file yet — can't confirm it's valid for travel.",
    });
  } else {
    const expiry = new Date(passportExpiry);
    const reference = travelDate ? new Date(travelDate) : new Date();
    const daysAtTravel = Math.ceil((expiry.getTime() - reference.getTime()) / DAY_MS);
    if (daysAtTravel < 0) {
      items.push({
        key: 'passport_validity', label: 'Passport validity', status: 'attention',
        detail: travelDate
          ? 'The passport on file expires before the travel date — it will need to be renewed before flying.'
          : 'The passport on file has already expired.',
      });
    } else if (daysAtTravel < SENTINEL_DAYS) {
      items.push({
        key: 'passport_validity', label: 'Passport validity', status: 'attention',
        detail: `Only ${daysAtTravel} days of validity remain at the travel date — most countries require at least 6 months, so renewing first is the safe route.`,
      });
    } else {
      items.push({ key: 'passport_validity', label: 'Passport validity', status: 'present', detail: 'The passport on file has enough validity remaining.' });
    }
  }

  // ── Visa: real status + real document presence ──────────────────────────────
  const visaStatus = consultation?.visa_required_status as string | undefined;
  if (!visaStatus || visaStatus === 'unknown') {
    items.push({
      key: 'visa', label: 'Visa requirement', status: 'attention',
      detail: 'Visa requirement has not been confirmed yet — use getVisaRequirement or getTravelBriefing to check it.',
    });
  } else if (visaStatus === 'exempt') {
    items.push({ key: 'visa', label: 'Visa requirement', status: 'not_applicable', detail: 'No visa is required for this trip.' });
  } else {
    const needsDoc = !hasDoc('visa');
    items.push({
      key: 'visa', label: 'Visa requirement', status: needsDoc ? 'missing' : 'present',
      detail: needsDoc
        ? (visaStatus === 'evisa'
          ? 'An e-Visa is required and no visa document is on file yet.'
          : 'An embassy-issued visa is required (can take several weeks) and no visa document is on file yet.')
        : 'A visa document is on file.',
    });
  }

  // ── Consents: real boolean flags, never inferred ────────────────────────────
  items.push({
    key: 'data_processing_consent', label: 'Data processing consent',
    status: consultation?.data_processing_consent ? 'present' : 'missing',
    detail: consultation?.data_processing_consent ? 'Recorded.' : 'Not yet recorded.',
  });
  items.push({
    key: 'medical_history_share_consent', label: 'Medical history share consent',
    status: consultation?.medical_history_share_consent ? 'present' : 'missing',
    detail: consultation?.medical_history_share_consent
      ? 'Recorded — the care team can be given the medical history already disclosed.'
      : "Not yet recorded — needed before the traveler's medical history can be shared with a doctor.",
  });

  const missing = items.filter((i) => i.status === 'missing' || i.status === 'attention');
  const present = items.filter((i) => i.status === 'present' || i.status === 'not_applicable');

  return ok({ case_id, items, missing, present, checked_at: new Date().toISOString() });
}, { name: 'checkCaseRequirements', requireAuth: true }));
