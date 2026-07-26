// ── Medication category taxonomy ────────────────────────────────────────────────
// Buckets a doctor's entered medication NAMES into a small, fixed set of category
// tags for the anonymized memory-bank match. Dose/frequency/duration/notes are
// never inspected here and must never reach the anonymized OutcomeRecord — only
// these category tags may.

export const MEDICATION_CATEGORIES = [
  'antibiotic',
  'pain_relief',
  'anti_inflammatory',
  'antiseptic_rinse',
  'anticoagulant_caution',
  'sedative_anxiolytic',
] as const;

export type MedicationCategory = (typeof MEDICATION_CATEGORIES)[number] | 'other';

const KEYWORDS: Record<(typeof MEDICATION_CATEGORIES)[number], RegExp> = {
  antibiotic: /amoxicillin|penicillin|antibiotic|cillin|azithromycin|clindamycin|cephalexin/i,
  pain_relief: /ibuprofen|acetaminophen|paracetamol|tylenol|pain relief|analgesic|opioid|codeine|tramadol/i,
  anti_inflammatory: /anti-?inflammatory|naproxen|nsaid|arnica/i,
  antiseptic_rinse: /chlorhexidine|antiseptic|mouthwash|\brinse/i,
  anticoagulant_caution: /warfarin|heparin|anticoagul|blood thinner|aspirin/i,
  sedative_anxiolytic: /sedative|anxiolytic|diazepam|xanax|lorazepam/i,
};

/** Buckets medication NAMES only. Never pass dose/frequency/notes into this. */
export function bucketMedicationNames(meds?: Array<{ name?: string }> | null): MedicationCategory[] {
  const names = Array.isArray(meds) ? meds.map((m) => m?.name || '').filter(Boolean) : [];
  if (names.length === 0) return [];

  const joined = names.join(' ; ');
  const tags = new Set<MedicationCategory>();
  for (const cat of MEDICATION_CATEGORIES) {
    if (KEYWORDS[cat].test(joined)) tags.add(cat);
  }
  if (tags.size === 0) tags.add('other');
  return Array.from(tags);
}
