import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { linkOnlyEmail } from '../../shared/notify.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

const BRAND   = 'Morales Medical Travel Safety';
const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

Deno.serve(createHandler(async ({ base44, body }) => {
  const { case_id, companion_email, internal_secret } = await body();

  // SECURITY: had zero auth, and companion_email was caller-overridable —
  // anyone could redirect this branded "you have a new assignment" email to
  // an arbitrary address, or spam a real assigned companion repeatedly.
  // Its one real caller (processPaymentCascade) already passes a trusted,
  // server-resolved companion_email — internalOrAdminAuthorized covers it.
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return err('Forbidden', 403);
  }

  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found');

  const patientName = caseRecord.client_name || 'Patient';
  const caseRef     = case_id.slice(-8).toUpperCase();

  // Determine companion email(s)
  const targets: string[] = [];
  if (companion_email) targets.push(companion_email);

  if (!targets.length) {
    // Auto-find assigned companions for this case
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter({ case_id }).catch(() => []);
    for (const ca of assignments) {
      if (ca.companion_id) {
        const c = await base44.asServiceRole.entities.Companion.get(ca.companion_id).catch(() => null);
        if (c?.email) targets.push(c.email);
      }
    }
  }

  if (!targets.length) return err('No companion email found for this case');

  // The dietary/allergy/AI meal-plan detail this used to carry in the email
  // body is exactly what must stay in-platform — the companion dashboard
  // already surfaces it (DietaryInfoCard, getCompanionDietaryProfile).
  const subject = 'Your recovery meal brief is ready — Morales Medical Travel Safety';
  const html = linkOnlyEmail({
    title: 'A recovery meal brief is ready for you',
    line: 'You have a new companion assignment with dietary preferences, allergy notes and a recovery meal plan waiting in your dashboard.',
    ctaUrl: `${APP_URL}/companion-dashboard`,
    ctaLabel: 'Open Companion Dashboard',
    brand: BRAND,
    from: 'sendCompanionMealBrief',
  });
  const tasks = targets.map(to => base44.asServiceRole.integrations.Core.SendEmail({
    from_name: BRAND,
    to,
    subject,
    body: html,
  }));

  await Promise.allSettled(tasks);

  return ok({ sent_to: targets, patient: patientName, case_ref: caseRef });
}, { name: 'sendCompanionMealBrief', requireAuth: false, allowedRoles: [] }));
