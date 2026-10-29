import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';

/**
 * getReunificationCase — one read function for both audits and the console.
 *
 * With a case_id it returns the case, its full append-only event timeline and
 * every notification row. Without one it returns the list, and that list is
 * admin-only.
 *
 * Authorisation is explicit rather than assumed: a care-team member sees any
 * case, a guardian sees only a case whose primary_guardian_email matches their
 * own verified address. The guardian never gets the minor's record, only the
 * case timeline — a parent needs to know their child is being looked for, not
 * to read the care team's working notes.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  if (!(await isMinorReunificationEnabled(base44))) {
    return err('This module is not enabled.', 404);
  }

  const payload = await body<Record<string, unknown>>();
  const caseId = payload.case_id ? String(payload.case_id) : '';
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';

  // ── One case ──────────────────────────────────────────────────────────────
  if (caseId) {
    const caseRow = await base44.asServiceRole.entities.ReunificationCase
      .get(caseId)
      .catch(() => null);

    if (!caseRow) return err('Case not found.', 404);

    const isGuardian = !!user?.email && caseRow.primary_guardian_email === user.email;
    if (!isAdmin && !isGuardian) {
      return err('You do not have access to this case.', 403);
    }

    const events = await base44.asServiceRole.entities.CaseEvent
      .filter({ case_id: caseId }, 'sequence', 200)
      .catch(() => []);
    const notifications = await base44.asServiceRole.entities.MinorNotification
      .filter({ case_id: caseId }, 'queued_at', 100)
      .catch(() => []);

    const minor = isAdmin
      ? await base44.asServiceRole.entities.MinorTraveller
        .get(caseRow.minor_id)
        .catch(() => null)
      : null;

    return ok({
      case: caseRow,
      events: Array.isArray(events) ? events : [],
      notifications: Array.isArray(notifications) ? notifications : [],
      minor,
      viewer: isAdmin ? 'care_team' : 'guardian',
    });
  }

  // ── The list ──────────────────────────────────────────────────────────────
  if (!isAdmin) return err('Only the care team can list cases.', 403);

  const stateFilter = payload.state ? String(payload.state) : null;
  const query: Record<string, unknown> = {};
  if (stateFilter) query.state = stateFilter;

  const cases = await base44.asServiceRole.entities.ReunificationCase
    .filter(query, '-opened_at', Number(payload.limit) || 50)
    .catch(() => []);

  return ok({
    cases: Array.isArray(cases) ? cases : [],
    viewer: 'care_team',
  });
}, { name: 'getReunificationCase' }));