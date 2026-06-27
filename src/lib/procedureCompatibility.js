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
 */

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
  },
  {
    pair: ['Full Mouth Implants', 'Tummy Tuck'],
    reason: 'Full-mouth implants require 7–8 hrs anesthesia alone. Adding abdominoplasty pushes total anesthesia past safe thresholds (>12 hrs) and dramatically increases infection risk across two distant surgical fields.',
    code: 'ANESTHESIA_OVERLOAD',
  },
  {
    pair: ['Full Mouth Implants', 'Rhinoplasty'],
    reason: 'Both procedures share the maxillofacial blood supply. Simultaneous surgery creates vascular competition that can cause implant rejection and nasal tip necrosis.',
    code: 'SHARED_VASCULAR_FIELD',
  },
  {
    pair: ['All-on-4 Implants', 'Tummy Tuck'],
    reason: 'All-on-4 carries ~5 hrs anesthesia. Tummy tuck adds 3.5 hrs — total ~8.5 hrs under general anesthesia in a single session, exceeding the safe ceiling for most patients and raising DVT risk 6×.',
    code: 'ANESTHESIA_OVERLOAD',
  },
  {
    pair: ['All-on-6 Implants', 'Tummy Tuck'],
    reason: 'All-on-6 requires 6+ hrs in prone position with the airway fully instrumented. Tummy tuck demands supine positioning — the positional conflict alone makes same-session surgery impossible without ICU-level monitoring.',
    code: 'POSITIONING_CONFLICT',
  },
  {
    pair: ['All-on-4 Implants', 'Mommy Makeover'],
    reason: 'Mommy Makeover (breast + abdomen) combined with All-on-4 creates simultaneous surgical trauma in three anatomical zones. Blood loss compounds across all sites; recovery conflicts are irresolvable in a single session.',
    code: 'MULTI_ZONE_TRAUMA',
  },
  {
    pair: ['All-on-6 Implants', 'Mommy Makeover'],
    reason: 'All-on-6 alone places the patient at maximum safe anesthesia duration. Adding a Mommy Makeover is contraindicated — total operating time would exceed 11 hrs with compounding infection, hemorrhage, and aspiration risk.',
    code: 'ANESTHESIA_OVERLOAD',
  },
  {
    pair: ['Mommy Makeover', 'Rhinoplasty'],
    reason: 'Mommy Makeover requires the patient supine with abdominal binders for 6 weeks. Rhinoplasty requires head elevation and no abdominal pressure. These recovery protocols are physically incompatible.',
    code: 'RECOVERY_CONFLICT',
  },
  {
    pair: ['Mommy Makeover', 'Facelift'],
    reason: 'Combined anesthesia time exceeds 9 hrs. Facelift requires head-of-bed elevation; Mommy Makeover requires flat supine positioning. The recovery postures directly contradict each other and cannot be reconciled.',
    code: 'RECOVERY_CONFLICT',
  },
  {
    pair: ['Tummy Tuck', 'Brazilian Butt Lift'],
    reason: 'Tummy Tuck requires strict supine recovery. BBL requires the patient to avoid sitting or lying supine for 8 weeks to protect the transferred fat graft. These positions are mutually exclusive — combining them guarantees graft failure.',
    code: 'POSITIONING_CONFLICT',
  },
  {
    pair: ['Breast Reduction', 'Tummy Tuck'],
    reason: 'Both procedures require separate prone and supine periods with high blood loss potential. Combined, total blood loss can exceed safe transfusion thresholds. DVT risk increases 4× with dual lower + upper trunk surgery.',
    code: 'HEMORRHAGE_RISK',
  },
  {
    pair: ['Breast Reduction', 'Mommy Makeover'],
    reason: 'Mommy Makeover already includes breast work. Adding a separate Breast Reduction creates redundant incisions in the same anatomical zone — this combination is a contraindication, not a combination.',
    code: 'REDUNDANT_FIELD',
  },
  {
    pair: ['Bone Grafting', 'Sinus Lift'],
    reason: 'Both procedures operate in overlapping maxillary bone and sinus membrane territory. Simultaneous grafting in the same field doubles the infection pathway and prevents proper clot formation in either graft site.',
    code: 'SHARED_SURGICAL_FIELD',
  },
  {
    pair: ['Gastric Sleeve', 'Breast Augmentation'],
    reason: 'Post-bariatric tissue is metabolically stressed — fat cells are actively being reduced. Introducing a breast implant during this phase causes unpredictable capsule formation and implant displacement as body composition changes.',
    code: 'METABOLIC_CONFLICT',
  },
  {
    pair: ['Gastric Bypass', 'Liposuction'],
    reason: 'Gastric Bypass causes significant nutritional malabsorption. Liposuction removes fat while the body is already in a catabolic state — electrolyte depletion, protein deficiency, and impaired wound healing make this combination high-risk.',
    code: 'METABOLIC_CONFLICT',
  },
  {
    pair: ['Spine Surgery', 'Joint Replacement'],
    reason: 'Multi-site orthopedic surgery requires prolonged immobilization across different recovery protocols. Spinal recovery needs movement restriction; joint replacement needs immediate mobilization. These requirements directly conflict.',
    code: 'RECOVERY_CONFLICT',
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
 * @returns {{ level: 'GREEN'|'YELLOW'|'RED', reasons: string[], totalAnesthesiaHrs: number, totalRecoveryDays: number, totalStress: number }}
 */
export function analyseCompatibility(items) {
  if (!items || items.length <= 1) {
    return { level: 'GREEN', reasons: [], totalAnesthesiaHrs: 0, totalRecoveryDays: 0, totalStress: 0 };
  }

  const titles = items.map(i => i.title || i.name).filter(Boolean);
  const profiles = titles.map(t => ({ title: t, ...(PROCEDURE_PROFILES[t] || { anesthesiaHrs: 0, recoveryDays: 0, stress: 3, group: 'unknown', minorSurgery: false }) }));

  // ── Compute aggregates ──
  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + p.anesthesiaHrs, 0);
  const maxRecoveryDays = Math.max(...profiles.map(p => p.recoveryDays));
  const totalStress = profiles.reduce((s, p) => s + p.stress, 0);
  const majorSurgeries = profiles.filter(p => p.stress >= 6).length;
  const groups = [...new Set(profiles.map(p => p.group))];

  const reasons = [];
  let level = 'GREEN';

  // ── GREEN fast-track: 1-2 items explicitly in green list ──
  if (titles.length === 2 && anyPairMatches(titles, GREEN_COMBINATIONS)) {
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
export function getViolations(items) {
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
      });
    }
  }

  // Also flag 3+ major surgeries as a violation (anesthesia overload)
  const profiles = titles.map(t => PROCEDURE_PROFILES[t] || { stress: 3 });
  const majorSurgeries = profiles.filter(p => p.stress >= 6).length;
  if (majorSurgeries >= 3 && violations.length === 0) {
    violations.push({
      pairLabel: `${majorSurgeries} Major Surgeries Simultaneously`,
      reason: `${majorSurgeries} high-complexity procedures scheduled in a single session. Safe anesthesia limits are typically exceeded beyond 2 concurrent major surgeries. A staged treatment plan (6–8 weeks between sessions) is the clinical standard.`,
      code: 'ANESTHESIA_OVERLOAD',
    });
  }

  // Extreme anesthesia as a catch-all violation
  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + (p.anesthesiaHrs || 0), 0);
  if (totalAnesthesiaHrs > 8 && violations.length === 0) {
    violations.push({
      pairLabel: `Combined Anesthesia > ${totalAnesthesiaHrs.toFixed(1)} Hours`,
      reason: `Total estimated anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) exceeds the safe ceiling for elective procedures. Beyond 8 hours, the risk of anesthesia awareness, hypothermia, and post-operative cognitive dysfunction increases significantly.`,
      code: 'ANESTHESIA_OVERLOAD',
    });
  }

  return { violations, isBlocked: violations.length > 0 };
}