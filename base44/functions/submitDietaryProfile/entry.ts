import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      case_id, consultation_id,
      has_food_allergies, food_allergies_details,
      has_medication_allergies, medication_allergies_details,
      dietary_restrictions, dietary_restrictions_details,
      emergency_food_reaction_plan, patient_acknowledges_accuracy
    } = body;

    if (!patient_acknowledges_accuracy) {
      return Response.json({ error: 'Patient must confirm accuracy of dietary information before saving.' }, { status: 400 });
    }

    // Conditional validation
    if (has_food_allergies && !food_allergies_details) {
      return Response.json({ error: 'Please describe your food allergies.' }, { status: 400 });
    }
    if (has_medication_allergies && !medication_allergies_details) {
      return Response.json({ error: 'Please describe your medication allergies.' }, { status: 400 });
    }
    if (dietary_restrictions === 'other' && !dietary_restrictions_details) {
      return Response.json({ error: 'Please describe your dietary restrictions.' }, { status: 400 });
    }

    // Verify ownership when case_id provided
    if (case_id) {
      const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: case_id });
      if (!cases.length) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      const caseRecord = cases[0];
      const isAdmin = ['admin', 'platform_admin', 'coordinator'].includes(user.role);
      const isOwner = caseRecord.client_email === user.email;
      if (!isAdmin && !isOwner) {
        return Response.json({ error: 'Forbidden: not authorized for this case' }, { status: 403 });
      }
    }

    const existing = case_id
      ? await base44.asServiceRole.entities.DietaryProfile.filter({ case_id })
      : [];

    const profileData = {
      patient_id: user.id,
      case_id: case_id || null,
      consultation_id: consultation_id || null,
      has_food_allergies: has_food_allergies || false,
      food_allergies_details: food_allergies_details || '',
      has_medication_allergies: has_medication_allergies || false,
      medication_allergies_details: medication_allergies_details || '',
      dietary_restrictions: dietary_restrictions || 'none',
      dietary_restrictions_details: dietary_restrictions_details || '',
      emergency_food_reaction_plan: emergency_food_reaction_plan || '',
      patient_acknowledges_accuracy: true,
      last_updated_at: new Date().toISOString(),
      version: (existing[0]?.version || 0) + 1
    };

    let profile;
    if (existing.length > 0) {
      profile = await base44.asServiceRole.entities.DietaryProfile.update(existing[0].id, profileData);
    } else {
      profile = await base44.asServiceRole.entities.DietaryProfile.create(profileData);
    }

    // Link to case if provided
    if (case_id) {
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        dietary_profile_id: profile.id
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'dietary_profile_updated',
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name,
      actor_email: user.email,
      resource_type: 'dietary_profile',
      resource_id: profile.id,
      case_id: case_id || null,
      details: {
        has_food_allergies,
        has_medication_allergies,
        dietary_restrictions,
        version: profileData.version
      },
      sensitive: true,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});