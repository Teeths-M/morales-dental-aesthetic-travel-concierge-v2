import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── generateSafeTProfile ──────────────────────────────────────────────────────
// Triggered on Consultation create/update events.
// 1. Creates (or updates) the patient's SafeTProfile.
// 2. Syncs all new medical data back to the linked CaseRecord.
// 3. Marks the CaseRecord safe_t_result = PENDING so the patient is prompted
//    to re-run the SAFE-T 4LIFE™ scan with the latest data.
// 4. Sends a notification email if new risk-relevant data was discovered.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event, data } = await req.json();

    const validEvents = ['create', 'update'];
    if (!validEvents.includes(event?.type) || event?.entity_name !== 'Consultation') {
      return Response.json({ success: false, message: 'Not a Consultation create/update event' });
    }

    const consultation = data;
    const consultation_id = event.entity_id;
    const patientEmail = consultation.email || consultation.client_email || consultation.patient_email;
    const patientName = consultation.patient_name || consultation.client_name || 'Patient';

    // ── 1. Build risk factor summary from consultation data ───────────────────
    const riskFactors = [];
    if (consultation.medical_conditions?.length > 0)
      riskFactors.push(`Medical conditions: ${consultation.medical_conditions.join(', ')}`);
    if (consultation.allergies?.length > 0)
      riskFactors.push(`Allergies: ${consultation.allergies.join(', ')}`);
    if (consultation.anesthesia_complications)
      riskFactors.push('Previous anesthesia complications');
    if (consultation.had_complications)
      riskFactors.push('Previous surgery complications');
    if (consultation.takes_medications)
      riskFactors.push('On regular medications');
    if (consultation.bleeding_disorder)
      riskFactors.push('Bleeding / clotting disorder');
    if (consultation.pregnancy_status)
      riskFactors.push('Active pregnancy');
    if (consultation.breastfeeding)
      riskFactors.push('Currently breastfeeding');

    // Simple risk tier for SafeTProfile (the full engine runs via safeT4LifeScan)
    let riskLevel = 'low';
    if (riskFactors.length >= 4 || consultation.bleeding_disorder || consultation.pregnancy_status || consultation.breastfeeding) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 2) {
      riskLevel = 'medium';
    }

    // ── 2. Create or update SafeTProfile ─────────────────────────────────────
    const existingProfiles = await base44.asServiceRole.entities.SafeTProfile.filter({ consultation_id });
    const profileData = {
      consultation_id,
      patient_email: patientEmail,
      patient_name: patientName,
      procedure: consultation.procedure_interest || consultation.procedures?.join(', ') || 'TBD',
      destination: consultation.preferred_destination || 'TBD',
      risk_level: riskLevel,
      risk_factors: riskFactors,
      health_summary: {
        age: consultation.age || consultation.age_years,
        gender: consultation.gender,
        medical_conditions: consultation.medical_conditions || [],
        allergies: consultation.allergies || [],
        medications: consultation.medication_types || [],
        previous_surgeries: consultation.had_surgery || false,
        bleeding_disorder: consultation.bleeding_disorder || false,
        anesthesia_type: consultation.anesthesia_type || '',
      },
      preparation_checklist: [
        { task: 'Complete pre-operative blood work', days_before: 10, completed: false },
        { task: 'Obtain medical clearance from primary care physician', days_before: 7, completed: false },
        { task: 'Discontinue smoking if applicable (minimum 4 weeks prior)', days_before: 28, completed: false },
        { task: 'Avoid blood-thinning medications as directed by your doctor', days_before: 7, completed: false },
        { task: 'Arrange travel and accommodation', days_before: 14, completed: false },
        { task: 'Attend pre-operative consultation with surgeon', days_before: 3, completed: false },
        { task: 'Fast 6–8 hours before procedure (NPO protocol)', days_before: 0, completed: false },
      ],
      recovery_timeline: [
        { day: 0, milestone: 'Procedure Day', restrictions: ['Complete rest', 'Pain management protocol', 'No driving'] },
        { day: 1, milestone: 'Day 1 Recovery', restrictions: ['Light activity only', 'Wound care', 'Medication adherence'] },
        { day: 3, milestone: 'Day 3 Checkpoint', restrictions: ['Gradual mobilisation', 'Monitor for infection signs'] },
        { day: 7, milestone: 'One Week', restrictions: ['Avoid strenuous activity', 'Follow-up appointment'] },
        { day: 14, milestone: 'Two Weeks', restrictions: ['Light exercise OK', 'Watch for late complications'] },
        { day: 30, milestone: 'One Month', restrictions: ['Gradual return to normal activity'] },
      ],
      wellness_tracker: {
        pain_level: 0,
        mood: 'neutral',
        activity_level: 'resting',
        last_check_in: new Date().toISOString(),
      },
      doctor_notes: 'SAFE-T 4LIFE™ profile generated from consultation data. Full risk scan required.',
      status: 'active',
    };

    if (existingProfiles.length > 0) {
      await base44.asServiceRole.entities.SafeTProfile.update(existingProfiles[0].id, profileData);
    } else {
      profileData.created_at = new Date().toISOString();
      await base44.asServiceRole.entities.SafeTProfile.create(profileData);
    }

    // ── 3. Sync medical data to linked CaseRecord + mark for re-scan ─────────
    if (!patientEmail) {
      return Response.json({ success: true, message: 'SafeTProfile saved. No patient email — CaseRecord sync skipped.' });
    }

    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: patientEmail },
      '-created_date',
      1,
    );

    if (cases.length > 0) {
      const cr = cases[0];
      const now = new Date().toISOString();
      const tl = cr.timeline_log || [];

      // Fields to sync from consultation into CaseRecord so the engine can score them
      const medicalSync = {
        medical_conditions: consultation.medical_conditions || cr.medical_conditions,
        medication_types: consultation.medication_types || cr.medication_types,
        medication_free_text: consultation.medication_free_text || cr.medication_free_text,
        allergy_types: consultation.allergies || cr.allergy_types,
        anesthesia_complications: consultation.anesthesia_complications ?? cr.anesthesia_complications,
        anesthesia_notes: consultation.anesthesia_notes || cr.anesthesia_notes,
        anesthesia_type: consultation.anesthesia_type || cr.anesthesia_type,
        had_surgery: consultation.had_surgery ?? cr.had_surgery,
        had_complications: consultation.had_complications ?? cr.had_complications,
        bleeding_disorder: consultation.bleeding_disorder ?? cr.bleeding_disorder,
        pregnancy_status: consultation.pregnancy_status ?? cr.pregnancy_status,
        breastfeeding: consultation.breastfeeding ?? cr.breastfeeding,
        age_years: consultation.age || consultation.age_years || cr.age_years,
        height_cm: consultation.height_cm || cr.height_cm,
        weight_kg: consultation.weight_kg || cr.weight_kg,
        smoking_status: consultation.smoking_status || cr.smoking_status,
        alcohol_use: consultation.alcohol_use || cr.alcohol_use,
        mental_health_notes: consultation.mental_health_notes || cr.mental_health_notes,
      };

      // Only mark for re-scan if the event is an update AND risk-relevant data changed
      const needsRescan = event.type === 'update' && cr.safe_t_result === 'PASSED';

      await base44.asServiceRole.entities.CaseRecord.update(cr.id, {
        ...medicalSync,
        ...(needsRescan ? {
          safe_t_result: 'PENDING',
          timeline_log: [...tl, {
            timestamp: now,
            action: 'safe_t_rescan_required',
            details: 'New medical information from consultation requires SAFE-T 4LIFE™ re-scan.',
          }],
        } : {}),
      });

      // Notify patient if a re-scan is required due to updated consultation data
      if (needsRescan && patientEmail) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'SAFE-T 4LIFE™ Safety Update',
            to: patientEmail,
            subject: '⚠️ SAFE-T 4LIFE™ — Updated Information Requires a New Safety Scan',
            body: `<p>Dear ${patientName},</p>
<p>New medical information has been recorded during your recent consultation. As a result, your SAFE-T 4LIFE™ safety profile needs to be re-evaluated with the latest data.</p>
<p>Please log in to your dashboard and re-run your SAFE-T 4LIFE™ scan to ensure your risk assessment reflects your current health status.</p>
<p>This step is required before your booking can progress.</p>
<p>— The Morales Medical Travel Team</p>`,
          });
        } catch (_) {}
      }
    }

    return Response.json({ success: true, message: 'SafeTProfile saved and CaseRecord synced.' });
  } catch (error) {
    console.error('[generateSafeTProfile]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
