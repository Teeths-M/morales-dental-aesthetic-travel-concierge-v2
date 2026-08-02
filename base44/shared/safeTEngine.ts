// ── SAFE-T deterministic scoring engine ───────────────────────────────────────
// The ONLY thing allowed to compute a patient SAFE-T risk_level. Pure, explicit
// rules — no LLM, no network, no randomness. Same inputs always produce the same
// decision, and it can be replayed/audited. The AI is never asked to weigh in;
// it only narrates the object this returns.
//
// FAIL CLOSED: missing critical inputs, detected prompt-injection, or pregnancy
// escalate to 'review' (needs human/specialist clearance) — never 'low'.

export const SAFET_ENGINE_VERSION = 'safeT-deterministic-1.0';

export type SafeTDecision = {
  risk_level: 'low' | 'moderate' | 'elevated' | 'review';
  score: number;
  flags: string[];
  factors: Record<string, number>;
  engine_version: string;
  fail_closed_reason?: string;
};

export type SafeTProfileInput = {
  procedure?: string;
  age?: number | string;
  bmi?: number | string;
  medical_conditions?: string[] | string;
  medications?: string[] | string;
  allergies?: string[] | string;
  anesthesia_complications?: boolean;
  had_surgery?: boolean;
  had_complications?: boolean;
  lifestyle?: string[] | string;
  emotional_concerns?: boolean;
  pregnancy_status?: string;
  injection_flagged?: boolean;
};

const SERIOUS_CONDITIONS = [
  'heart', 'cardiac', 'coronary', 'arrhythmia', 'stroke', 'clot', 'thrombosis',
  'embolism', 'bleeding disorder', 'hemophilia', 'diabetes', 'hypertension',
  'kidney', 'renal', 'liver', 'hepatic', 'cancer', 'tumor', 'immunodeficiency',
  'copd', 'respiratory', 'seizure', 'epilepsy', 'autoimmune', 'lupus',
];
const BLOOD_THINNERS = [
  'warfarin', 'coumadin', 'heparin', 'anticoagulant', 'blood thinner',
  'apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'clopidogrel', 'plavix',
  'aspirin', 'dabigatran', 'pradaxa',
];
const RISKY_LIFESTYLE = ['smok', 'tobacco', 'heavy alcohol', 'alcohol', 'drug'];

function toList(v: string[] | string | undefined): string {
  if (Array.isArray(v)) return v.join(' ').toLowerCase();
  return String(v || '').toLowerCase();
}
function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function computeSafeT(profile: SafeTProfileInput): SafeTDecision {
  const factors: Record<string, number> = {};
  const flags: string[] = [];

  // ── Hard fail-closed conditions → immediate 'review' ────────────────────────
  if (profile.injection_flagged) {
    return { risk_level: 'review', score: 100, flags: ['Input flagged for manual review'], factors: { injection: 100 }, engine_version: SAFET_ENGINE_VERSION, fail_closed_reason: 'injection_detected' };
  }
  if (!profile.procedure || String(profile.procedure).trim() === '' || String(profile.procedure).toLowerCase().includes('not specified')) {
    return { risk_level: 'review', score: 100, flags: ['Procedure not specified — specialist review required'], factors: { incomplete: 100 }, engine_version: SAFET_ENGINE_VERSION, fail_closed_reason: 'incomplete_profile' };
  }
  const preg = String(profile.pregnancy_status || '').toLowerCase();
  if (preg.includes('pregnant') && !preg.includes('not')) {
    return { risk_level: 'review', score: 100, flags: ['Pregnancy — elective procedures require specialist clearance'], factors: { pregnancy: 100 }, engine_version: SAFET_ENGINE_VERSION, fail_closed_reason: 'pregnancy' };
  }

  const conditions = toList(profile.medical_conditions);
  const meds = toList(profile.medications);
  const lifestyle = toList(profile.lifestyle);

  // ── Weighted risk factors ───────────────────────────────────────────────────
  if (profile.anesthesia_complications === true) { factors.anesthesia_history = 40; flags.push('History of anesthesia complications'); }

  const thinnerHit = BLOOD_THINNERS.find((k) => meds.includes(k));
  if (thinnerHit) { factors.blood_thinner = 40; flags.push('On blood-thinning / anticoagulant medication'); }

  const seriousHits = SERIOUS_CONDITIONS.filter((k) => conditions.includes(k));
  if (seriousHits.length > 0) {
    factors.serious_conditions = Math.min(seriousHits.length * 30, 60);
    flags.push(`Significant medical condition(s) reported (${seriousHits.length})`);
  }

  if (profile.had_complications === true) { factors.prior_complications = 25; flags.push('Prior surgical complications'); }

  const bmi = num(profile.bmi);
  if (bmi !== null) {
    if (bmi >= 40) { factors.bmi = 35; flags.push('BMI ≥ 40'); }
    else if (bmi >= 35) { factors.bmi = 20; flags.push('BMI 35–40'); }
    else if (bmi > 0 && bmi < 18.5) { factors.bmi = 10; flags.push('BMI < 18.5'); }
  }

  const age = num(profile.age);
  if (age !== null) {
    if (age >= 70) { factors.age = 25; flags.push('Age ≥ 70'); }
    else if (age >= 65) { factors.age = 15; flags.push('Age 65–70'); }
    else if (age > 0 && age < 18) { factors.age = 30; flags.push('Under 18 — minor'); }
  }

  if (profile.emotional_concerns === true) { factors.emotional = 10; flags.push('Emotional readiness concerns noted'); }
  if (RISKY_LIFESTYLE.some((k) => lifestyle.includes(k))) { factors.lifestyle = 10; flags.push('Lifestyle risk factor (smoking/alcohol)'); }

  const score = Math.min(100, Object.values(factors).reduce((a, b) => a + b, 0));

  // ── Map to level (conservative thresholds) ──────────────────────────────────
  let risk_level: SafeTDecision['risk_level'];
  if (score >= 70) risk_level = 'review';
  else if (score >= 40) risk_level = 'elevated';
  else if (score >= 15) risk_level = 'moderate';
  else risk_level = 'low';

  return { risk_level, score, flags, factors, engine_version: SAFET_ENGINE_VERSION };
}
