import { createHandler, ok } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// openMcareScanner — the real tool M-Care calls to trigger the inline
// scanner card (per MessageBubble.jsx's tool-name-match render pattern, the
// same mechanism computeSafeTScreening/safeT4LifeScan use for SafetyGateCard).
//
// Deliberately tiny and LLM-free: it only resolves who is asking (never a
// client-suppliable owner — the whole point is a caller can never scan a
// document into someone else's vault) and gives the scanner UI a best-guess
// document_type hint from the user's own words via a fixed keyword map, never
// an AI classification. Real classification happens after capture, in
// scanVaultDocument, from the actual image — this function never sees or
// touches a file.

const ROLE_TO_OWNER_TYPE: Record<string, string> = {
  doctor: 'doctor',
  travel_agency: 'travel_agency',
  taxi_service: 'driver',
  driver: 'driver',
  companion: 'companion',
  security_agency: 'security_agency',
};

// Ordered — first match wins. Deliberately conservative: an ambiguous phrase
// falls through to 'other' rather than guessing, matching the spec's own
// "never silently classify when unsure" rule (the real classifier applies
// this same discipline again, with much more signal, after the scan).
const HINT_KEYWORDS: Array<[RegExp, string]> = [
  [/passport/i, 'passport'],
  [/national\s*id|identity\s*card/i, 'national_id'],
  [/driver'?s?\s*licen[cs]e/i, 'drivers_license'],
  [/medical\s*licen[cs]e/i, 'doctor_license'],
  [/board\s*certif|professional\s*certif/i, 'professional_certificate'],
  [/insurance/i, 'insurance_document'],
  [/visa/i, 'visa'],
  [/flight|boarding\s*pass|itinerary/i, 'flight_document'],
  [/hotel|accommodation/i, 'hotel_confirmation'],
  [/invoice|receipt/i, 'invoice'],
  [/consent/i, 'consent_document'],
  [/lab\s*result|blood\s*work/i, 'lab_result'],
  [/prescription/i, 'prescription'],
  [/medical\s*report/i, 'medical_report'],
  [/medical\s*record|chart/i, 'medical_record'],
  [/security\s*credential/i, 'security_credential'],
  [/credential|license|licence/i, 'partner_credential'],
  [/travel\s*document/i, 'travel_document'],
];

function guessDocumentType(hintText: string): string | null {
  const text = (hintText || '').slice(0, 300);
  for (const [pattern, type] of HINT_KEYWORDS) {
    if (pattern.test(text)) return type;
  }
  return null;
}

const bodySchema = strictObject({
  hint_text: Fields.optionalText(300),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { hint_text } = await body();

  const owner_type = ROLE_TO_OWNER_TYPE[user!.role] || 'patient';
  const owner_email = user!.email;
  const document_type_hint = guessDocumentType(hint_text);

  // Best-effort owner_id resolution — informational only, never blocks opening.
  let owner_id = '';
  try {
    if (owner_type === 'patient') {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: owner_email }, '-created_date', 1);
      owner_id = cases?.[0]?.id || '';
    } else if (owner_type === 'doctor') {
      const docs = await base44.asServiceRole.entities.Doctor.filter({ email: owner_email }, '-created_date', 1);
      owner_id = docs?.[0]?.id || '';
    }
  } catch (_) { /* best-effort */ }

  return ok({
    opened: true,
    owner_type,
    owner_email,
    owner_id,
    document_type_hint,
  });
}, { name: 'openMcareScanner', requireAuth: true, bodySchema }));
