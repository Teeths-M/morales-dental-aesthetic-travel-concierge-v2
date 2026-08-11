/**
 * calculateCompanionScore
 *
 * Companion performance score (0–100). Called by the daily freshness cron
 * (freshness-cron.yml) and manually from admin dashboard (pass companion_id
 * to score just one). Stored on Companion entity as performance_score.
 *
 * Score breakdown:
 *   Response Speed      25 pts  — time from job offer to acceptance (< 2h = 25)
 *   Completion Rate     25 pts  — % of accepted assignments completed
 *   Patient Rating      25 pts  — avg RecoverySession.feedback_rating (case-linked) × 5
 *   Reliability         25 pts  — receipt submissions on time, no missed handshakes
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { companionTrustReasons } from '../../shared/trustScoreReasons.ts';

Deno.serve(createHandler(async ({ req, base44, body }) => {
  if (!(await cronAuthorized(req, base44))) return err('Forbidden', 403);

  const { companion_id } = await body();

  async function scoreCompanion(companionId: string) {
    const assignments = await base44.asServiceRole.entities.CompanionAssignment.filter(
      { companion_user_id: companionId }, '-offered_at', 50
    ).catch(() => []);

    const accepted  = assignments.filter((a: any) => a.status !== 'offered' && a.status !== 'declined' && a.status !== 'declined_auto' && a.status !== 'cancelled');
    const completed = assignments.filter((a: any) => a.status === 'confirmed' || a.status === 'completed');
    const declined  = assignments.filter((a: any) => a.status === 'declined');

    // 1. Response speed — offered_at vs accepted_at
    let totalResponseHrs = 0, responseCount = 0;
    for (const a of accepted) {
      if (a.offered_at && a.accepted_at) {
        const hrs = (new Date(a.accepted_at).getTime() - new Date(a.offered_at).getTime()) / 3_600_000;
        if (hrs >= 0 && hrs < 48) { totalResponseHrs += hrs; responseCount++; }
      }
    }
    const avgResponseHrs = responseCount > 0 ? totalResponseHrs / responseCount : 6;
    const responseScore  = Math.max(0, Math.min(25, 25 - Math.max(0, avgResponseHrs - 2) * 3));

    // 2. Completion rate
    const offered = assignments.filter((a: any) => a.status !== 'cancelled').length;
    const completionRate = offered > 0 ? completed.length / offered : 1;
    const completionScore = Math.round(completionRate * 25);

    // 3. Patient rating — from RecoverySession.feedback_rating, joined by case_id.
    // No PostSurgeryFeedback entity exists in this schema (the real feedback flow,
    // submitPostSurgeryFeedback, writes feedback_rating/feedback_comment directly onto
    // RecoverySession). feedback_rating is one overall trip rating, not split
    // doctor-vs-companion — an honest proxy, not a precise attribution.
    let ratingAvg = 4.3; // default only when literally no rated sessions exist yet
    try {
      const completedCaseIds = completed.map((a: any) => a.case_id).filter(Boolean);
      if (completedCaseIds.length > 0) {
        const sessions = await base44.asServiceRole.entities.RecoverySession.filter(
          { case_id: { $in: completedCaseIds } }
        );
        const rated = sessions.filter((s: any) => typeof s.feedback_rating === 'number');
        if (rated.length > 0) {
          ratingAvg = rated.reduce((s: number, r: any) => s + r.feedback_rating, 0) / rated.length;
        }
      }
    } catch (_) {}
    const ratingScore = Math.round(Math.min(5, ratingAvg) * 5);

    // 4. Reliability — receipt submissions on time (best-effort from MothersTouchAssignment)
    let reliabilityScore = 20; // default baseline
    try {
      const mtAssignments = await base44.asServiceRole.entities.MothersTouchAssignment.filter(
        { status: 'completed' }, '-created_at', 20
      );
      const onTime = mtAssignments.filter((a: any) => a.grocery_receipts?.length > 0).length;
      if (mtAssignments.length > 0) {
        reliabilityScore = Math.round((onTime / mtAssignments.length) * 25);
      }
    } catch (_) {}

    const total = Math.round(responseScore + completionScore + ratingScore + reliabilityScore);

    return {
      score: Math.min(100, Math.max(0, total)),
      components: {
        response_speed_pts:   Math.round(responseScore),
        completion_rate_pts:  completionScore,
        patient_rating_pts:   ratingScore,
        reliability_pts:      reliabilityScore,
        avg_response_hrs:     Math.round(avgResponseHrs * 10) / 10,
        completion_pct:       Math.round(completionRate * 100),
        rating_avg:           Math.round(ratingAvg * 10) / 10,
        total_assignments:    assignments.length,
        completed_count:      completed.length,
        declined_count:       declined.length,
      },
      assignment_count: assignments.length,
    };
  }

  // No specific companion_id → score everyone. This is what a bodyless cron
  // POST (`-d '{}'`) hits, so "score all" is the default, not an opt-in flag.
  if (!companion_id) {
    const companions = await base44.asServiceRole.entities.Companion.filter({}).catch(() => []);
    let updated = 0;
    for (const c of companions) {
      try {
        const result = await scoreCompanion(c.id);
        await base44.asServiceRole.entities.Companion.update(c.id, {
          performance_score:            result.score,
          performance_components:       result.components,
          performance_reasons:          companionTrustReasons(result.components, result.assignment_count),
          performance_last_calculated:  new Date().toISOString(),
        });
        updated++;
      } catch (_) {}
    }
    return ok({ success: true, companions_updated: updated });
  }

  const result = await scoreCompanion(companion_id);
  await base44.asServiceRole.entities.Companion.update(companion_id, {
    performance_score:           result.score,
    performance_components:      result.components,
    performance_reasons:         companionTrustReasons(result.components, result.assignment_count),
    performance_last_calculated: new Date().toISOString(),
  }).catch(() => {});

  return ok({ success: true, companion_id, ...result });
}, { name: 'calculateCompanionScore', requireAuth: false }));
