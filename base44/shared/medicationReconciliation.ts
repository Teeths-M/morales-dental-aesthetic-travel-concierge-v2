// medicationReconciliation.ts — deterministic medication flag detection.
//
// Matches computeProcedureMatch.ts's own discipline exactly: no LLM, no
// network, no randomness. Detection is NOT diagnosis and NOT an interaction
// claim — this only ever compares real, already-on-file data and returns a
// list of human-readable flag codes. A flag routes a Medication to
// status: 'requires_review' for a real doctor to resolve; nothing here ever
// resolves a flag, blocks a booking, or asserts a combination is safe.
//
// No RxNorm/drug-database integration exists in this app today, so the
// allergy check below is a naive substring/keyword match against the
// patient's own on-file allergy text — explicitly NOT a cross-reactivity or
// drug-interaction database. That real capability is blocked on a vendor
// decision (same class of gap as Tavily/ExchangeRate-API elsewhere in this
// app) and is not faked here.

export interface ReconciliationInput {
  normalized_name?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  confidence?: number | null;
}

export interface ExistingMedication {
  normalized_name?: string | null;
  status?: string | null;
}

const AMBIGUOUS_CONFIDENCE_FLOOR = 50;
const ACTIVE_LIKE_STATUSES = new Set(['active', 'planned', 'reported', 'requires_review']);

function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

export function reconcileMedication(
  newMed: ReconciliationInput,
  existingActiveMeds: ExistingMedication[],
  patientAllergyText: string | null | undefined,
): { flags: string[] } {
  const flags: string[] = [];
  const newName = norm(newMed.normalized_name);

  // (a) Duplicate — same normalized name already active/planned/reported for this patient.
  if (newName) {
    const isDuplicate = (existingActiveMeds || []).some((m) =>
      ACTIVE_LIKE_STATUSES.has(String(m.status || '')) && norm(m.normalized_name) === newName);
    if (isDuplicate) flags.push('duplicate_active_medication');
  }

  // (b) Naive keyword match against the patient's own on-file allergy text.
  // Never a cross-reactivity/interaction database — a plain substring check only.
  const allergyText = norm(patientAllergyText);
  if (allergyText && allergyText !== 'none') {
    const candidates = [newMed.normalized_name, newMed.generic_name, newMed.brand_name]
      .map(norm)
      .filter((c) => c.length >= 3);
    const hit = candidates.some((c) => allergyText.includes(c));
    if (hit) flags.push('possible_allergy_conflict');
  }

  // (c) Missing critical details.
  if (!norm(newMed.dosage)) flags.push('missing_dosage_details');
  if (!norm(newMed.frequency)) flags.push('missing_frequency');

  // (d) Ambiguous / low-confidence extraction.
  const confidence = Number(newMed.confidence ?? 0);
  if (!confidence || confidence < AMBIGUOUS_CONFIDENCE_FLOOR) flags.push('ambiguous_extraction');

  return { flags };
}
