/**
 * checkReturningPatient
 *
 * Detects whether a patient has prior completed cases with Morales.
 * Called at the start of a new booking or on dashboard load.
 *
 * Returns:
 *   - is_returning: boolean
 *   - prior_case_count: number
 *   - last_case: summary of most recent completed case
 *   - preferred_companions: list of companions from prior trips rated ≥ 4.5
 *   - preferred_drivers: list of drivers from prior trips rated ≥ 4.5
 *   - welcome_message: personalised greeting for the frontend to display
 *
 * The frontend uses this to show "Welcome back, María" and pre-suggest
 * the same companion (Maria G) and driver (Mario) who served them before.
 */

import { createHandler, ok, err } from '../_shared/createHandler.ts';

const COMPLETED_STATUSES = [
  'HOME_SAFE',
  'RECOVERY_PHASE_7_DAY',
  'COMPLETED',
  'CLOSED',
  'POST_PROCEDURE',
];

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { patient_email } = await body<{ patient_email?: string }>();

  // Admin can pass any email; patients only see their own data
  const isAdmin = user && ['admin', 'platform_admin'].includes(user.role);
  const targetEmail = isAdmin && patient_email ? patient_email : user?.email;

  if (!targetEmail) return err('patient_email is required for admin calls', 400);

  // Fetch all cases for this patient
  const allCases = await base44.asServiceRole.entities.CaseRecord
    .filter({ client_email: targetEmail }, '-created_date', 50)
    .catch(() => []);

  const completedCases = (allCases || []).filter(c =>
    COMPLETED_STATUSES.includes(c.status)
  );

  if (!completedCases.length) {
    return ok({
      is_returning: false,
      prior_case_count: 0,
      last_case: null,
      preferred_companions: [],
      preferred_drivers: [],
      welcome_message: null,
    });
  }

  const lastCase = completedCases[0];
  const firstName = (lastCase.client_name || targetEmail).split(' ')[0];

  // Collect preferred partners from prior trips (rating stored on case partners)
  const preferredCompanions: string[] = [];
  const preferredDrivers: string[]    = [];

  for (const c of completedCases) {
    if (c.companion_name && (c.companion_rating ?? 0) >= 4.5) {
      if (!preferredCompanions.includes(c.companion_name)) {
        preferredCompanions.push(c.companion_name);
      }
    }
    if (c.driver_name && (c.driver_rating ?? 0) >= 4.5) {
      if (!preferredDrivers.includes(c.driver_name)) {
        preferredDrivers.push(c.driver_name);
      }
    }
  }

  const lastProcedure = lastCase.procedures?.[0] || 'procedure';
  const lastDestination = lastCase.destination || lastCase.procedure_country || 'your last destination';
  const daysSinceLast = lastCase.home_safe_confirmed_at
    ? Math.round((Date.now() - new Date(lastCase.home_safe_confirmed_at).getTime()) / 86_400_000)
    : null;

  // Build a personalised welcome message
  let welcomeMessage = `Welcome back, ${firstName}.`;
  if (completedCases.length === 1) {
    welcomeMessage += ` You came to us for ${lastProcedure} in ${lastDestination}.`;
  } else {
    welcomeMessage += ` You have trusted Morales ${completedCases.length} times now.`;
  }
  if (preferredCompanions.length) {
    welcomeMessage += ` ${preferredCompanions[0]} is available again if you'd like the same companion.`;
  }
  if (daysSinceLast !== null && daysSinceLast < 365) {
    welcomeMessage += ` We hope your recovery has gone well.`;
  }

  return ok({
    is_returning: true,
    prior_case_count: completedCases.length,
    last_case: {
      id: lastCase.id,
      procedure: lastProcedure,
      destination: lastDestination,
      status: lastCase.status,
      completed_at: lastCase.home_safe_confirmed_at || lastCase.updated_date,
      days_since: daysSinceLast,
    },
    preferred_companions: preferredCompanions,
    preferred_drivers: preferredDrivers,
    welcome_message: welcomeMessage,
  });

}, { name: 'checkReturningPatient', requireAuth: true, allowedRoles: ['admin', 'platform_admin', 'client', 'patient'] }));
