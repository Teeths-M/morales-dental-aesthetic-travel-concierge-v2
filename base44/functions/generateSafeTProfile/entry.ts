import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    if (!event || event.type !== 'create' || event.entity_name !== 'Consultation') {
      return Response.json({ success: false, message: 'Not a consultation creation event' });
    }

    const consultation = data;

    // Extract risk factors from medical data
    const riskFactors = [];
    if (consultation.medical_conditions?.length > 0) {
      riskFactors.push(`Medical conditions: ${consultation.medical_conditions.join(', ')}`);
    }
    if (consultation.allergies?.length > 0) {
      riskFactors.push(`Allergies: ${consultation.allergies.join(', ')}`);
    }
    if (consultation.anesthesia_complications) {
      riskFactors.push('Previous anesthesia complications');
    }
    if (consultation.had_complications) {
      riskFactors.push('Previous surgery complications');
    }
    if (consultation.takes_medications) {
      riskFactors.push('On regular medications');
    }

    // Determine risk level
    let riskLevel = 'low';
    if (riskFactors.length >= 3) riskLevel = 'high';
    else if (riskFactors.length >= 1) riskLevel = 'medium';

    // Generate preparation checklist
    const preparationChecklist = [
      { task: 'Complete pre-operative blood work', days_before: 10, completed: false },
      { task: 'Obtain medical clearance from primary care physician', days_before: 7, completed: false },
      { task: 'Discontinue smoking (if applicable)', days_before: 4, completed: false },
      { task: 'Avoid blood-thinning medications', days_before: 7, completed: false },
      { task: 'Arrange travel and accommodation', days_before: 14, completed: false },
      { task: 'Attend pre-operative consultation with surgeon', days_before: 3, completed: false },
      { task: 'Fast 6 hours before procedure (NPO)', days_before: 0, completed: false }
    ];

    // Generate recovery timeline (7-day basic outline)
    const recoveryTimeline = [
      { day: 0, milestone: 'Procedure Day', restrictions: ['Complete rest', 'Pain management', 'No driving'] },
      { day: 1, milestone: 'Day 1 Recovery', restrictions: ['Light activity only', 'Follow wound care', 'Medication adherence'] },
      { day: 3, milestone: 'Day 3 Checkpoint', restrictions: ['Gradual mobilization', 'Monitor for infection'] },
      { day: 7, milestone: 'One Week', restrictions: ['Avoid strenuous activity', 'Follow-up appointment'] },
      { day: 14, milestone: 'Two Weeks', restrictions: ['Light exercise OK', 'Watch for complications'] },
      { day: 30, milestone: 'One Month', restrictions: ['Return to normal gradually'] }
    ];

    // Create SAFE-T Profile
    const safeTProfile = await base44.asServiceRole.entities.SafeTProfile.create({
      consultation_id: consultation.id,
      patient_email: consultation.email,
      patient_name: consultation.patient_name,
      procedure: consultation.procedure_interest,
      destination: consultation.preferred_date?.toString() || 'TBD',
      risk_level: riskLevel,
      risk_factors: riskFactors,
      health_summary: {
        age: consultation.age,
        gender: consultation.gender,
        medical_conditions: consultation.medical_conditions || [],
        allergies: consultation.allergies || [],
        medications: consultation.medication_types || [],
        previous_surgeries: consultation.had_surgery || false
      },
      preparation_checklist: preparationChecklist,
      recovery_timeline: recoveryTimeline,
      wellness_tracker: {
        pain_level: 0,
        mood: 'neutral',
        activity_level: 'resting',
        last_check_in: new Date().toISOString()
      },
      doctor_notes: 'Welcome to SAFE-T 4LIFE. Your personalized health and safety companion will guide you through every step.',
      created_at: new Date().toISOString(),
      status: 'active'
    });

    return Response.json({
      success: true,
      safet_profile_id: safeTProfile.id,
      message: 'SAFE-T Profile created successfully'
    });
  } catch (error) {
    console.error('SAFE-T Profile generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});