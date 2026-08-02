// ── PHI minimization for subprocessor calls ───────────────────────────────────
// Redacts direct identifiers from free text before it is sent to a third-party
// subprocessor that has NO BAA in place (currently the LLM providers behind
// InvokeLLM). This does NOT make the vendor HIPAA-covered — that requires a BAA
// or removing the vendor — but it limits how much identifiable data leaves our
// boundary, which is the responsible baseline while operating on patient consent.
//
// Deliberately conservative: it strips clear identifiers (email, phone, passport/
// ID numbers, long digit runs) and leaves clinical wording intact so the concierge
// can still help. First names are passed via structured context, not scrubbed here.

export function scrubPHI(input: unknown): string {
  if (typeof input !== 'string' || !input) return '';
  let t = input;

  // Email addresses
  t = t.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]');

  // Phone numbers: an international +NN… form, or a separated run of 10+ digits.
  // The 10-digit floor avoids clobbering dates / dosages / vitals.
  t = t.replace(/(\+\d[\d\s().-]{7,}\d)|(\b\d[\d\s().-]{8,}\d\b)/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 10 ? '[phone]' : m;
  });

  // Passport / national-ID style: 1-2 letters followed by 6-9 digits.
  t = t.replace(/\b[A-Z]{1,2}\d{6,9}\b/gi, '[id]');

  // Any remaining long standalone digit run (9+): card/account/ID numbers.
  t = t.replace(/\b\d{9,}\b/g, '[number]');

  return t;
}
