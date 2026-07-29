// DUPLICATED from base44/functions/_shared/conditionBuckets.ts — see createHandler.ts in this
// same directory for why. Keep in sync by hand.

// ── Condition bucket taxonomy ───────────────────────────────────────────────────
// Buckets a patient's free-text/array medical-condition data into a small, fixed
// set of tags for the anonymized memory-bank match. Deliberately coarse and
// deliberately never returns the raw condition text — only these tags may ever
// reach OutcomeRecord (admin/platform_admin-only, anonymized by default).
//
// Handles both shapes present in this codebase: CaseRecord.medical_conditions
// (comma-joined string) and Consultation.medical_conditions (string[]).

export const CONDITION_BUCKETS = [
  'diabetes',
  'hypertension',
  'cardiac',
  'respiratory',
  'autoimmune',
  'thyroid',
  'oncology_history',
  'renal_hepatic',
  'bleeding_clotting',
  'mental_health',
] as const;

export type ConditionBucket = (typeof CONDITION_BUCKETS)[number] | 'none_noted';

const KEYWORDS: Record<(typeof CONDITION_BUCKETS)[number], RegExp> = {
  diabetes: /diabet/i,
  hypertension: /hypertension|high blood pressure|blood pressure/i,
  cardiac: /cardiac|heart|arrhythmia|coronary/i,
  respiratory: /asthma|copd|respirator|\blung/i,
  autoimmune: /autoimmune|lupus|rheumatoid|crohn|celiac/i,
  thyroid: /thyroid/i,
  oncology_history: /cancer|oncolog|tumou?r|chemo/i,
  renal_hepatic: /kidney|renal|liver|hepatic/i,
  bleeding_clotting: /bleed|clot|hemophilia|anticoagul|blood thinner/i,
  mental_health: /depress|anxiet|bipolar|mental health|psychiatric/i,
};

function toList(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string' && raw.trim()) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function bucketConditions(raw: string | string[] | null | undefined): ConditionBucket[] {
  const items = toList(raw);
  if (items.length === 0) return ['none_noted'];

  const joined = items.join(' ; ');
  const tags = new Set<ConditionBucket>();
  for (const bucket of CONDITION_BUCKETS) {
    if (KEYWORDS[bucket].test(joined)) tags.add(bucket);
  }
  return tags.size > 0 ? Array.from(tags) : ['none_noted'];
}
