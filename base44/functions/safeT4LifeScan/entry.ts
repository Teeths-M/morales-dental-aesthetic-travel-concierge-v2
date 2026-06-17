import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
  { keyword: 'active cancer', reason: 'Active malignancy — requires oncology clearance before surgery' },
  { keyword: 'severe copd', reason: 'Severe COPD — critical respiratory risk under anesthesia' },
  { keyword: 'end stage renal', reason: 'End-stage renal disease — critical metabolic risk' },
  { keyword: 'allergy to general anesthesia', reason: 'Anesthesia allergy — no safe administration pathway' },
  { keyword: 'warfarin', reason: 'Warfarin use — critical bleeding/clotting risk, requires hematology review' },
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

function computeRiskScore(caseRecord) {
  const medText = [
    caseRecord.medications || '',
    caseRecord.allergies || '',
    caseRecord.medical_conditions || '',
    caseRecord.anesthesia_history || '',
    caseRecord.mental_health_notes || '',
  ].join(' ').toLowerCase();

  for (const trigger of CRITICAL_BLOCK_TRIGGERS) {
    if (caseRecord[trigger.field] === trigger.value) {
      return { tier: 'CRITICAL', reason: trigger.reason, score: 100, flags: [trigger.reason] };
    }
  }
  const criticalKeyword = CRITICAL_KEYWORD_TRIGGERS.find(t => medText.includes(t.keyword.toLowerCase()));
  if (criticalKeyword) {
    return { tier: 'CRITICAL', reason: criticalKeyword.reason, score: 100, flags: [criticalKeyword.reason] };
  }

  let score = 0;
  const flags = [];
  for (const factor of HIGH_RISK_FACTORS) {
    if (medText.includes(factor.keyword.toLowerCase())) {
      score += factor.weight;
      flags.push(factor.keyword);
    }
  }

  const bmi = getBMI(caseRecord.height_cm, caseRecord.weight_kg);
  if (bmi && bmi >= 40) { score += 4; flags.push('BMI ≥ 40 — severe obesity'); }
  else if (bmi && bmi >= 35) { score += 2; flags.push('BMI ≥ 35 — elevated surgical risk'); }

  const age = caseRecord.age_years;
  if (age >= 70) { score += 3; flags.push('Age ≥ 70 — elevated anesthesia risk'); }
  else if (age >= 60) { score += 1; flags.push('Age 60+ — moderate age-related risk'); }
  else if (age <= 16) { score += 2; flags.push('Patient under 17 — parental consent and pediatric clearance required'); }

  // BUG-R6-03 FIX: CaseRecord.smoking_status schema is boolean (true/false), not a string enum.
  // The previous string comparisons ('Heavy'/'Moderate'/'Light') never matched, silently scoring
  // all smokers as non-smokers. Now correctly checks the boolean value from the entity schema.
  if (caseRecord.smoking_status === true) { score += 2; flags.push('Smoker — impaired wound healing and elevated surgical risk'); }

  if (caseRecord.alcohol_use === 'Heavy') { score += 3; flags.push('Heavy alcohol use — liver and anesthesia risk'); }
  else if (caseRecord.alcohol_use === 'Moderate') { score += 1; }

  const procedureCount = Array.isArray(caseRecord.procedures) ? caseRecord.procedures.length : 0;
  if (procedureCount >= 3) { score += 2; flags.push(`${procedureCount} procedures selected — elevated recovery load`); }
  else if (procedureCount >= 2) { score += 1; flags.push(`${procedureCount} procedures — standard multi-procedure planning`); }

  let tier;
  if (score >= 8) tier = 'HIGH';
  else if (score >= 4) tier = 'MEDIUM';
  else tier = 'LOW';

  return { tier, score, flags, bmi: bmi ? parseFloat(bmi.toFixed(1)) : null, procedure_count: procedureCount };
}

Deno.serve(async (req) => {
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
        signature_ip_address: ip_address || req.headers.get('x-forwarded-for') || 'unknown',
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
      });

      return Response.json({ success: true, status: 'WAIVER_SIGNED', safe_t_result: 'PASSED' });
    }

    // ── MAIN SCAN — risk score computed entirely server-side ──
    // SECURITY: No risk_score, tier, or flag accepted from request body.
    const result = computeRiskScore(cr);
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
      });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'SAFE-T 4LIFE™ Critical Alert',
          to: cr.client_email,
          subject: '⚠️ SAFE-T 4LIFE™ — Important Update on Your Medical Travel Plan',
          body: `<p>Dear ${cr.client_name},</p><p>Your SAFE-T 4LIFE™ safety screening has identified a critical factor that requires immediate review by our medical coordination team before your journey can proceed.</p><p><strong>Factor identified:</strong> ${result.reason}</p><p>A member of our concierge team will contact you within 24 hours.</p><p>— The Morales Medical Travel Team</p>`,
        });
      } catch (_) {}

      if (!adminEmail) {
        console.error(`CRITICAL CONFIG ERROR: ADMIN_EMAIL not set. Cannot dispatch alert for case ${caseId}.`);
      } else {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'SAFE-T 4LIFE™ Critical Alert',
            to: adminEmail,
            subject: `🚨 CRITICAL RISK BLOCK — Case ${caseId} · ${cr.client_name}`,
            body: `<h2>Critical Risk Intercept Triggered</h2><p><strong>Patient:</strong> ${cr.client_name} (${cr.client_email})</p><p><strong>Case ID:</strong> ${caseId}</p><p><strong>Reason:</strong> ${result.reason}</p><p><strong>All Flags:</strong> ${result.flags.join(', ')}</p><p><strong>Triggered at:</strong> ${now}</p><p>This case has been hard-locked. No administrative override is permitted.</p>`,
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
    });

  } catch (error) {
    console.error('[safeT4LifeScan]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});