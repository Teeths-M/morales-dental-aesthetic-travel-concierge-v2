import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { count = 3 } = body;

    const testConsultations = [
      {
        patient_name: 'Test Patient Two',
        email: 'testpatient2@example.com',
        phone: '+1-555-0001',
        procedure_interest: 'dental_implants',
        destination_country: 'Venezuela',
        client_country: 'United States',
        preferred_date: '2026-06-15',
        age: '35',
        gender: 'male',
        height: '180cm',
        weight: '80kg',
        nationality: 'United States',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_number: '+1-555-0002',
        has_companion: true,
        companion_relationship: 'spouse',
        travel_buddy_services: ['airport_pickup'],
        has_cultural_preferences: false,
        medical_conditions: ['none'],
        had_surgery: false,
        allergies: ['none'],
        takes_medications: false,
        lifestyle_habits: ['none'],
        exercises_regularly: true,
        activity_level: 'moderate',
        emotional_concerns: false,
        pregnancy_status: 'not_applicable',
        document_types: ['id', 'insurance'],
        status: 'pending',
        notes: 'Test low-risk patient'
      },
      {
        patient_name: 'Sarah Smith - Medium Risk',
        email: 'sarah.smith@test.com',
        phone: '+1-555-0003',
        procedure_interest: 'rhinoplasty',
        preferred_date: '2026-07-01',
        age: '42',
        gender: 'female',
        height: '165cm',
        weight: '65kg',
        nationality: 'Canada',
        emergency_contact_name: 'Mike Smith',
        emergency_contact_number: '+1-555-0004',
        has_companion: false,
        has_cultural_preferences: true,
        cultural_preferences: ['vegetarian_meals'],
        cultural_notes: 'Prefers vegetarian diet',
        medical_conditions: ['diabetes'],
        had_surgery: true,
        previous_procedures: 'Appendectomy 2015',
        last_surgery_date: '2015-05-10',
        had_complications: false,
        allergies: ['penicillin'],
        allergy_details: 'Severe penicillin allergy',
        takes_medications: true,
        medication_types: ['metformin'],
        medication_notes: 'Daily diabetes medication',
        lifestyle_habits: ['occasional_alcohol'],
        exercises_regularly: true,
        activity_level: 'light',
        emotional_concerns: true,
        emotional_concern_types: ['anxiety'],
        emotional_notes: 'Some pre-surgery anxiety',
        pregnancy_status: 'not_pregnant',
        document_types: ['medical_records', 'test_results'],
        status: 'pending',
        notes: 'Test medium-risk patient with pre-existing conditions'
      },
      {
        patient_name: 'Robert Brown - High Risk',
        email: 'robert.brown@test.com',
        phone: '+1-555-0005',
        procedure_interest: 'gastric_bypass',
        preferred_date: '2026-08-10',
        age: '58',
        gender: 'male',
        height: '175cm',
        weight: '130kg',
        nationality: 'United States',
        emergency_contact_name: 'Carol Brown',
        emergency_contact_number: '+1-555-0006',
        has_companion: true,
        companion_relationship: 'daughter',
        travel_buddy_services: ['full_support'],
        has_cultural_preferences: false,
        medical_conditions: ['hypertension', 'heart_disease', 'diabetes'],
        had_surgery: true,
        previous_procedures: 'Coronary angioplasty 2020',
        last_surgery_date: '2020-03-15',
        had_complications: true,
        surgery_complications: ['post_op_infection'],
        anesthesia_complications: true,
        anesthesia_complication_types: ['prolonged_recovery'],
        allergies: ['latex', 'aspirin'],
        allergy_details: 'Severe latex allergy, aspirin intolerance',
        takes_medications: true,
        medication_types: ['lisinopril', 'metformin', 'atorvastatin'],
        medication_notes: 'Multiple cardiac and diabetes medications',
        lifestyle_habits: ['smoker', 'heavy_alcohol'],
        exercises_regularly: false,
        activity_level: 'sedentary',
        emotional_concerns: true,
        emotional_concern_types: ['depression', 'anxiety'],
        emotional_notes: 'History of depression, requires monitoring',
        pregnancy_status: 'not_applicable',
        document_types: ['full_medical_records', 'test_results', 'cardiac_imaging'],
        status: 'pending',
        notes: 'Test high-risk patient with multiple comorbidities'
      }
    ];

    const created = [];
    
    for (let i = 0; i < Math.min(count, testConsultations.length); i++) {
      const consultation = await base44.asServiceRole.entities.Consultation.create(testConsultations[i]);
      created.push(consultation);
    }

    return Response.json({
      status: 'success',
      created_count: created.length,
      consultations: created.map(c => ({
        id: c.id,
        patient_name: c.patient_name,
        email: c.email,
        procedure: c.procedure_interest,
        message: 'Ready for workflow testing. Trigger portalHubWorkflow to run risk assessment.'
      }))
    });

  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});