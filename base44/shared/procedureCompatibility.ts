// Server-side twin of src/lib/procedureCompatibility.js — RED_VIOLATION_RULES and
// PROCEDURE_PROFILES must be kept identical between the two files. This copy exists
// because the frontend check (src/lib/procedureCompatibility.js) can be bypassed by
// a direct API call; validateProcedureSafety uses this file to re-derive the same
// verdict server-side so the M Principle hard block cannot be skipped by the client.

interface ProcedureProfile {
  anesthesiaHrs: number;
  recoveryDays: number;
  stress: number;
  group: string;
  minorSurgery: boolean;
}

export const PROCEDURE_PROFILES: Record<string, ProcedureProfile> = {
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

  'Teeth Whitening':        { anesthesiaHrs: 0,   recoveryDays: 2,  stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Porcelain Veneers':      { anesthesiaHrs: 0.5, recoveryDays: 2,  stress: 2, group: 'dental-cosmetic', minorSurgery: false },
  'Composite Bonding':      { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'dental-cosmetic', minorSurgery: false },
  'Smile Makeover':         { anesthesiaHrs: 1,   recoveryDays: 3,  stress: 3, group: 'dental-cosmetic', minorSurgery: false },
  'Gum Contouring':         { anesthesiaHrs: 0.5, recoveryDays: 14, stress: 3, group: 'dental-cosmetic', minorSurgery: true },
  'Hollywood Smile':        { anesthesiaHrs: 1.5, recoveryDays: 3,  stress: 4, group: 'dental-cosmetic', minorSurgery: false },

  'Single Dental Implant':        { anesthesiaHrs: 1.5, recoveryDays: 5,  stress: 4, group: 'dental-implant', minorSurgery: true },
  'Multiple Dental Implants':     { anesthesiaHrs: 3,   recoveryDays: 7,  stress: 6, group: 'dental-implant', minorSurgery: true },
  'Full Mouth Implants':          { anesthesiaHrs: 7,   recoveryDays: 14, stress: 9, group: 'dental-implant', minorSurgery: true },
  'All-on-4 Implants':            { anesthesiaHrs: 5,   recoveryDays: 5,  stress: 8, group: 'dental-implant', minorSurgery: true },
  'All-on-6 Implants':            { anesthesiaHrs: 6,   recoveryDays: 5,  stress: 8, group: 'dental-implant', minorSurgery: true },
  'Implant-Supported Dentures':   { anesthesiaHrs: 3,   recoveryDays: 7,  stress: 6, group: 'dental-implant', minorSurgery: true },
  'Bone Grafting':                { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },
  'Sinus Lift':                   { anesthesiaHrs: 1.5, recoveryDays: 21, stress: 5, group: 'dental-implant', minorSurgery: true },

  'Braces':           { anesthesiaHrs: 0, recoveryDays: 3,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Invisalign':       { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Clear Aligners':   { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },
  'Retainers':        { anesthesiaHrs: 0, recoveryDays: 0,  stress: 1, group: 'orthodontics', minorSurgery: false },

  'Rhinoplasty':          { anesthesiaHrs: 3,   recoveryDays: 14, stress: 7, group: 'face', minorSurgery: false },
  'Facelift':             { anesthesiaHrs: 4,   recoveryDays: 14, stress: 8, group: 'face', minorSurgery: false },
  'Neck Lift':            { anesthesiaHrs: 2.5, recoveryDays: 10, stress: 6, group: 'face', minorSurgery: false },
  'Eyelid Surgery':       { anesthesiaHrs: 1.5, recoveryDays: 10, stress: 5, group: 'face', minorSurgery: false },
  'Chin Augmentation':    { anesthesiaHrs: 1,   recoveryDays: 7,  stress: 4, group: 'face', minorSurgery: false },
  'Buccal Fat Removal':   { anesthesiaHrs: 0.5, recoveryDays: 7,  stress: 3, group: 'face', minorSurgery: false },
  'Lip Lift':             { anesthesiaHrs: 0.75,recoveryDays: 7,  stress: 3, group: 'face', minorSurgery: false },
  'Botox':                { anesthesiaHrs: 0,   recoveryDays: 0,  stress: 1, group: 'face-nonsurgical', minorSurgery: false },
  'Dermal Fillers':       { anesthesiaHrs: 0,   recoveryDays: 1,  stress: 1, group: 'face-nonsurgical', minorSurgery: false },

  'Liposuction':          { anesthesiaHrs: 3,   recoveryDays: 14, stress: 6, group: 'body', minorSurgery: false },
  'Tummy Tuck':           { anesthesiaHrs: 3.5, recoveryDays: 42, stress: 8, group: 'body', minorSurgery: false },
  'Mommy Makeover':       { anesthesiaHrs: 5.5, recoveryDays: 42, stress: 9, group: 'body', minorSurgery: false },
  'Brazilian Butt Lift':  { anesthesiaHrs: 3.5, recoveryDays: 21, stress: 7, group: 'body', minorSurgery: false },
  'Body Contouring':      { anesthesiaHrs: 3,   recoveryDays: 14, stress: 6, group: 'body', minorSurgery: false },
  'Arm Lift':             { anesthesiaHrs: 1.5, recoveryDays: 14, stress: 5, group: 'body', minorSurgery: false },
  'Thigh Lift':           { anesthesiaHrs: 2,   recoveryDays: 21, stress: 6, group: 'body', minorSurgery: false },

  'Breast Augmentation':  { anesthesiaHrs: 2,   recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Lift':          { anesthesiaHrs: 2.5, recoveryDays: 21, stress: 6, group: 'breast', minorSurgery: false },
  'Breast Reduction':     { anesthesiaHrs: 3,   recoveryDays: 28, stress: 7, group: 'breast', minorSurgery: false },
  'Breast Revision':      { anesthesiaHrs: 2.5, recoveryDays: 28, stress: 7, group: 'breast', minorSurgery: false },

  'IV Therapy':           { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Stem Cell Therapy':    { anesthesiaHrs: 1, recoveryDays: 3, stress: 3, group: 'wellness', minorSurgery: false },
  'PRP Therapy':          { anesthesiaHrs: 0, recoveryDays: 2, stress: 2, group: 'wellness', minorSurgery: false },
  'Hormone Therapy':      { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Medical Weight Loss':  { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Nutritional Programs': { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
  'Recovery Therapy':     { anesthesiaHrs: 0, recoveryDays: 0, stress: 1, group: 'wellness', minorSurgery: false },
};

interface RedViolationRule {
  pair: [string, string];
  reason: string;
  code: string;
  recommended?: string;
  recommendedReason?: string;
}

export const RED_VIOLATION_RULES: RedViolationRule[] = [
  { pair: ['Full Mouth Implants', 'Facelift'], code: 'ORAL_FACIAL_CONFLICT',
    reason: 'Full-mouth implants require 8–10 weeks of jaw healing. Facelift pulls facial tissue that overlaps the surgical field — combining them risks implant failure and delayed healing in both sites.' },
  { pair: ['Full Mouth Implants', 'Tummy Tuck'], code: 'ANESTHESIA_OVERLOAD',
    reason: 'Full-mouth implants require 7–8 hrs anesthesia alone. Adding abdominoplasty pushes total anesthesia past safe thresholds (>12 hrs) and dramatically increases infection risk across two distant surgical fields.' },
  { pair: ['Full Mouth Implants', 'Rhinoplasty'], code: 'SHARED_VASCULAR_FIELD',
    reason: 'Both procedures share the maxillofacial blood supply. Simultaneous surgery creates vascular competition that can cause implant rejection and nasal tip necrosis.' },
  { pair: ['All-on-4 Implants', 'Tummy Tuck'], code: 'ANESTHESIA_OVERLOAD',
    reason: 'All-on-4 carries ~5 hrs anesthesia. Tummy tuck adds 3.5 hrs — total ~8.5 hrs under general anesthesia in a single session, exceeding the safe ceiling for most patients and raising DVT risk 6×.' },
  { pair: ['All-on-6 Implants', 'Tummy Tuck'], code: 'POSITIONING_CONFLICT',
    reason: 'All-on-6 requires 6+ hrs in prone position with the airway fully instrumented. Tummy tuck demands supine positioning — the positional conflict alone makes same-session surgery impossible without ICU-level monitoring.' },
  { pair: ['All-on-4 Implants', 'Mommy Makeover'], code: 'MULTI_ZONE_TRAUMA',
    reason: 'Mommy Makeover (breast + abdomen) combined with All-on-4 creates simultaneous surgical trauma in three anatomical zones. Blood loss compounds across all sites; recovery conflicts are irresolvable in a single session.' },
  { pair: ['All-on-6 Implants', 'Mommy Makeover'], code: 'ANESTHESIA_OVERLOAD',
    reason: 'All-on-6 alone places the patient at maximum safe anesthesia duration. Adding a Mommy Makeover is contraindicated — total operating time would exceed 11 hrs with compounding infection, hemorrhage, and aspiration risk.' },
  { pair: ['Mommy Makeover', 'Rhinoplasty'], code: 'RECOVERY_CONFLICT',
    reason: 'Mommy Makeover requires the patient supine with abdominal binders for 6 weeks. Rhinoplasty requires head elevation and no abdominal pressure. These recovery protocols are physically incompatible.' },
  { pair: ['Mommy Makeover', 'Facelift'], code: 'RECOVERY_CONFLICT',
    reason: 'Combined anesthesia time exceeds 9 hrs. Facelift requires head-of-bed elevation; Mommy Makeover requires flat supine positioning. The recovery postures directly contradict each other and cannot be reconciled.' },
  { pair: ['Tummy Tuck', 'Brazilian Butt Lift'], code: 'POSITIONING_CONFLICT',
    reason: 'Tummy Tuck requires strict supine recovery. BBL requires the patient to avoid sitting or lying supine for 8 weeks to protect the transferred fat graft. These positions are mutually exclusive — this combination presents significant recovery conflicts that require review by a licensed physician before proceeding.' },
  { pair: ['Breast Reduction', 'Tummy Tuck'], code: 'HEMORRHAGE_RISK',
    reason: 'Both procedures require separate prone and supine periods with high blood loss potential. Combined, total blood loss can exceed safe transfusion thresholds. DVT risk increases 4× with dual lower + upper trunk surgery.' },
  { pair: ['Breast Reduction', 'Mommy Makeover'], code: 'REDUNDANT_FIELD',
    reason: 'Mommy Makeover already includes breast work. Adding a separate Breast Reduction creates redundant incisions in the same anatomical zone — this combination is a contraindication, not a combination.' },
  { pair: ['Bone Grafting', 'Sinus Lift'], code: 'SHARED_SURGICAL_FIELD',
    reason: 'Both procedures operate in overlapping maxillary bone and sinus membrane territory. Simultaneous grafting in the same field doubles the infection pathway and prevents proper clot formation in either graft site.' },
  { pair: ['Gastric Sleeve', 'Breast Augmentation'], code: 'METABOLIC_CONFLICT',
    reason: 'Post-bariatric tissue is metabolically stressed — fat cells are actively being reduced. Introducing a breast implant during this phase causes unpredictable capsule formation and implant displacement as body composition changes.' },
  { pair: ['Gastric Bypass', 'Liposuction'], code: 'METABOLIC_CONFLICT',
    reason: 'Gastric Bypass causes significant nutritional malabsorption. Liposuction removes fat while the body is already in a catabolic state — electrolyte depletion, protein deficiency, and impaired wound healing make this combination high-risk.' },
  { pair: ['Spine Surgery', 'Joint Replacement'], code: 'RECOVERY_CONFLICT',
    reason: 'Multi-site orthopedic surgery requires prolonged immobilization across different recovery protocols. Spinal recovery needs movement restriction; joint replacement needs immediate mobilization. These requirements directly conflict.' },
];

interface CartItem { name?: string; title?: string }
interface Violation { pairLabel: string; reason: string; code: string }

// Mirrors src/lib/medicalSafetyGate.js's HIGH_RISK_CONDITIONS — must stay in
// sync. Used below for the same condition-aware RED escalation the frontend
// twin applies (src/lib/procedureCompatibility.js getViolations).
const HIGH_RISK_CONDITIONS = [
  'Heart Disease',
  'Blood Disorders',
  'Diabetes',
  'Hypertension',
  'Epilepsy',
  'Autoimmune Disorders',
];

/**
 * Re-derives the RED violation verdict server-side from raw procedure names.
 * Never trust a client-supplied violations list — this must be recomputed here.
 *
 * Deliberate divergence from src/lib/procedureCompatibility.js: that copy also
 * computes a `recommended` first stage ("start with X this trip, Y follows in
 * 6–8 weeks"), because M never blocks a combination without saying what to do
 * instead. That is presentation, consumed only by ProcedureStackingBlocker.
 * This file exists to answer one question — is it blocked — and no server
 * caller reads a recommendation, so it isn't computed here. If a server
 * surface ever needs to show the patient an alternative (an email, a partner
 * portal), port suggestFirstStage() across rather than re-deriving it, so the
 * two can't disagree about what M advises.
 */
export function getViolations(items: CartItem[], conditions: string[] = []): { violations: Violation[]; isBlocked: boolean } {
  if (!items || items.length < 2) return { violations: [], isBlocked: false };

  const titles = items.map(i => i.title || i.name).filter(Boolean) as string[];
  const violations: Violation[] = [];

  for (const rule of RED_VIOLATION_RULES) {
    const [a, b] = rule.pair;
    if (titles.includes(a) && titles.includes(b)) {
      violations.push({ pairLabel: `${a} + ${b}`, reason: rule.reason, code: rule.code });
    }
  }

  const profiles = titles.map(t => PROCEDURE_PROFILES[t] || { stress: 3 } as ProcedureProfile);
  const majorSurgeries = profiles.filter(p => p.stress >= 6).length;
  if (majorSurgeries >= 3 && violations.length === 0) {
    violations.push({
      pairLabel: `${majorSurgeries} Major Surgeries Simultaneously`,
      code: 'ANESTHESIA_OVERLOAD',
      reason: `${majorSurgeries} high-complexity procedures scheduled in a single session. Safe anesthesia limits are typically exceeded beyond 2 concurrent major surgeries. A staged treatment plan (6–8 weeks between sessions) is the clinical standard.`,
    });
  }

  const totalAnesthesiaHrs = profiles.reduce((s, p) => s + (p.anesthesiaHrs || 0), 0);
  if (totalAnesthesiaHrs > 8 && violations.length === 0) {
    violations.push({
      pairLabel: `Combined Anesthesia > ${totalAnesthesiaHrs.toFixed(1)} Hours`,
      code: 'ANESTHESIA_OVERLOAD',
      reason: `Total estimated anesthesia time (~${totalAnesthesiaHrs.toFixed(1)} hrs) exceeds the safe ceiling for elective procedures. Beyond 8 hours, the risk of anesthesia awareness, hypothermia, and post-operative cognitive dysfunction increases significantly.`,
    });
  }

  // Disclosed high-risk condition + >=5 hrs combined anesthesia — the same
  // rule src/lib/procedureCompatibility.js applies client-side. Re-derived
  // here (not just trusted from the client) so a direct API call that skips
  // the frontend's ProcedureStackingBlocker can't bypass this escalation.
  const flaggedCondition = conditions.find(c => HIGH_RISK_CONDITIONS.includes(c));
  if (flaggedCondition && totalAnesthesiaHrs >= 5 && violations.length === 0) {
    violations.push({
      pairLabel: `${flaggedCondition} + Combined Anesthesia ~${totalAnesthesiaHrs.toFixed(1)} Hours`,
      code: 'METABOLIC_CONFLICT',
      reason: `With ${flaggedCondition} on file, ~${totalAnesthesiaHrs.toFixed(1)} hrs of combined anesthesia carries meaningfully higher risk than the same combination would for a patient without this condition — impaired metabolism, delayed wound healing, and elevated cardiac/glucose stress are all condition-specific factors this selection now needs a licensed provider to weigh in on.`,
    });
  }

  return { violations, isBlocked: violations.length > 0 };
}
