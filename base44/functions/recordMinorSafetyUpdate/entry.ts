import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import { classifySafeAnswer } from '../../shared/minorReunification.ts';
import {
  OPEN_STATES,
  appendCaseEvent,
  updateMinorLastKnown,
} from '../../shared/minorReunificationEngine.ts';

/**
 * recordMinorSafetyUpdate — the answer to the single question, plus a location
 * fix if the device has one.
 *
 * The question is exactly one: "are you safe right now?" The minor may tap yes,
 * tap no, or speak. Nothing else is asked, because a frightened child should
 * not be given a form.
 *
 * Two rules are load-bearing here:
 *   • An unrecognised spoken answer is stored VERBATIM as 'unknown'. It is never
 *     guessed into 'yes'. Silence or a mumble being read as safety is the worst
 *     possible failure, so the transcript is kept for a human to read instead.
 *   • This function never moves the case. The answer is information for the care
 *     team; only a human advances a case. Automation does not get to decide a
 *     child is fine.
 *
 * Help-token only: the printed QR token can raise a scan but can never answer
 * for the minor.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  if (!(await isMinorReunificationEnabled(base44))) {
    return err('This module is not enabled.', 404);
  }

  const payload = await body<Record<string, unknown>>();
  const token = payload.token ? String(payload.token) : '';
  if (!token) return err('This link is incomplete.', 400);

  const rows = await base44.asServiceRole.entities.MinorTraveller
    .filter({ help_token: token }, '-created_date', 2);
  const minor = Array.isArray(rows) ? rows[0] : null;
  if (!minor || minor.is_active === false) return err('This link is not valid.', 404);

  const cases = await base44.asServiceRole.entities.ReunificationCase
    .filter({ minor_id: minor.id, state: { $in: OPEN_STATES } }, '-created_date', 5);
  const caseRow = Array.isArray(cases) ? cases[0] : null;

  if (!caseRow) {
    // Honest conflict rather than opening a case implicitly: an answer with no
    // open case means the screen is stale, and the client should re-open.
    return err('There is no open case for this link. Send the help alert first.', 409);
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  // ── The one question ──────────────────────────────────────────────────────
  const answered = payload.answer != null || payload.transcript != null;
  let classified: { answer: 'yes' | 'no' | 'unknown'; method: 'tap' | 'voice'; transcript: string | null } | null = null;

  if (answered) {
    classified = classifySafeAnswer({
      answer: payload.answer as string | null,
      transcript: payload.transcript as string | null,
    });

    patch.safe_answer_method = classified.method;
    patch.safe_answer_at = now;
    if (classified.transcript) patch.safe_answer_transcript = classified.transcript;
    // 'unknown' is written too: "they answered but we could not understand it"
    // is a different fact from "they never answered", and both matter.
    patch.safe_answer = classified.answer;
  }

  // ── Location, if the device had a fix ─────────────────────────────────────
  let located: { latitude: number; longitude: number } | null = null;
  if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
    located = { latitude: payload.latitude, longitude: payload.longitude };
    patch.location_latitude = located.latitude;
    patch.location_longitude = located.longitude;
    patch.location_source = 'device';
    patch.location_captured_at = now;
  }

  if (Object.keys(patch).length > 0) {
    await base44.asServiceRole.entities.ReunificationCase.update(caseRow.id, patch);
  }

  if (located) {
    await updateMinorLastKnown(base44, minor, { ...located, at: now });
    await appendCaseEvent(base44, {
      case_id: caseRow.id,
      minor_id: minor.id,
      guardian_email: caseRow.primary_guardian_email,
      event_kind: 'location_captured',
      from_state: caseRow.state,
      to_state: caseRow.state,
      actor_type: 'minor',
      actor_id: null,
      at: now,
      evidence: { source: 'device', latitude: located.latitude, longitude: located.longitude },
    });
  }

  if (classified) {
    await appendCaseEvent(base44, {
      case_id: caseRow.id,
      minor_id: minor.id,
      guardian_email: caseRow.primary_guardian_email,
      event_kind: 'safety_answer',
      from_state: caseRow.state,
      to_state: caseRow.state,
      actor_type: 'minor',
      actor_id: null,
      at: now,
      evidence: {
        answer: classified.answer,
        method: classified.method,
        // The transcript lives on the case for a human, not in the audit trail's
        // structured evidence — keep the event to the classification itself.
        understood: classified.answer !== 'unknown',
      },
    });
  }

  return ok({
    case_id: caseRow.id,
    state: caseRow.state,
    safe_answer: classified?.answer ?? caseRow.safe_answer ?? 'unknown',
    safe_answer_method: classified?.method ?? caseRow.safe_answer_method ?? null,
    location_source: located ? 'device' : (caseRow.location_source || 'none'),
  });
}, { requireAuth: false, name: 'recordMinorSafetyUpdate' }));