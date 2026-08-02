import { createHandler, ok } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user }) => {
  const isAdmin = user.role === 'admin' || user.role === 'platform_admin';

  const filter = isAdmin ? {} : { local_doctor_id: user.id };
  const referrals = await base44.asServiceRole.entities.LocalDoctorReferral.filter(
    filter,
    '-created_date',
    50
  );

  // Enrich with case summaries
  const enriched = await Promise.all(
    referrals.map(async (ref: Record<string, unknown>) => {
      try {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter(
          { id: ref.case_id },
          '-created_date',
          1
        );
        return { ...ref, case: cases[0] ?? null };
      } catch {
        return { ...ref, case: null };
      }
    })
  );

  return ok({ referrals: enriched });
}, { name: 'getLocalDoctorReferrals', requireAuth: true, allowedRoles: ['local_doctor', 'admin', 'platform_admin'] }));
