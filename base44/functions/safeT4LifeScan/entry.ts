import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { createHandler } from '../../shared/createHandler.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { checkRepeatProcedureHistory, type RepeatProcedureResult } from '../../shared/repeatProcedureHistory.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const HAIKU = 'claude-haiku-4-5-20251001';

// Reads free-text intake fields that keyword rules cannot parse — catches nuanced risk signals.
// CRITICAL tier is always deterministic (M Principle). AI only annotates HIGH/MEDIUM/LOW.
async function aiRiskNote(cr: Record<string, unknown>, result: { tier: string; flags: string[] }): Promise<string | null> {
  const freeText = [cr.notes, cr.surgery_description, cr.mental_health_notes, cr.additional_notes, cr.reproductive_notes]
    .filter(Boolean).join(' | ').slice(0, 600);
  if (!freeText.trim() || !ANTHROPIC_KEY) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: HAIKU, max_tokens: 80, messages: [{ role: 'user', content: `Clinical risk analyst. Patient intake free-text: "${freeText}"\nCurrent tier: ${result.tier}. Known flags: ${result.flags.slice(0, 4).join('; ')}.\nIn max 35 words, identify any medically significant detail the automated rules may have missed. If nothing additional, reply: none` }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const t = (d.content?.[0]?.text || '').trim();
    return t.toLowerCase().startsWith('none') ? null : t;
  } catch { return null; }
}

// ── SAFE-T 4LIFE™ v2 — Automated Risk Scoring Engine ──
// Tiers: Low | Medium | High | Critical
// Critical = hard BLOCK + concierge dispatch, zero overrides
// High = mandatory waiver gate, e-sig, cryptographic timestamp, IP log
// Low / Medium = frictionless pipeline progression
//
// SECURITY: Risk score is computed server-side ONLY.
// The frontend receives only the result — it cannot inject or override the score.

const CRITICAL_BLOCK_TRIGGERS = [
  { field: 'pregnancy_status', value: true, reason: 'Active pregnancy — absolute contraindication for elective procedures' },
];

const CRITICAL_KEYWORD_TRIGGERS = [
  { keyword: 'uncontrolled diabetes', reason: 'Uncontrolled diabetes — critical perioperative risk' },
  { keyword: 'severe heart failure', reason: 'Severe heart failure — absolute anesthesia contraindication' },
  { keyword: 'recent myocardial infarction', reason: 'Recent MI (< 6 months) — elective surgery contraindicated' },
  // Matches both 'active cancer' (free text) and 'cancer (active' (form's "Cancer (active or recent)" option)
  { keyword: 'active cancer', reason: 'Active malignancy — requires oncology clearance before surgery' },
  { keyword: 'cancer (active', reason: 'Active or recent cancer — requires oncology clearance before elective surgery' },
  { keyword: 'severe copd', reason: 'Severe COPD — critical respiratory risk under anesthesia' },
  { keyword: 'end stage renal', reason: 'End-stage renal disease — critical metabolic risk' },
  // Matches form's 'General Anesthesia' allergy option and free-text variants
  { keyword: 'allergy to general anesthesia', reason: 'Anesthesia allergy — no safe administration pathway' },
  { keyword: 'general anesthesia', reason: 'Documented anesthesia allergy — requires specialist review before any GA procedure' },
  // Matches form's 'Blood thinners (Warfarin, Eliquis, Xarelto)' medication option
  { keyword: 'warfarin', reason: 'Warfarin use — critical bleeding/clotting risk, requires hematology review' },
  { keyword: 'eliquis', reason: 'Eliquis (apixaban) use — critical perioperative bleeding risk, requires hematology review' },
  { keyword: 'xarelto', reason: 'Xarelto (rivaroxaban) use — critical perioperative bleeding risk, requires hematology review' },
  { keyword: 'blood thinner', reason: 'Anticoagulation therapy — critical perioperative bleeding risk' },
];

const HIGH_RISK_FACTORS = [
  { keyword: 'diabetes', weight: 2 },
  { keyword: 'hypertension', weight: 1 },
  { keyword: 'heart disease', weight: 3 },
  { keyword: 'asthma', weight: 1 },
  { keyword: 'autoimmune', weight: 2 },
  { keyword: 'thyroid', weight: 1 },
  { keyword: 'anesthesia complication', weight: 3 },
  { keyword: 'previous complication', weight: 2 },
  { keyword: 'blood thinner', weight: 2 },
  { keyword: 'aspirin', weight: 1 },
  { keyword: 'nsaid', weight: 1 },
  { keyword: 'steroid', weight: 1 },
  { keyword: 'insulin', weight: 2 },
  { keyword: 'penicillin allergy', weight: 1 },
  { keyword: 'latex allergy', weight: 1 },
  { keyword: 'sulfa allergy', weight: 1 },
  { keyword: 'mental health', weight: 1 },
  { keyword: 'depression', weight: 1 },
  { keyword: 'anxiety', weight: 1 },
  { keyword: 'bipolar', weight: 2 },
];

function getBMI(height_cm, weight_kg) {
  if (!height_cm || !weight_kg) return null;
  return weight_kg / ((height_cm / 100) ** 2);
}

// Normalise an array or comma/newline-separated string to a single lowercase text blob.
function toText(val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(' ');
  return String(val);
}

// Procedure name normaliser — strips doses/parentheses and lowercases
function procName(p) {
  if (!p) return '';
  return (typeof p === 'string' ? p : (p.name || p.title || '')).toLowerCase();
}

// Rule R1 combo — heart disease + general anesthesia
const GA_KEYWORDS = ['general (full)', 'general anesthesia', 'full anesthesia', 'general anaesthesia'];
function isGeneralAnesthesia(caseRecord) {
  const t = (caseRecord.anesthesia_type || '').toLowerCase();
  return GA_KEYWORDS.some(k => t.includes(k)) || t.includes('general');
}

// Rule R4 — procedures that carry age-related stacking risk
const HIGH_AGE_RISK_PROCS = ['liposuction', 'abdominoplasty', 'tummy tuck', 'body contouring', 'bbl', 'brazilian butt'];

// Dangerous procedure stacking combos — ANY match triggers the level listed
const CRITICAL_STACKS = [
  {
    // Brazilian Trio / Mummy Makeover with 3+ body procedures
    must: ['liposuction'],
    any: [['abdominoplasty', 'tummy tuck'], ['breast augmentation', 'breast lift', 'mastopexy', 'augmentation mammoplasty']],
    reason: 'Triple body-contouring stack (liposuction + tummy tuck + breast) — combined anaesthesia load and fluid shift create life-threatening DVT and haemorrhage risk.',
  },
  {
    // BBL + abdominoplasty = positioning conflict
    must: ['bbl', 'brazilian butt'],
    any: [['abdominoplasty', 'tummy tuck']],
    reason: 'BBL combined with abdominoplasty — prone-to-supine positioning conflict creates critical respiratory and haemodynamic instability risk.',
  },
];

const HIGH_STACKS = [
  {
    // Any two abdominal procedures
    any: [['abdominoplasty', 'tummy tuck'], ['liposuction']],
    minGroups: 2,
    reason: 'Multiple abdominal procedures — combined wound tension, fluid shifts, and recovery interference require staged planning.',
  },
  {
    // Three or more facial procedures
    keywords: ['facelift', 'rhinoplasty', 'blepharoplasty', 'otoplasty', 'chin implant', 'fat transfer face'],
    minMatch: 3,
    reason: 'Three or more simultaneous facial procedures — combined anaesthesia time and swelling interference require staged approach.',
  },
];

function detectStackingRisk(procedures) {
  if (!Array.isArray(procedures) || procedures.length < 2) return null;
  const names = procedures.map(procName);

  // Critical stack detection
  for (const rule of CRITICAL_STACKS) {
    const hasMust = rule.must.some(k => names.some(n => n.includes(k)));
    if (!hasMust) continue;
    const allGroupsMatched = rule.any.every(group => group.some(k => names.some(n => n.includes(k))));
    if (allGroupsMatched) return { tier: 'CRITICAL', reason: rule.reason };
  }

  // High stack detection
  for (const rule of HIGH_STACKS) {
    if (rule.keywords) {
      const matchCount = rule.keywords.filter(k => names.some(n => n.includes(k))).length;
      if (matchCount >= rule.minMatch) return { tier: 'HIGH', reason: rule.reason };
    }
    if (rule.any) {
      const groupMatches = rule.any.filter(group => group.some(k => names.some(n => n.includes(k)))).length;
      if (groupMatches >= (rule.minGroups || 2)) return { tier: 'HIGH', reason: rule.reason };
    }
  }

  return null;
}

function computeRiskScore(caseRecord, repeatCheck?: RepeatProcedureResult) {
  // Build a single lowercase search string from every field that may contain medical data.
  // Covers both the legacy CaseRecord field names (medications, allergies, anesthesia_history)
  // AND the PatientIntakeTelemetry field names (medication_types, allergy_types, anesthesia_notes)
  // so that both intake paths score correctly regardless of which fields are populated.
  const medText = [
    toText(caseRecord.medications),
    toText(caseRecord.medication_types),
    toText(caseRecord.medication_free_text),
    toText(caseRecord.allergies),
    toText(caseRecord.allergy_types),
    toText(caseRecord.allergy_free_text),
    toText(caseRecord.medical_conditions),
    toText(caseRecord.medical_conditions_notes),
    toText(caseRecord.anesthesia_history),
    toText(caseRecord.anesthesia_notes),
    toText(caseRecord.mental_health_notes),
    toText(caseRecord.surgery_description),
    toText(caseRecord.complication_types),
    toText(caseRecord.reproductive_notes),
  ].join(' ').toLowerCase();

  // ── CRITICAL block checks (order: most severe first) ─────────────────────
  for (const trigger of CRITICAL_BLOCK_TRIGGERS) {
    if (caseRecord[trigger.field] === trigger.value) {
      return { tier: 'CRITICAL', reason: trigger.reason, score: 100, flags: [trigger.reason] };
    }
  }

  // Breastfeeding — anesthetic agents transfer to breast milk
  if (caseRecord.breastfeeding === true) {
    return {
      tier: 'CRITICAL',
      reason: 'Currently breastfeeding — anesthetic agents transfer to breast milk and pose risk to infant. Elective procedures must be deferred.',
      score: 100,
      flags: ['Breastfeeding — critical contraindication for elective surgery'],
    };
  }

  // R2: Bleeding or clotting disorder → absolute Critical for any invasive procedure
  if (caseRecord.bleeding_disorder === true) {
    return {
      tier: 'CRITICAL',
      reason: 'Bleeding or clotting disorder detected — critical perioperative haemorrhage risk. Haematology clearance is mandatory before any invasive procedure.',
      score: 100,
      flags: ['Bleeding / clotting disorder — Critical contraindication for invasive surgery'],
    };
  }

  // Critical keyword scan (covers warfarin, eliquis, cancer-active, severe COPD, etc.)
  const criticalKeyword = CRITICAL_KEYWORD_TRIGGERS.find(t => medText.includes(t.keyword.toLowerCase()));
  if (criticalKeyword) {
    return { tier: 'CRITICAL', reason: criticalKeyword.reason, score: 100, flags: [criticalKeyword.reason] };
  }

  const procedureCount = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.length : 0;
  const age = Number(caseRecord.age_years) || 0;
  const generalAnesthesia = isGeneralAnesthesia(caseRecord);

  // R1: Heart disease + general anesthesia → Critical (cardiac arrest risk under GA)
  const hasHeartDisease = medText.includes('heart disease') ||
    (Array.isArray(caseRecord.medical_conditions) &&
      caseRecord.medical_conditions.some(c => /heart disease/i.test(c)));
  if (hasHeartDisease && generalAnesthesia) {
    return {
      tier: 'CRITICAL',
      reason: 'Heart disease combined with general anesthesia — critical perioperative cardiac risk. Cardiology clearance and anaesthesiologist sign-off are mandatory.',
      score: 100,
      flags: ['Heart disease + general anesthesia — Critical risk combination (R1)'],
    };
  }

  // Dangerous procedure stacking combos
  const stackRisk = detectStackingRisk(caseRecord.procedures);
  if (stackRisk?.tier === 'CRITICAL') {
    return { tier: 'CRITICAL', reason: stackRisk.reason, score: 100, flags: [stackRisk.reason] };
  }

  // Rule R8: 4+ procedures + age > 50 → Critical stacking block
  if (procedureCount > 3 && age > 50) {
    return {
      tier: 'CRITICAL',
      reason: `${procedureCount} procedures combined with age ${age} — critical stacking and recovery risk. Maximum 3-procedure sessions permitted for patients over 50.`,
      score: 100,
      flags: [`${procedureCount} procedures — stacking limit exceeded for age ${age}`],
    };
  }

  // Repeat-procedure history: patient has had this SAME major procedure done
  // before, on an earlier trip through Morales, at least REVIEW_THRESHOLD
  // times. Guaranteed HIGH (never a score contribution that could get
  // diluted by an otherwise-clean profile) — a patient repeating the same
  // major surgery may show no other risk factor at all. Reuses the exact
  // same HIGH-tier machinery below (mandatory waiver, e-sig, doctor review) —
  // never an unconditional block. See repeatProcedureHistory.ts.
  if (repeatCheck?.requiresReview) {
    const detail = repeatCheck.repeats
      .map((r) => `${r.procedure} (this would be visit #${r.priorCompletedCount + 1})`)
      .join(', ');
    return {
      tier: 'HIGH',
      reason: `Repeat procedure detected: ${detail}. A patient's own surgical history for the same procedure needs a licensed doctor's direct review before proceeding again.`,
      score: 8,
      flags: [`Repeat procedure history: ${detail} — mandatory doctor review required`],
    };
  }

  // ── HIGH-RISK weighted scoring ────────────────────────────────────────────
  let score = 0;
  const flags = [];

  for (const factor of HIGH_RISK_FACTORS) {
    if (medText.includes(factor.keyword.toLowerCase())) {
      score += factor.weight;
      flags.push(factor.keyword);
    }
  }

  // BMI
  const bmi = getBMI(caseRecord.height_cm, caseRecord.weight_kg);
  if (bmi && bmi >= 40) { score += 4; flags.push('BMI ≥ 40 — severe obesity'); }
  else if (bmi && bmi >= 35) { score += 2; flags.push('BMI ≥ 35 — elevated surgical risk'); }

  // Age
  if (age >= 70) { score += 3; flags.push('Age ≥ 70 — elevated anesthesia risk'); }
  else if (age >= 60) { score += 1; flags.push('Age 60+ — moderate age-related risk'); }
  else if (age > 0 && age <= 16) { score += 2; flags.push('Patient under 17 — parental consent and pediatric clearance required'); }

  // Smoking — form stores a string ('None'|'Light'|'Moderate'|'Heavy');
  // legacy boolean records also accepted. Both paths now scored correctly.
  const smokingStr = typeof caseRecord.smoking_status === 'string'
    ? caseRecord.smoking_status.toLowerCase() : '';
  if (caseRecord.smoking_status === true || smokingStr === 'heavy') {
    score += 3; flags.push('Heavy smoker — severely impaired wound healing and elevated surgical risk');
  } else if (smokingStr === 'moderate') {
    score += 2; flags.push('Smoker (moderate) — impaired wound healing and elevated surgical risk');
  } else if (smokingStr === 'light') {
    score += 1; flags.push('Light smoker — mild wound healing risk');
  }

  // Alcohol
  if (caseRecord.alcohol_use === 'Heavy') { score += 3; flags.push('Heavy alcohol use — liver and anesthesia risk'); }
  else if (caseRecord.alcohol_use === 'Moderate') { score += 1; }

  // Previous surgical complications
  if (caseRecord.had_complications === true) {
    score += 2; flags.push('Previous surgical complications — elevated perioperative risk');
  }

  // Anesthesia complications (boolean — more reliable than free-text)
  if (caseRecord.anesthesia_complications === true) {
    score += 3; flags.push('Previous anesthesia complications — mandatory anaesthesiologist review required');
  }

  // R3: Diabetes or hypertension + general anesthesia → mandatory enhanced monitoring
  const hasDiabetes = medText.includes('diabetes') ||
    (Array.isArray(caseRecord.medical_conditions) && caseRecord.medical_conditions.some(c => /diabetes/i.test(c)));
  const hasHypertension = medText.includes('hypertension') ||
    (Array.isArray(caseRecord.medical_conditions) && caseRecord.medical_conditions.some(c => /hypertension/i.test(c)));
  if ((hasDiabetes || hasHypertension) && generalAnesthesia) {
    score += 3;
    flags.push(`${hasDiabetes ? 'Diabetes' : 'Hypertension'} with general anesthesia — enhanced pre-operative monitoring and endocrinology/cardiology review required (R3)`);
  }

  // R4: Age > 65 + liposuction or abdominoplasty → high perioperative risk
  const hasHighAgeRiskProc = Array.isArray(caseRecord.procedures) &&
    caseRecord.procedures.some(p => HIGH_AGE_RISK_PROCS.some(k => procName(p).includes(k)));
  if (age > 65 && hasHighAgeRiskProc) {
    score += 4;
    flags.push(`Age ${age} with high-risk body-contouring procedure — specialist pre-operative assessment mandatory (R4)`);
  }

  // R7: Stacking > 2 + any chronic condition → staged approach required
  const CHRONIC_KEYWORDS = ['diabetes', 'hypertension', 'heart disease', 'asthma', 'autoimmune', 'thyroid', 'kidney disease', 'liver disease', 'epilepsy', 'sleep apnea', 'stroke', 'hiv', 'cancer'];
  const hasChronicCondition = CHRONIC_KEYWORDS.some(k => medText.includes(k));
  if (procedureCount > 2 && hasChronicCondition) {
    score += 3;
    flags.push(`${procedureCount} procedures with chronic medical condition — staged procedure approach strongly recommended (R7)`);
  }

  // High procedure stacking combo (non-critical but flagged)
  if (stackRisk?.tier === 'HIGH') {
    score += 4;
    flags.push(stackRisk.reason);
  }

  // Procedure stacking count
  if (procedureCount >= 3) { score += 2; flags.push(`${procedureCount} procedures selected — elevated combined recovery load`); }
  else if (procedureCount >= 2) { score += 1; flags.push(`${procedureCount} procedures — multi-procedure recovery planning required`); }

  let tier;
  if (score >= 8) tier = 'HIGH';
  else if (score >= 4) tier = 'MEDIUM';
  else tier = 'LOW';

  return { tier, score, flags, bmi: bmi ? parseFloat(bmi.toFixed(1)) : null, procedure_count: procedureCount };
}

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: All scan and waiver actions require authenticated user
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { caseId, action } = body;

    if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 });

    // SECURITY: Fetch case via service role but enforce ownership — only case owner or admin may scan
    // BUG-R5-08 FIX: filter({ id }) always returns [] — use .get() for primary key lookup
    const cr = await base44.asServiceRole.entities.CaseRecord.get(caseId);
    if (!cr) return Response.json({ error: 'Case not found' }, { status: 404 });

    const isAdmin = ['admin', 'platform_admin'].includes(user.role);
    if (!isAdmin && cr.client_email !== user.email) {
      return Response.json({ error: 'Forbidden: this case does not belong to you' }, { status: 403 });
    }

    // SECURITY: BLOCKED cases cannot be re-scanned or have waivers signed — hard lock is permanent
    if (cr.safe_t_result === 'BLOCKED' && action !== 'get_status') {
      return Response.json({
        status: 'BLOCKED',
        tier: 'CRITICAL',
        message: 'This case has been hard-locked. No re-scan or override is permitted.',
        override_permitted: false,
      }, { status: 403 });
    }

    if (action === 'sign_waiver') {
      const { signature_data, ip_address, patient_name } = body;
      if (!signature_data) return Response.json({ error: 'signature_data required' }, { status: 400 });

      // SECURITY: Only HIGH risk cases with waiver_status='required' may sign
      if (cr.waiver_status !== 'required' && cr.waiver_status !== 'sent') {
        return Response.json({ error: 'No waiver is currently required for this case' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const tl = cr.timeline_log || [];
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        signature_data,
        signature_timestamp: now,
        // Use the rightmost IP — proxies append, so rightmost = actual client
        signature_ip_address: ip_address || (() => { const f = req.headers.get('x-forwarded-for'); return f ? f.split(',').pop()?.trim() || 'unknown' : req.headers.get('cf-connecting-ip') || 'unknown'; })(),
        waiver_status: 'signed',
        safe_t_result: 'PASSED',
        status: 'Safe-T-Reviewed',
        timeline_log: [...tl, {
          timestamp: now,
          action: 'high_risk_waiver_signed',
          details: `High-risk waiver electronically signed by ${patient_name || cr.client_name}. IP: ${ip_address || 'unknown'}`,
        }],
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'safe_t_high_risk_waiver_signed',
        resource_type: 'case_record',
        resource_id: caseId,
        case_id: caseId,
        actor_id: user.id,
        actor_name: patient_name || cr.client_name,
        details: { signed_at: now, ip_address: ip_address || 'unknown', risk_flags: cr.safe_t_flags },
        sensitive: true,
        timestamp: now,
        prev_hash: await computePrevHash(base44),
      });

      return Response.json({ success: true, status: 'WAIVER_SIGNED', safe_t_result: 'PASSED' });
    }

    // ── MAIN SCAN — risk score computed entirely server-side ──
    // SECURITY: No risk_score, tier, or flag accepted from request body.
    const repeatCheck = await checkRepeatProcedureHistory(base44, cr.client_email, cr.procedures || []);
    const result = computeRiskScore(cr, repeatCheck);
    // AI agentic layer: reads free-text notes the keyword rules cannot parse.
    // CRITICAL tier stays deterministic always — AI never overrides the hard block (M Principle).
    const aiNote = result.tier !== 'CRITICAL' ? await aiRiskNote(cr, result) : null;
    const now = new Date().toISOString();
    const tl = cr.timeline_log || [];
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    if (result.tier === 'CRITICAL') {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        safe_t_result: 'BLOCKED',
        risk_score: 'High',
        case_priority: 'Critical',
        safe_t_flags: result.flags,
        status: 'Admin-Review',
        timeline_log: [...tl, {
          timestamp: now,
          action: 'safe_t_critical_block',
          details: `CRITICAL RISK INTERCEPT: ${result.reason}. Hard lock applied.`,
        }],
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'safe_t_critical_block',
        resource_type: 'case_record',
        resource_id: caseId,
        case_id: caseId,
        actor_id: user.id,
        details: { reason: result.reason, flags: result.flags },
        sensitive: true,
        timestamp: now,
        prev_hash: await computePrevHash(base44),
      });

      // The critical risk reason/flags stay in the case record (already saved
      // above) and the admin dashboard — never in an outbound email body.
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'SAFE-T 4LIFE™ Critical Alert',
          to: cr.client_email,
          subject: '⚠️ SAFE-T 4LIFE™ — Important Update on Your Medical Travel Plan',
          body: linkOnlyEmail({
            title: 'A safety review is needed before you travel',
            line: 'Our team has identified something in your safety screening that needs review before your journey can proceed. A member of our concierge team will contact you within 24 hours.',
            ctaUrl: `${APP_URL}/dashboard`,
            ctaLabel: 'Open My Dashboard',
            from: 'safeT4LifeScan',
          }),
        });
      } catch (_) {}

      if (!adminEmail) {
        console.error(`CRITICAL CONFIG ERROR: ADMIN_EMAIL not set. Cannot dispatch alert for case ${caseId}.`);
      } else {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'SAFE-T 4LIFE™ Critical Alert',
            to: adminEmail,
            subject: '🚨 CRITICAL RISK BLOCK — case hard-locked, review required',
            body: linkOnlyEmail({
              title: 'A case has been hard-locked by SAFE-T 4LIFE™',
              line: 'A critical risk factor was intercepted. The case is hard-locked — no administrative override is permitted. Open the admin dashboard for the full detail.',
              ctaUrl: `${APP_URL}/admin`,
              ctaLabel: 'Open Admin Dashboard',
              from: 'safeT4LifeScan',
            }),
          });
        } catch (_) {}
      }

      return Response.json({
        status: 'BLOCKED',
        tier: 'CRITICAL',
        reason: result.reason,
        flags: result.flags,
        message: 'A critical safety factor has been identified. A member of our concierge team will contact you within 24 hours.',
        admin_alerted: true,
        override_permitted: false,
      });
    }

    if (result.tier === 'HIGH') {
      await base44.asServiceRole.entities.CaseRecord.update(caseId, {
        safe_t_result: 'PENDING',
        risk_score: 'High',
        case_priority: 'Urgent',
        safe_t_flags: result.flags,
        waiver_status: 'required',
        status: 'Safe-T-Reviewed',
        timeline_log: [...tl, {
          timestamp: now,
          action: 'safe_t_high_risk_detected',
          details: `HIGH RISK: Score ${result.score}. Waiver gate triggered. Flags: ${result.flags.join(', ')}`,
        }],
      });

      return Response.json({
        status: 'WAIVER_REQUIRED',
        tier: 'HIGH',
        score: result.score,
        flags: result.flags,
        bmi: result.bmi,
        procedure_count: result.procedure_count,
        message: 'Your profile contains elevated risk factors. A mandatory digital waiver is required before proceeding.',
        waiver_required: true,
        ai_clinical_note: aiNote,
      });
    }

    const riskScore = result.tier === 'MEDIUM' ? 'Moderate' : 'Low';
    await base44.asServiceRole.entities.CaseRecord.update(caseId, {
      safe_t_result: 'PASSED',
      risk_score: riskScore,
      case_priority: result.tier === 'MEDIUM' ? 'Urgent' : 'Normal',
      safe_t_flags: result.flags,
      status: 'Safe-T-Reviewed',
      timeline_log: [...tl, {
        timestamp: now,
        action: 'safe_t_passed',
        details: `${result.tier} risk. Score: ${result.score}. Proceeding to doctor assignment.`,
      }],
    });

    return Response.json({
      status: 'PASSED',
      tier: result.tier,
      risk_score: riskScore,
      score: result.score,
      flags: result.flags,
      bmi: result.bmi,
      procedure_count: result.procedure_count,
      message: result.tier === 'MEDIUM'
        ? 'A few items in your profile need attention before travel. Your coordinator will review them with you.'
        : 'Your profile looks great. You are cleared to proceed to specialist matching.',
      waiver_required: false,
      ai_clinical_note: aiNote,
    });

  } catch (error) {
    console.error('[safeT4LifeScan]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'safeT4LifeScan', requireAuth: false }));
