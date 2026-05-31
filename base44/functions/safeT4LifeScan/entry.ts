import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { caseId } = await req.json();
    
    if (!caseId) {
      return Response.json({ error: 'Case ID required' }, { status: 400 });
    }

    // Fetch the case
    const caseRecord = await base44.entities.CaseRecord.get(caseId);
    
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // High-risk keywords for SAFE-T4LIFE screening
    const highRiskKeywords = [
      'blood thinner',
      'uncontrolled diabetes',
      'severe copd',
      'pregnancy',
      'allergy to lidocaine',
      'previous anesthesia complication'
    ];

    // Collect all medical text fields
    const medicalText = [
      caseRecord.medications || '',
      caseRecord.allergies || '',
      caseRecord.medical_conditions || '',
      caseRecord.anesthesia_history || '',
      caseRecord.mental_health_notes || ''
    ].join(' ').toLowerCase();

    // Check for high-risk keywords
    const foundRisks = highRiskKeywords.filter(keyword => 
      medicalText.includes(keyword.toLowerCase())
    );

    // Count risk factors
    let riskFactorCount = 0;
    
    // Smoking risk
    if (caseRecord.smoking_status === 'Heavy') riskFactorCount++;
    
    // Alcohol risk
    if (caseRecord.alcohol_use === 'Heavy') riskFactorCount++;
    
    // Pregnancy risk
    if (caseRecord.pregnancy_status === 'Pregnant') riskFactorCount++;
    
    // Medical conditions risk
    if (caseRecord.medical_conditions && caseRecord.medical_conditions.length > 50) riskFactorCount++;
    
    // Anesthesia history risk
    if (caseRecord.anesthesia_history && caseRecord.anesthesia_history.toLowerCase().includes('complication')) riskFactorCount++;

    // Determine if BLOCKED
    if (foundRisks.length > 0 || caseRecord.pregnancy_status === 'Pregnant') {
      // BLOCKED
      await base44.entities.CaseRecord.update(caseId, {
        safe_t_result: 'BLOCKED',
        status: 'Submitted',
        risk_score: 'High'
      });

      return Response.json({
        status: 'BLOCKED',
        message: 'Based on your medical profile, this procedure combination may not currently be safe. Please consult a medical advisor.',
        risk_factors: foundRisks
      });
    }

    // Calculate risk score
    let riskScore = 'Low';
    if (riskFactorCount >= 4) {
      riskScore = 'High';
    } else if (riskFactorCount >= 2) {
      riskScore = 'Moderate';
    }

    // PASSED - Update case
    await base44.entities.CaseRecord.update(caseId, {
      safe_t_result: 'PASSED',
      status: 'Safe-T-Reviewed',
      risk_score: riskScore
    });

    return Response.json({
      status: 'PASSED',
      risk_score: riskScore,
      risk_factors_count: riskFactorCount,
      message: 'SAFE-T4LIFE review complete. Proceeding to doctor assignment.'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});