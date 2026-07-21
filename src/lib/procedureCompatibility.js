// @ts-nocheck — pre-existing type gaps in src/lib utility
/**
 * SAFE-T4LIFE™ Procedure Compatibility Engine
 *
 * DISCLAIMER: Procedure compatibility guidance is informational only and does
 * not replace evaluation by a licensed medical professional.
 *
 * This engine classifies procedure combinations into GREEN / YELLOW / RED
 * based on anesthesia burden, surgical stress, recovery overlap, and known
 * clinical interaction patterns. It NEVER makes medical decisions — it flags
 * cases that require enhanced provider review.
 *
 * Optionally condition-aware: callers that already know the patient's
 * disclosed medical conditions (Section4MedicalHistory / ConditionsPickStep)
 * pass them in as a second argument so a combination that would otherwise
 * sit in the YELLOW review band escalates to a hard RED block instead.
 */

import { HIGH_RISK_CONDITIONS } from '@/lib/medicalSafetyGate';

// ─── Procedure Profile Database ──────────────────────────────────────────────
// Each procedure has: anesthesiaHrs, recoveryDays, stressLevel (1-10),
// speciality group, and known combination flags.

export const PROCEDURE_PROFILES = {
  // ── DENTAL GENERAL ──
  'Dental Cleaning':        { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'dental-general', minorSurgery: false },
  'Deep Cleaning':          { anesthesiaHrs: 0,   recoveryDays: 2,  stress: 2, group: 'dental-general', minorSurgery: false },
  'Dental Exam':            { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'dental-general', minorSurgery: false },
  'Dental X-Rays':          { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'dental-general', minorSurgery: false },
  'Fillings':               { anesthesiaHrs: 0.5, recoveryDays: 1,  stress: 2, group: 'dental-general', minorSurgery: false },
  'Tooth Extraction':       { anesthesiaHrs: 0.5, recoveryDays: 3,  stress: 3, group: 'dental-general', minorSurgery: true },
  'Wisdom Tooth Removal':   { anesthesiaHrs: 1,   recoveryDays: 5,  stress: 4, group: 'dental-surgical', minorSurgery: true },
  'Root Canal Treatment':   { anesthesiaHrs: 1.5, recoveryDays: 3,  stress: 3, group: 'dental-general', minorSurgery: false },
  'Dental Crowns':          { anesthesiaHrs: 0.5, recoveryDays: 1,  stress: 2, group: 'dental-general', minorSurgery: false },
  'Dental Bridges':         { anesthesiaHrs: 0.5, recoveryDays: 2,  stress: 2, group: 'dental-general', minorSurgery: false },
  'Dentures':               { anesthesiaHrs: 0,   recoveryDays: 14, stress: 2, group: 'dental-general', minorSurgery: false },
  'Partial Dentures':       { anesthesiaHrs: 0,   recoveryDays: 7,  stress: 2, group: 'dental-general', minorSurgery: false },
  'Inlays & Onlays':        { anesthesiaHrs: 0.5, recoveryDays: 2,  stress: 2, group: 'dental-general', minorSurgery: false },

  // ── DENTAL COSMETIC ──
  'Teeth Whitening':        { anesthesiaHrs: 0,   recoveryDays: 2,  stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Porcelain Veneers':      { anesthesiaHrs: 0.5, recoveryDays: 2,  stress: 2, group: 'dental-cosmetic', minorSurgery: false },
  'Composite Bonding':      { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Smile Makeover':         { anesthesiaHrs: 1,   recoveryDays: 3,  stress: 3, group: 'dental-cosmetic', minorSurgery: false },
  'Gum Contouring':         { anesthesiaHrs: 0.5, recoveryDays: 14, stress: 3, group: 'dental-cosmetic', minorSurgery: true },
  'Hollywood Smile':        { anesthesiaHrs: 1.5, recoveryDays: 3,  stress: 4, group: 'dental-cosmetic', minorSurgery: false },

  // ── DENTAL IMPLANTS ──
  'Single Dental Implant':        { anesthesiaHrs: 1.5, recoveryDays: 5,  stress: 4, group: 'dental-implant', minorSurgery: true },
  'Multiple Dental Implants':     { anesthesiaHrs: 3,   recoveryDays: 7,  stress: 6, group: 'dental-implant', minorSurgery: true },
  'Full Mouth Implants':          { anesthesiaHrs: 7,   recoveryDays: 14, stress: 9, group: 'dental-implant', minorSurgery: true },
  'All-on-4 Implants':            { anesthesiaHrs: 5,   recoveryDays: 5,  stress: 8, group: 'dental-implant', minorSurgery: true },
  'All-on-6 Implants':            { anesthesiaHrs: 6,   recoveryDays: 5,  stress: 8, group: 'dental-implant', minorSurgery: true },
  'Implant-Supported Dentures':   { anesthesiaHrs: 3,   recoveryDays: 7,  stress: 6, group: 'dental-implant', minorSurgery: true },
  'Bone Grafting':                { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },
  'Sinus Lift':                   { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },

  // ── ORTHODONTICS ──
  'Braces':           { anesthesiaHrs: 0, recoveryDays: 3,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Invisalign':       { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Clear Aligners':   { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Retainers':        { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },

  // ── FACIAL AESTHETICS ──
  'Rhinoplasty':          { anesthesiaHrs: 3,   recoveryDays: 14, stress: 7, group: 'face', minorSurgery: false },
  'Facelift':             { anesthesiaHrs: 4,   recoveryDays: 14, stress: 8, group: 'face', minorSurgery: false },
  'Neck Lift':            { anesthesiaHrs: 2.5, recoveryDays: 10, stress: 6, group: 'face', minorSurgery: false },
  'Eyelid Surgery':       { anesthesiaHrs: 1.5, recoveryDays: 10, stress: 5, group: 'face', minorSurgery: false },
  'Chin Augmentation':    { anesthesiaHrs: 1,   recoveryDays: 7,  stress: 4, group: 'face', minorSurgery: false },
  'Buccal Fat Removal':   { anesthesiaHrs: 0.5, recoveryDays: 7,  stress: 3, group: 'face', minorSurgery: false },
  'Lip Lift':             { anesthesiaHrs: 0.75,recoveryDays: 7,  stress: 3, group: 'face', minorSurgery: false },
  'Botox':                { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'face-nonsurgical', minorSurgery: false },
  'Dermal Fillers':       { anesthesiaHrs: 0,   recoveryDays: 1,  stress: 1, group: 'face-nonsurgical', minorSurgery: false },

  // ── BODY CONTOURING ──
  'Liposuction':          { anesthesiaHrs: 3,   recoveryDays: 14, stress: 6, group: 'body', minorSurgery: false },
  'Tummy Tuck':           { anesthesiaHrs: 3.5, recoveryDays: 42, stress: 8, group: 'body', minorSurgery: false },
  'Mommy Makeover':       { anesthesiaHrs: 5.5, recoveryDays: 42, stress: 9, group: 'body', minorSurgery: false },
  'Brazilian Butt Lift':  { anesthesiaHrs: 3.5, recoveryDays: 21, stress: 7, group: 'body', minorSurgery: false },
  'Body Contouring':      { anesthesiaHrs: 3,   recoveryDays: 14, stress: 6, group: 'body', minorSurgery: false },
  'Arm Lift':             { anesthesiaHrs: 1.5, recoveryDays: 14, stress: 5, group: 'body', minorSurgery: false },
  'Thigh Lift':           { anesthesiaHrs: 2,   recoveryDays: 21, stress: 6, group: 'body', minorSurgery: false },

  // ── BREAST SURGERY ──
  'Breast Augmentation':  { anesthesiaHrs: 2,   recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Lift':          { anesthesiaHrs: 2.5, recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Reduction':     { anesthesiaHrs: 3,   recoveryDays: 28, stress: 7, group: 'breast', minorSurgery: false },
  'Breast Revision':      { anesthesiaHrs: 2.5, recoveryDays: 28, stress: 7, group: 'breast', minorSurgery: false },

  // ── WELLNESS ──
  'IV Therapy':           { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Stem Cell Therapy':    { anesthesiaHrs: 1, recoveryDays: 3, stress: 3, group: 'wellness', minorSurgery: false },
  'PRP Therapy':          { anesthesiaHrs: 0, recoveryDays: 2, stress: 2, group: 'wellness', minorSurgery: false },
  'Hormone Therapy':      { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Medical Weight Loss':  { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Nutritional Programs': { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Recovery Therapy':     { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
};

// ─── Known GREEN (commonly combined) pairs ────────────────────────────────────
// Listed as sets of procedure titles that are routinely performed together.
const GREEN_COMBINATIONS = [
  new Set(['Teeth Whitening', 'Porcelain Veneers']),
  new Set(['Teeth Whitening', 'Composite Bonding']),
  new Set(['Teeth Whitening', 'Smile Makeover']),
  new Set(['Porcelain Veneers', 'Smile Makeover']),
  new Set(['Porcelain Veneers', 'Composite Bonding']),
  new Set(['Hollywood Smile', 'Teeth Whitening']),
  new Set(['Hollywood Smile', 'Gum Contouring']),
  new Set(['Liposuction', 'Tummy Tuck']),
  new Set(['Liposuction', 'Arm Lift']),
  new Set(['Liposuction', 'Thigh Lift']),
  new Set(['Liposuction', 'Brazilian Butt Lift']),
  new Set(['Breast Augmentation', 'Breast Lift']),
  new Set(['Facelift', 'Neck Lift']),
  new Set(['Facelift', 'Eyelid Surgery']),
  new Set(['Facelift', 'Buccal Fat Removal']),
  new Set(['Rhinoplasty', 'Chin Augmentation']),
  new Set(['Rhinoplasty', 'Eyelid Surgery']),
  new Set(['Eyelid Surgery', 'Buccal Fat Removal']),
  new Set(['Dental Cleaning', 'Dental Exam']),
  new Set(['Dental Cleaning', 'Dental X-Rays']),
  new Set(['Dental Exam', 'Dental X-Rays']),
  new Set(['Botox', 'Dermal Fillers']),
  new Set(['IV Therapy', 'PRP Therapy']),
  new Set(['Recovery Therapy', 'IV Therapy']),
  new Set(['Bone Grafting', 'Single Dental Implant']),
  new Set(['Sinus Lift', 'Single Dental Implant']),
  new Set(['Sinus Lift', 'Multiple Dental Implants']),
];

// ─── Known RED (high-concern) pairs with clinical reasons ────────────────────
// Each entry includes the pair and the specific clinical rationale for blocking.
export const RED_VIOLATION_RULES = [
  {
    pair: ['Full Mouth Implants', 'Facelift'],
    reason: 'Full-mouth implants require 8–10 weeks of jaw healing. Facelift pulls facial tissue that overlaps the surgical field — combining them risks implant failure and delayed healing in both sites.',
    code: 'ORAL_FACIAL_CONFLICT',
    recommended: 'Full Mouth Implants',
    recommendedReason: 'Your smile transformation first — your facelift can follow safely 3–4 months later once your jaw has fully healed. Two beautiful results are better than one rushed one.',
  },
  {
    pair: ['Full Mouth Implants', 'Tummy Tuck'],
    reason: 'Full-mouth implants require 7–8 hrs anesthesia alone. Adding abdominoplasty pushes total anesthesia past safe thresholds (>12 hrs) and dramatically increases infection risk across two distant surgical fields.',
    code: 'ANESTHESIA_OVERLOAD',
    recommended: 'Full Mouth Implants',
    recommendedReason: 'Begin with your dental transformation this trip. Your body contouring journey can start safely on your next visit — and you will recover fully from both.',
  },
  {
    pair: ['Full Mouth Implants', 'Rhinoplasty'],
    reason: 'Both procedures share the maxillofacial blood supply. Simultaneous surgery creates vascular competition that can cause implant rejection and nasal tip necrosis.',
    code: 'SHARED_VASCULAR_FIELD',
    recommended: 'Full Mouth Implants',
    recommendedReason: 'Protect your implant outcome first. Rhinoplasty can be scheduled safely 3 months after full healing — both results will be exactly what you imagined.',
  },
  {
    pair: ['All-on-4 Implants', 'Tummy Tuck'],
    reason: 'All-on-4 carries ~5 hrs anesthesia. Tummy tuck adds 3.5 hrs — total ~8.5 hrs under general anesthesia in a single session, exceeding the safe ceiling for most patients and raising DVT risk 6×.',
    code: 'ANESTHESIA_OVERLOAD',
    recommended: 'All-on-4 Implants',
    recommendedReason: 'Your smile is your priority this trip. Come back for your body transformation — your results will be worth the wait, and your recovery will be far safer.',
  },
  {
    pair: ['All-on-6 Implants', 'Tummy Tuck'],
    reason: 'All-on-6 requires 6+ hrs in prone position with the airway fully instrumented. Tummy tuck demands supine positioning — the positional conflict alone makes same-session surgery impossible without ICU-level monitoring.',
    code: 'POSITIONING_CONFLICT',
    recommended: 'All-on-6 Implants',
    recommendedReason: 'All-on-6 alone is a major transformation. Your tummy tuck will be safer and more effective as a dedicated procedure — you deserve both done right.',
  },
  {
    pair: ['All-on-4 Implants', 'Mommy Makeover'],
    reason: 'Mommy Makeover (breast + abdomen) combined with All-on-4 creates simultaneous surgical trauma in three anatomical zones. Blood loss compounds across all sites; recovery conflicts are irresolvable in a single session.',
    code: 'MULTI_ZONE_TRAUMA',
    recommended: 'All-on-4 Implants',
    recommendedReason: 'Your Mommy Makeover deserves its own journey — the results are more complete when your body is focused on one transformation at a time.',
  },
  {
    pair: ['All-on-6 Implants', 'Mommy Makeover'],
    reason: 'All-on-6 alone places the patient at maximum safe anesthesia duration. Adding a Mommy Makeover is contraindicated — total operating time would exceed 11 hrs with compounding infection, hemorrhage, and aspiration risk.',
    code: 'ANESTHESIA_OVERLOAD',
    recommended: 'All-on-6 Implants',
    recommendedReason: 'Give your smile the recovery it deserves first. Your Mommy Makeover journey can begin 3 months later — two milestones, celebrated safely.',
  },
  {
    pair: ['Mommy Makeover', 'Rhinoplasty'],
    reason: 'Mommy Makeover requires the patient supine with abdominal binders for 6 weeks. Rhinoplasty requires head elevation and no abdominal pressure. These recovery protocols are physically incompatible.',
    code: 'RECOVERY_CONFLICT',
    recommended: 'Mommy Makeover',
    recommendedReason: 'Your body transformation first. Rhinoplasty can be added as a beautiful follow-up once you are fully healed — patience now means perfection then.',
  },
  {
    pair: ['Mommy Makeover', 'Facelift'],
    reason: 'Combined anesthesia time exceeds 9 hrs. Facelift requires head-of-bed elevation; Mommy Makeover requires flat supine positioning. The recovery postures directly contradict each other and cannot be reconciled.',
    code: 'RECOVERY_CONFLICT',
    recommended: 'Mommy Makeover',
    recommendedReason: 'Both procedures are life-changing — but they deserve separate recoveries so each result is exactly what you dreamed of. Your facelift can follow 4–6 months later.',
  },
  {
    pair: ['Tummy Tuck', 'Brazilian Butt Lift'],
    reason: 'Tummy Tuck requires strict supine recovery. BBL requires the patient to avoid sitting or lying supine for 8 weeks to protect the transferred fat graft. These positions are mutually exclusive — this combination presents significant recovery conflicts that require review by a licensed physician before proceeding.',
    code: 'POSITIONING_CONFLICT',
    recommended: 'Tummy Tuck',
    recommendedReason: 'A Tummy Tuck alone delivers a powerful transformation. Your BBL can be planned as a dedicated second trip — and the results of each will be far more beautiful for it.',
  },
  {
    pair: ['Breast Reduction', 'Tummy Tuck'],
    reason: 'Both procedures require separate prone and supine periods with high blood loss potential. Combined, total blood loss can exceed safe transfusion thresholds. DVT risk increases 4× with dual lower + upper trunk surgery.',
    code: 'HEMORRHAGE_RISK',
    recommended: 'Breast Reduction',
    recommendedReason: 'Breast reduction alone brings immediate relief and a complete result. Your tummy tuck can follow when your body is strong and fully ready.',
  },
  {
    pair: ['Breast Reduction', 'Mommy Makeover'],
    reason: 'Mommy Makeover already includes breast work. Adding a separate Breast Reduction creates redundant incisions in the same anatomical zone — this combination is a contraindication, not a combination.',
    code: 'REDUNDANT_FIELD',
    recommended: 'Mommy Makeover',
    recommendedReason: 'The Mommy Makeover already includes your breast transformation — it is the more complete package and gives you everything in one safe, coordinated plan.',
  },
  {
    pair: ['Bone Grafting', 'Sinus Lift'],
    reason: 'Both procedures operate in overlapping maxillary bone and sinus membrane territory. Simultaneous grafting in the same field doubles the infection pathway and prevents proper clot formation in either graft site.',
    code: 'SHARED_SURGICAL_FIELD',
    recommended: 'Bone Grafting',
    recommendedReason: 'Bone grafting first gives your jaw the strongest foundation for everything that follows. Your sinus lift can be performed safely after healing is confirmed.',
  },
  {
    pair: ['Gastric Sleeve', 'Breast Augmentation'],
    reason: 'Post-bariatric tissue is metabolically stressed — fat cells are actively being reduced. Introducing a breast implant during this phase causes unpredictable capsule formation and implant displacement as body composition changes.',
    code: 'METABOLIC_CONFLICT',
    recommended: 'Gastric Sleeve',
    recommendedReason: 'Your health transformation first. Breast augmentation after your weight has stabilized gives you a far more beautiful and lasting result — your body will thank you.',
  },
  {
    pair: ['Gastric Bypass', 'Liposuction'],
    reason: 'Gastric Bypass causes significant nutritional malabsorption. Liposuction removes fat while the body is already in a catabolic state — electrolyte depletion, protein deficiency, and impaired wound healing make this combination high-risk.',
    code: 'METABOLIC_CONFLICT',
    recommended: 'Gastric Bypass',
    recommendedReason: 'Let your weight loss journey begin and settle. Liposuction works best — and safely — after your body has healed and found its new balance.',
  },
  {
    pair: ['Spine Surgery', 'Joint Replacement'],
    reason: 'Multi-site orthopedic surgery requires prolonged immobilization across different recovery protocols. Spinal recovery needs movement restriction; joint replacement needs immediate mobilization. These requirements directly conflict.',
    code: 'RECOVERY_CONFLICT',
    recommended: 'Spine Surgery',
    recommendedReason: 'Address your spine first — it affects how your entire body heals. Joint replacement can be planned as a dedicated second procedure with a stronger foundation beneath it.',
  },
];

const RED_COMBINATIONS = RED_VIOLATION_RULES.map(r => new Set(r.pair));

// ─── Helper: check if two titles match a rule set ────────────────────────────
function pairMatchesAnySet(titleA, titleB, rulesets) {
  return rulesets.some(s => s.has(titleA) && s.has(titleB));
}

function anyPairMatches(titles, rulesets) {
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      if (pairMatchesAnySet(titles[i], titles[j], rulesets)) return true;
    }
  }
  return false;
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

/**
 * Analyse a list of procedure items from the cart and return a compatibility result.
 *
 * @param {Array} items  Cart items (must have .title or .name)
 * @param {string[]} [conditions]  Disclosed medical conditions (Section4MedicalHistory /
 *   ConditionsPickStep labels, e.g. 'Diabetes', 'Heart Disease') — optional; a combination
 *   already at ≥5 hrs combined anesthesia escalates from YELLOW to RED when a
 *   HIGH_RISK_CONDITIONS entry is present.
 * @returns {{ level: 'GREEN'|'YELLOW'|'RED', reasons: string[], totalAnesthesiaHrs: number, totalRecoveryDays: number, totalStress: number }}
 */
export function analyseCompatibility(items, conditions = []) {
  if (!items || items.length <= 1) {
    return { level: 'GREEN', reasons: [], totalAnesthesiaHrs: 0, totalRecoveryDays: 0, totalStress: 0 };
  }

  const titles = items.map(i => i.title || i.name).filter(Boolean);
  const profiles = titles.map(t => ({ title: t, ...(PROCEDURE_PROFILES[t] || { anesthesiaHrs: 0, recoveryDays: 0, stress: 3, group: 'unknown', minorSurgery: false }) }));
  const flaggedCondition = conditions.find(c => HIGH_RISK_CONDITIONS.includes(c)) || null;

  // ── Compute aggregates ──
  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + p.anesthesiaHrs, 0);
  const maxRecoveryDays = Math.max(...profiles.map(p => p.recoveryDays));
  const totalStress = profiles.reduce((s, p) => s + p.stress, 0);
  const majorSurgeries = profiles.filter(p => p.stress >= 6).length;
  const groups = [...new Set(profiles.map(p => p.group))];

  const reasons = [];
  let level = 'GREEN';

  // Computed once, up front, so it can override the GREEN fast-track below —
  // a condition-driven RED must never be skipped just because the pair is
  // ordinarily whitelisted as commonly combined.
  const conditionRedFlag = !!flaggedCondition && totalAnesthesiaHrs >= 5;

  // ── GREEN fast-track: 1-2 items explicitly in green list ──
  if (!conditionRedFlag && titles.length === 2 && anyPairMatches(titles, GREEN_COMBINATIONS)) {
    return { level: 'GREEN', reasons: [], totalAnesthesiaHrs, totalRecoveryDays: maxRecoveryDays, totalStress };
  }

  // ── RED: explicit high-concern pairs ──
  if (anyPairMatches(titles, RED_COMBINATIONS)) {
    reasons.push('One or more procedure pairs in this selection may place significant combined demands on healing and recovery.');
    level = 'RED';
  }

  // ── RED: extreme anesthesia burden (> 8 hrs total) ──
  if (totalAnesthesiaHrs > 8) {
    reasons.push(`Estimated combined anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) may benefit from staged planning to support recovery.`);
    level = 'RED';
  }

  // ── RED: 3+ major surgeries simultaneously ──
  if (majorSurgeries >= 3) {
    reasons.push(`${majorSurgeries} high-complexity procedures selected simultaneously. A staged treatment plan is commonly recommended in these cases.`);
    level = 'RED';
  }

  // ── RED: disclosed high-risk condition + ≥5 hrs combined anesthesia ──
  // A condition the condition-blind engine above never sees (diabetes impairs
  // anesthetic metabolism; blood/heart/seizure disorders each compound
  // differently) turns what would otherwise be a routine review-tier
  // combination into a genuine contraindication. Reuses the engine's own
  // existing 5 hrs YELLOW floor rather than inventing a new number.
  if (conditionRedFlag) {
    reasons.push(`With ${flaggedCondition} on file, the estimated combined anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) for this selection requires provider review before it can proceed.`);
    level = 'RED';
  }

  // ── YELLOW: moderate anesthesia (5–8 hrs) ──
  if (level !== 'RED' && totalAnesthesiaHrs >= 5 && totalAnesthesiaHrs <= 8) {
    reasons.push(`Combined anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) warrants a pre-consultation review to confirm safety and sequencing.`);
    level = 'YELLOW';
  }

  // ── YELLOW: 2 major surgeries ──
  if (level !== 'RED' && majorSurgeries === 2) {
    reasons.push('Two high-complexity surgical procedures selected. A provider review will confirm whether same-visit coordination is suitable.');
    if (level === 'GREEN') level = 'YELLOW';
  }

  // ── YELLOW: long recovery overlap ──
  if (level !== 'RED' && maxRecoveryDays >= 28 && titles.length >= 2) {
    reasons.push(`Extended recovery period (~${maxRecoveryDays} days) involved. A coordinated recovery plan will be prepared with your provider.`);
    if (level === 'GREEN') level = 'YELLOW';
  }

  // ── YELLOW: cross-specialty combination ──
  const surgicalGroups = groups.filter(g => !['wellness', 'orthodontics', 'dental-general', 'dental-cosmetic', 'face-nonsurgical'].includes(g));
  if (level !== 'RED' && surgicalGroups.length >= 3) {
    reasons.push('Procedures span multiple surgical specialties. Your care team will coordinate an integrated treatment plan.');
    if (level === 'GREEN') level = 'YELLOW';
  }

  // ── YELLOW: high cumulative stress score ──
  if (level !== 'RED' && totalStress >= 14 && level === 'GREEN') {
    reasons.push('The combined surgical demand of this selection may benefit from a provider consultation to sequence treatments optimally.');
    level = 'YELLOW';
  }

  // ── 5+ procedures always warrants at minimum YELLOW ──
  if (titles.length >= 5 && level === 'GREEN') {
    reasons.push('Multiple procedures selected. A personalized provider review will ensure the ideal sequencing and recovery plan.');
    level = 'YELLOW';
  }

  return { level, reasons, totalAnesthesiaHrs, totalRecoveryDays: maxRecoveryDays, totalStress };
}

// ─── UI copy per level ────────────────────────────────────────────────────────

export const COMPATIBILITY_COPY = {
  GREEN: {
    label: 'Commonly Combined',
    headline: 'These procedures are commonly coordinated together.',
    body: 'Final medical suitability must still be confirmed by your licensed provider during consultation.',
    providerNote: null,
    color: 'emerald',
  },
  YELLOW: {
    label: 'Enhanced Review Recommended',
    headline: 'This combination may benefit from additional medical review.',
    body: 'Your care coordinator will ensure recovery compatibility and optimal treatment sequencing.',
    providerNote: 'SAFE-T4LIFE™ Medical Review — a licensed provider will confirm compatibility before planning.',
    color: 'amber',
  },
  RED: {
    label: 'Provider Review Required',
    headline: 'This combination requires enhanced medical review by a licensed provider before planning.',
    body: 'This is not a restriction — it is a care standard. Your coordinator will guide you through the provider review process.',
    providerNote: 'SAFE-T4LIFE™ Medical Review Required — your case will be flagged for provider assessment before estimate approval.',
    color: 'rose',
  },
};

export const DISCLAIMER = 'Procedure compatibility guidance is informational only and does not replace evaluation by a licensed medical professional.';

/**
 * Returns specific clinical violations for a given cart.
 * Used to power the ProcedureStackingBlocker hard-block UI.
 *
 * @param {Array} items  Cart items with .title or .name
 * @returns {{ violations: Array<{pairLabel: string, reason: string, code: string}>, isBlocked: boolean }}
 */
/**
 * suggestFirstStage — what M recommends the patient do THIS trip.
 *
 * Every one of the 16 named RED pairs carries a hand-written recommendation,
 * because M does not simply refuse a combination: it says what to do instead.
 * The two catch-all violations below (3+ major surgeries, >8hrs anesthesia)
 * had no recommendation attached, so a patient who hit one of those — and
 * selecting three big procedures is exactly the behaviour this engine exists
 * to catch — saw a red block, a list of conflicts, and a "Go Back" button.
 * The entire "What M recommends instead" panel is gated on
 * `violations.some(v => v.recommended)`, so they never even reached the line
 * that matters most: "M is not here to take your dream away. We are here to
 * make sure you are alive to enjoy it."
 *
 * That is M behaving like a blocker, which is the one thing it must never be.
 *
 * This builds the first stage by taking the MOST significant procedure first
 * and adding others only while the running set still passes this engine's own
 * thresholds.
 *
 * Significance order matters, and getting it wrong produces advice that is
 * clinically safe and practically useless. The first version of this walked
 * the cart in selection order, on the reasoning that ranking a patient's goals
 * wasn't ours to do. For a cart of [Dental Cleaning, Root Canal, Full Mouth
 * Implants] that recommended keeping the cleaning and the root canal, and
 * deferring the implants — telling someone who flew abroad for a new smile to
 * have a scale-and-polish instead. Cart order is not priority; it is just the
 * order things were added.
 *
 * So the heaviest procedure leads. It is almost always the reason the trip
 * exists, and the minor work around it is what can be done later, closer to
 * home, or anywhere. Ties keep their original order.
 *
 * It still invents no clinical opinion: a set is only ever proposed if the
 * existing RED rules already clear it. If our own engine wouldn't pass it, we
 * don't suggest it.
 *
 * Returns [] when nothing safe can be assembled — the caller must then fall
 * back to routing them to a doctor rather than inventing a plan.
 */
export function suggestFirstStage(titles, anesthesiaCeiling = 8) {
  const profileOf = (t) => PROCEDURE_PROFILES[t] || { stress: 3, anesthesiaHrs: 0 };

  const isSafeSet = (set) => {
    if (set.length === 0) return true;
    for (const rule of RED_VIOLATION_RULES) {
      const [a, b] = rule.pair;
      if (set.includes(a) && set.includes(b)) return false;
    }
    const profiles = set.map(profileOf);
    if (profiles.filter(p => p.stress >= 6).length >= 3) return false;
    if (profiles.reduce((s, p) => s + (p.anesthesiaHrs || 0), 0) > anesthesiaCeiling) return false;
    return true;
  };

  // Heaviest first (stress, then anesthesia hours), stable on ties.
  const bySignificance = titles
    .map((t, i) => ({ t, i, p: profileOf(t) }))
    .sort((a, b) =>
      (b.p.stress || 0) - (a.p.stress || 0) ||
      (b.p.anesthesiaHrs || 0) - (a.p.anesthesiaHrs || 0) ||
      a.i - b.i)
    .map(x => x.t);

  const stage = [];
  for (const t of bySignificance) {
    if (isSafeSet([...stage, t])) stage.push(t);
  }

  // Present the stage in the patient's own cart order — they recognise their
  // list, not our internal ranking.
  return titles.filter(t => stage.includes(t));
}

/**
 * Turns a computed first stage into the same shape the 16 hand-written rules
 * use, in the same voice: name what to do now, promise the rest, and never
 * imply the goal itself is being refused.
 *
 * If no safe stage can be assembled we return nulls rather than a hollow
 * suggestion. The blocker then shows the conflicts and the doctor-review
 * path, which is the honest outcome — better than M inventing a plan it
 * cannot stand behind.
 */
function stageRecommendation(stage, later) {
  if (!stage.length || !later.length) return { recommended: null, recommendedReason: null };

  const list = (arr) =>
    arr.length === 1 ? arr[0]
      : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;

  return {
    recommended: list(stage),
    recommendedReason:
      `Start with ${list(stage)} on this trip — that combination sits safely inside anesthesia limits. ` +
      `${list(later)} can follow 6–8 weeks later, once you have fully healed. ` +
      `You are not giving anything up; you are giving each result the recovery it needs to be what you imagined.`,
  };
}

export function getViolations(items, conditions = []) {
  if (!items || items.length < 2) return { violations: [], isBlocked: false };

  const titles = items.map(i => i.title || i.name).filter(Boolean);
  const violations = [];

  for (const rule of RED_VIOLATION_RULES) {
    const [a, b] = rule.pair;
    if (titles.includes(a) && titles.includes(b)) {
      violations.push({
        pairLabel: `${a} + ${b}`,
        reason: rule.reason,
        code: rule.code,
        recommended: rule.recommended || null,
        recommendedReason: rule.recommendedReason || null,
      });
    }
  }

  // Also flag 3+ major surgeries as a violation (anesthesia overload)
  const profiles = titles.map(t => PROCEDURE_PROFILES[t] || { stress: 3 });
  const majorSurgeries = profiles.filter(p => p.stress >= 6).length;
  if (majorSurgeries >= 3 && violations.length === 0) {
    const stage = suggestFirstStage(titles);
    const later = titles.filter(t => !stage.includes(t));
    violations.push({
      pairLabel: `${majorSurgeries} Major Surgeries Simultaneously`,
      reason: `${majorSurgeries} high-complexity procedures scheduled in a single session. Safe anesthesia limits are typically exceeded beyond 2 concurrent major surgeries. A staged treatment plan (6–8 weeks between sessions) is the clinical standard.`,
      code: 'ANESTHESIA_OVERLOAD',
      ...stageRecommendation(stage, later),
    });
  }

  // Extreme anesthesia as a catch-all violation
  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + (p.anesthesiaHrs || 0), 0);
  if (totalAnesthesiaHrs > 8 && violations.length === 0) {
    const stage = suggestFirstStage(titles);
    const later = titles.filter(t => !stage.includes(t));
    violations.push({
      pairLabel: `Combined Anesthesia > ${totalAnesthesiaHrs.toFixed(1)} Hours`,
      reason: `Total estimated anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) exceeds the safe ceiling for elective procedures. Beyond 8 hours, the risk of anesthesia awareness, hypothermia, and post-operative cognitive dysfunction increases significantly.`,
      code: 'ANESTHESIA_OVERLOAD',
      ...stageRecommendation(stage, later),
    });
  }

  // Disclosed high-risk condition + ≥5 hrs combined anesthesia — a
  // combination the condition-blind checks above would leave at YELLOW.
  // Staged with a 4.99hr ceiling (not 5) so the recommended first stage is
  // itself strictly under the ">= 5" trigger — a suggestion sitting exactly
  // at the boundary would immediately re-trip this same rule.
  const flaggedCondition = conditions.find(c => HIGH_RISK_CONDITIONS.includes(c));
  if (flaggedCondition && totalAnesthesiaHrs >= 5 && violations.length === 0) {
    const stage = suggestFirstStage(titles, 4.99);
    const later = titles.filter(t => !stage.includes(t));
    violations.push({
      pairLabel: `${flaggedCondition} + Combined Anesthesia ~${totalAnesthesiaHrs.toFixed(1)} Hours`,
      reason: `With ${flaggedCondition} on file, ~${totalAnesthesiaHrs.toFixed(1)} hrs of combined anesthesia carries meaningfully higher risk than the same combination would for a patient without this condition — impaired metabolism, delayed wound healing, and elevated cardiac/glucose stress are all condition-specific factors this selection now needs a licensed provider to weigh in on.`,
      code: 'METABOLIC_CONFLICT',
      ...stageRecommendation(stage, later),
    });
  }

  return { violations, isBlocked: violations.length > 0 };
}