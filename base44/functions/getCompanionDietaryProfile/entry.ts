import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Authenticated companion read, scoped to their own assignment — never trust
// a client-supplied case_id alone (a companion could otherwise read any
// patient's allergy/medication profile by guessing an id).
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body();
  if (!case_id) return err('case_id is required');

  const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({
    companion_user_id: user.id,
    case_id,
  });
  if (!assignments.length) return err('Not assigned to this case', 403);

  const profiles = await base44.asServiceRole.entities.DietaryProfile.filter({ case_id });
  return ok({ profile: profiles[0] || null });
}, { name: 'getCompanionDietaryProfile', requireAuth: true, allowedRoles: ['companion'] }));
