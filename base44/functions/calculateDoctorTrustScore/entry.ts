/**
 * calculateDoctorTrustScore
 *
 * Hidden proprietary doctor ranking. Doctors never see this score.
 * Admin uses it for case routing priority. Called:
 *   - When a doctor confirms or declines a case
 *   - By a daily cron (updateAllTrustScores)
 *   - Manually from admin dashboard
 *
 * Score (0–100):
 *   Confirmation Speed    25 pts   — avg hours to confirm cases (< 4h = 25, each extra hour = -1.5, min 0)
 *   Safety Record         25 pts   — 25 - (sos_events * 8), floor 0
 *   Handshake Rate        25 pts   — % of HS5 (clinic check-in) completed on time × 0.25
 *   Patient Satisfaction  25 pts   — avg post-procedure rating × 5
 *
 * Stored on Doctor entity as trust_score (0–100) + trust_components.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only or internal service
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user && ['admin', 'platform_admin'].includes(user.role)) isAuthorized = true;
    } catch (_) {}

    const body = await req.json().catch(() => ({}));

    // Allow internal calls (no auth) for cron usage — identified by no user session
    // but with a service_key header
    const serviceKey = req.headers.get('x-morales-service');
    if (serviceKey === Deno.env.get('SERVICE_KEY')) isAuthorized = true;

    if (!isAuthorized) return Response.json({ error: 'Admin access required' }, { status: 401 });

    const { doctor_id, recalculate_all } = body;

    async function scoreDoctor(doctorId: string) {
      // Fetch all cases this doctor worked on
      const cases = await base44.asServiceRole.entities.CaseRecord.filter(
        { doctor_selected: doctorId }, '-created_date', 100
      ).catch(() => []);

      if (!cases.length) {
        return { score: 70, components: { note: 'No cases yet — baseline score' }, case_count: 0 };
      }

      // 1. Confirmation speed — from doctor_confirmed_at vs case created_date
      let totalConfirmHours = 0;
      let confirmedCount    = 0;
      for (const c of cases) {
        if (c.doctor_confirmed_at && c.created_date) {
          const hrs = (new Date(c.doctor_confirmed_at).getTime() - new Date(c.created_date).getTime()) / 3_600_000;
          if (hrs > 0 && hrs < 240) { // ignore outliers > 10 days
            totalConfirmHours += hrs;
            confirmedCount++;
          }
        }
      }
      const avgConfirmHours = confirmedCount > 0 ? totalConfirmHours / confirmedCount : 24;
      const speedScore      = Math.max(0, Math.min(25, 25 - Math.max(0, avgConfirmHours - 4) * 1.5));

      // 2. Safety record — count SOS events linked to this doctor's cases
      const caseIds = cases.map(c => c.id);
      let sosCount  = 0;
      try {
        const sosEvents = await base44.asServiceRole.entities.SOSEvent.filter({});
        sosCount = sosEvents.filter((e: any) => caseIds.includes(e.case_id)).length;
      } catch (_) {}
      const safetyScore = Math.max(0, 25 - sosCount * 8);

      // 3. HS5 completion rate — cases where HS5 (clinic arrival) was completed
      const hs5Completed = cases.filter((c: any) => c.handshake_status?.['5'] === true).length;
      const hs5Rate      = cases.length > 0 ? hs5Completed / cases.length : 0;
      const hs5Score     = Math.round(hs5Rate * 25);

      // 4. Patient satisfaction — from PostSurgeryFeedback if available
      let feedbackAvg   = 4.2; // default if no feedback yet
      let feedbackCount = 0;
      try {
        const feedbacks = await base44.asServiceRole.entities.PostSurgeryFeedback.filter(
          { doctor_id: doctorId }
        );
        if (feedbacks.length > 0) {
          feedbackAvg   = feedbacks.reduce((s: number, f: any) => s + (f.overall_rating || 4), 0) / feedbacks.length;
          feedbackCount = feedbacks.length;
        }
      } catch (_) {}
      const satisfactionScore = Math.round(Math.min(5, feedbackAvg) * 5);

      const total = Math.round(speedScore + safetyScore + hs5Score + satisfactionScore);

      return {
        score: Math.min(100, Math.max(0, total)),
        components: {
          confirmation_speed_pts:  Math.round(speedScore),
          safety_record_pts:       safetyScore,
          hs5_completion_pts:      hs5Score,
          patient_satisfaction_pts: satisfactionScore,
          avg_confirm_hours:       Math.round(avgConfirmHours),
          sos_events:              sosCount,
          hs5_rate_pct:            Math.round(hs5Rate * 100),
          feedback_avg:            Math.round(feedbackAvg * 10) / 10,
          feedback_count:          feedbackCount,
        },
        case_count: cases.length,
      };
    }

    if (recalculate_all) {
      // Score all doctors
      const doctors = await base44.asServiceRole.entities.Doctor.filter({}).catch(() => []);
      const updated: string[] = [];
      for (const doctor of doctors) {
        try {
          const result = await scoreDoctor(doctor.id);
          await base44.asServiceRole.entities.Doctor.update(doctor.id, {
            trust_score:            result.score,
            trust_components:       result.components,
            trust_case_count:       result.case_count,
            trust_last_calculated:  new Date().toISOString(),
          });
          updated.push(doctor.id);
        } catch (_) {}
      }
      return Response.json({ success: true, doctors_updated: updated.length });
    }

    if (!doctor_id) return Response.json({ error: 'doctor_id required' }, { status: 400 });

    const result = await scoreDoctor(doctor_id);
    await base44.asServiceRole.entities.Doctor.update(doctor_id, {
      trust_score:           result.score,
      trust_components:      result.components,
      trust_case_count:      result.case_count,
      trust_last_calculated: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ success: true, doctor_id, ...result });
  } catch (error) {
    console.error('[calculateDoctorTrustScore]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
