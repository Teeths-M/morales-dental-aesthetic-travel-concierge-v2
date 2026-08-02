// ── Pre-op preparation checklist (deterministic, conservative) ───────────────
// "The system knows what you need to get ready." This is CLINICALLY SENSITIVE, so it
// is rule-driven and deliberately conservative: it gives universal prep and PROMPTS to
// confirm specifics with the doctor — it NEVER tells a patient to stop a medication or
// sets an exact fasting window on its own. AI may translate/phrase these items; it may
// not decide them. (M Principle: deterministic decides, AI narrates.)

export interface PreOpProfile {
  procedures?: string[];
  takes_medications?: boolean;
  anesthesia_history?: boolean;   // prior anaesthesia complications on file
  smoker?: boolean;
  has_companion?: boolean;
  is_surgical?: boolean;          // procedure likely involves anaesthesia/sedation
}

export interface ChecklistItem { category: string; text: string; confirm_with_doctor: boolean }

// Heuristic: does this look like a procedure that usually involves anaesthesia/sedation?
const SURGICAL_HINTS = ['surgery', 'implant', 'rhinoplasty', 'lipo', 'graft', 'augmentation',
  'reduction', 'lift', 'extraction', 'bariatric', 'transplant', 'reconstruction'];

export function looksSurgical(procedures: string[] = []): boolean {
  const text = procedures.join(' ').toLowerCase();
  return SURGICAL_HINTS.some((h) => text.includes(h));
}

export function buildPreOpChecklist(profile: PreOpProfile): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const surgical = profile.is_surgical ?? looksSurgical(profile.procedures);

  // Universal prep — always safe.
  items.push({ category: 'documents', confirm_with_doctor: false,
    text: 'Bring your passport and a copy of your Morales itinerary (it is in your portal).' });
  items.push({ category: 'timing', confirm_with_doctor: false,
    text: 'Arrive at the clinic at least 30 minutes before your appointment.' });
  items.push({ category: 'comfort', confirm_with_doctor: false,
    text: 'Wear loose, comfortable clothing on the day of your procedure.' });

  // Fasting — only when anaesthesia is likely, and always defer the exact window.
  if (surgical || profile.anesthesia_history) {
    items.push({ category: 'fasting', confirm_with_doctor: true,
      text: 'You may need to stop eating and drinking for a period before your procedure. Your clinic will confirm the exact window — please follow it carefully.' });
  }

  // Medication — NEVER instruct a stop; prompt to confirm with the doctor.
  if (profile.takes_medications) {
    items.push({ category: 'medication', confirm_with_doctor: true,
      text: 'You told us you take medication. Your doctor will tell you which (if any) to pause and when. Do not stop any medication on your own.' });
  }

  // Prior anaesthesia complications — flag for the care team.
  if (profile.anesthesia_history) {
    items.push({ category: 'medication', confirm_with_doctor: true,
      text: 'Because you have had anaesthesia complications before, remind your care team so they can plan for it.' });
  }

  // Lifestyle.
  if (profile.smoker) {
    items.push({ category: 'lifestyle', confirm_with_doctor: true,
      text: 'Avoiding smoking for a day or two before your procedure helps healing. Your doctor can advise what is best for you.' });
  }

  // Support after the procedure.
  if (profile.has_companion === false) {
    items.push({ category: 'support', confirm_with_doctor: false,
      text: 'Arrange for someone to be with you after your procedure — or ask us to arrange a recovery companion.' });
  }

  // Close the loop.
  items.push({ category: 'timing', confirm_with_doctor: false,
    text: 'Confirm your procedure date and arrival time in your Morales portal.' });

  return items;
}
