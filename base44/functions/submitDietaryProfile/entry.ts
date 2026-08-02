import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { reviseAndUpdate } from '../../shared/reviseAndUpdate.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';

const DietaryProfileSchema = strictObject({
  case_id: z.string().trim().max(100).optional(),
  consultation_id: z.string().trim().max(100).optional(),
  has_food_allergies: z.boolean().optional().default(false),
  food_allergies_details: z.string().max(2000).optional().default(''),
  has_medication_allergies: z.boolean().optional().default(false),
  medication_allergies_details: z.string().max(2000).optional().default(''),
  dietary_restrictions: z.string().trim().max(100).optional().default('none'),
  dietary_restrictions_details: z.string().max(2000).optional().default(''),
  emergency_food_reaction_plan: z.string().max(2000).optional().default(''),
  patient_acknowledges_accuracy: z.boolean().optional().default(false),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const validated = validate(DietaryProfileSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const {
      case_id, consultation_id,
      has_food_allergies, food_allergies_details,
      has_medication_allergies, medication_allergies_details,
      dietary_restrictions, dietary_restrictions_details,
      emergency_food_reaction_plan, patient_acknowledges_accuracy
    } = validated.data;

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
      // BUG-R13-03 FIX: filter({ id }) cannot query built-in `id` field — always returns [].
      // Use .get() for primary-key lookup.
      const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
      if (!caseRecord) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      // Keep caseRecord in scope for the ownership check below (block restructured)
      const isAdmin = ['admin', 'platform_admin', 'coordinator'].includes(user.role);
      const isOwner = caseRecord.client_email === user.email;
      if (!isAdmin && !isOwner) {
        return Response.json({ error: 'Forbidden: not authorized for this case' }, { status: 403 });
      }
    }
    // (end case ownership check)

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
      // Versioned overwrite: snapshot the PRIOR allergy/dietary values before they
      // are replaced, so a patient edit can never silently drop a medication or
      // food allergy that was recorded before (no silent data loss on safety data).
      profile = await reviseAndUpdate(base44, 'DietaryProfile', existing[0].id, profileData, {
        actor: user.email,
        reason: 'patient dietary/allergy update',
      });
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
      timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44)
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    // BUG-R13-02 FIX: SEC-10
    console.error('[submitDietaryProfile]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});