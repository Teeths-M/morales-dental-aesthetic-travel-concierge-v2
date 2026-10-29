import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import {
  ABORT_REASON_CODES,
  allowedReunificationNext,
  isTerminalReunification,
  nextCheckInDueAt,
  type ReunificationState,
} from '../../shared/minorReunification.ts';
import { moveCase } from '../../shared/minorReunificationEngine.ts';

/**
 * advanceReunificationState — the ONLY way a case moves forward or aborts.
 *
 * Every route into this function requires an authenticated care-team session.
 * There is no token path, no service-role path, and no agent grant on the
 * underlying entities: a model cannot propose a transition, cannot approve one,
 * and cannot call this. `actor_type` is hard-coded to 'human' here precisely so
 * the abort rule ("a human care-team actor") is guaranteed by construction
 * rather than by trusting a caller-supplied field.
 *
 * Illegal moves are refused with the reason a human needs to understand them —
 * a skipped state, a case already closed, or an abort with no valid reason code.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  if (!(await isMinorReunificationEnabled(base44))) {
    return err('This module is not enabled.', 404);
  }

  const payload = await body<Record<string, unknown>>();
  const caseId = payload.case_id ? String(payload.case_id) : '';
  const to = String(payload.to || '') as ReunificationState;
  const reasonCode = payload.reason_code ? String(payload.reason_code) : null;
  const note = payload.note ? String(payload.note).slice(0, 1000) : null;

  if (!caseId) return err('A case id is required.', 400);

  const caseRow = await base44.asServiceRole.entities.ReunificationCase.get(caseId).catch(() => null);
  if (!caseRow) return err('Case not found.', 404);

  if (isTerminalReunification(caseRow.state as ReunificationState)) {
    return err(`This case is already ${String(caseRow.state).toLowerCase()} and cannot move again.`, 409);
  }

  const at = new Date().toISOString();
  const actorId = user?.email || user?.id || 'care_team';

  const result = await moveCase(base44, {
    caseRow,
    to,
    // Hard-coded, not taken from the request. Every caller of this function is
    // an authenticated human, and the abort rule depends on it never being
    // anything else.
    actor_type: 'human',
    actor_id: actorId,
    reason_code: reasonCode,
    at,
    evidence: {
      note,
      decided_by: actorId,
      allowed_next_at_decision_time: allowedReunificationNext(caseRow.state as ReunificationState),
      valid_abort_reasons: to === 'ABORTED' ? ABORT_REASON_CODES : undefined,
    },
  });

  if (!result.ok) {
    return err(result.message, 409);
  }

  // A closed or aborted case resumes the minor's normal check-in rhythm.
  // Without this the very next sweep would re-open a case seconds after the
  // care team closed one — a bug, not a policy.
  if (isTerminalReunification(to as ReunificationState)) {
    const minor = await base44.asServiceRole.entities.MinorTraveller
      .get(caseRow.minor_id)
      .catch(() => null);

    if (minor?.checkin_active) {
      const interval = Number(minor.checkin_interval_minutes) || 60;
      await base44.asServiceRole.entities.MinorTraveller.update(minor.id, {
        last_checkin_at: at,
        next_checkin_due_at: nextCheckInDueAt(at, interval),
      }).catch(() => {});
    }
  }

  return ok({
    case_id: result.caseRow.id,
    state: result.caseRow.state,
    closed_at: result.caseRow.closed_at || null,
    message: result.message,
  });
}, { allowedRoles: ['admin', 'platform_admin'], name: 'advanceReunificationState' }));