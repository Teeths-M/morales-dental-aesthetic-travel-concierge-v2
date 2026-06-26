/**
 * calculateCompanionScore
 *
 * Companion performance score (0–100). Called after each completed assignment
 * and by daily cron. Stored on Companion entity as performance_score.
 *
 * Score breakdown:
 *   Response Speed      25 pts  — time from job offer to acceptance (< 2h = 25)
 *   Completion Rate     25 pts  — % of accepted assignments completed
 *   Patient Rating      25 pts  — avg post-trip patient rating × 5
 *   Reliability         25 pts  — receipt submissions on time, no missed handshakes
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user && ['admin', 'platform_admin'].includes(user.role)) isAuthorized = true;
    } catch (_) {}
    const serviceKey = req.headers.get('x-morales-service');
    if (serviceKey === Deno.env.get('SERVICE_KEY')) isAuthorized = true;
    if (!isAuthorized) return Response.json({ error: 'Admin access required' }, { status: 401 });

    const { companion_id, recalculate_all } = await req.json().catch(() => ({}));

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

      // 3. Patient rating — from post-surgery feedback or companion ratings
      let ratingAvg = 4.3;
      try {
        const feedbacks = await base44.asServiceRole.entities.PostSurgeryFeedback.filter({ companion_id: companionId });
        if (feedbacks.length > 0) {
          ratingAvg = feedbacks.reduce((s: number, f: any) => s + (f.companion_rating || 4), 0) / feedbacks.length;
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

    if (recalculate_all) {
      const companions = await base44.asServiceRole.entities.Companion.filter({}).catch(() => []);
      let updated = 0;
      for (const c of companions) {
        try {
          const result = await scoreCompanion(c.id);
          await base44.asServiceRole.entities.Companion.update(c.id, {
            performance_score:            result.score,
            performance_components:       result.components,
            performance_last_calculated:  new Date().toISOString(),
          });
          updated++;
        } catch (_) {}
      }
      return Response.json({ success: true, companions_updated: updated });
    }

    if (!companion_id) return Response.json({ error: 'companion_id required' }, { status: 400 });
    const result = await scoreCompanion(companion_id);
    await base44.asServiceRole.entities.Companion.update(companion_id, {
      performance_score:           result.score,
      performance_components:      result.components,
      performance_last_calculated: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, companion_id, ...result });
  } catch (error) {
    console.error('[calculateCompanionScore]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
