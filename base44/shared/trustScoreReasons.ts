/**
 * trustScoreReasons — turns the real, already-computed trust/performance
 * score components into plain-language reasons.
 *
 * calculateDoctorTrustScore / calculateCompanionScore / calculateDriverTrustScore
 * already compute real numeric components from real data (CaseRecord,
 * SOSEvent, RecoverySession.feedback_rating, TravelRequest). Nothing here
 * invents a new fact — each function below only rephrases numbers its caller
 * already has into a sentence, and only includes a reason when the
 * underlying count is real (a partner with zero cases/assignments gets one
 * honest "no history yet" reason, never a fabricated positive claim).
 */

export function doctorTrustReasons(components: Record<string, any>, caseCount: number): string[] {
  if (!caseCount) return ['No completed cases yet — baseline score'];
  const reasons: string[] = [];

  if (typeof components.avg_confirm_hours === 'number') {
    reasons.push(components.avg_confirm_hours <= 4
      ? `Confirms new cases quickly (avg ${components.avg_confirm_hours}h)`
      : `Averages ${components.avg_confirm_hours}h to confirm a new case`);
  }
  if (typeof components.sos_events === 'number') {
    reasons.push(components.sos_events === 0
      ? 'No safety incidents on record'
      : `${components.sos_events} safety incident(s) on record`);
  }
  if (typeof components.hs5_rate_pct === 'number') {
    reasons.push(`${components.hs5_rate_pct}% on-time clinic check-in rate`);
  }
  if (components.feedback_count > 0) {
    reasons.push(`${components.feedback_avg}/5 average patient rating (${components.feedback_count} rated trip${components.feedback_count === 1 ? '' : 's'})`);
  } else {
    reasons.push('No patient ratings yet');
  }
  return reasons;
}

export function companionTrustReasons(components: Record<string, any>, assignmentCount: number): string[] {
  if (!assignmentCount) return ['No assignments yet — baseline score'];
  const reasons: string[] = [];

  if (typeof components.avg_response_hrs === 'number') {
    reasons.push(components.avg_response_hrs <= 2
      ? `Responds to job offers quickly (avg ${components.avg_response_hrs}h)`
      : `Averages ${components.avg_response_hrs}h to respond to a job offer`);
  }
  if (typeof components.completion_pct === 'number') {
    reasons.push(`${components.completion_pct}% of offered assignments completed`);
  }
  if (typeof components.declined_count === 'number' && components.declined_count > 0) {
    reasons.push(`${components.declined_count} assignment(s) declined`);
  }
  if (components.rating_avg > 0 && components.completed_count > 0) {
    reasons.push(`${components.rating_avg}/5 average patient rating (${components.completed_count} completed trip${components.completed_count === 1 ? '' : 's'})`);
  } else {
    reasons.push('No patient ratings yet');
  }
  return reasons;
}

export function driverTrustReasons(components: Record<string, any>, caseCount: number): string[] {
  if (!caseCount) return ['No completed trips yet — baseline score'];
  const reasons: string[] = [];

  if (typeof components.on_time_pct === 'number') {
    reasons.push(components.on_time_pct === 100
      ? 'No missed pickups on record'
      : `${components.on_time_pct}% of pickups on time, no backup driver needed`);
  }
  if (typeof components.sos_events === 'number') {
    reasons.push(components.sos_events === 0
      ? 'No safety incidents on record'
      : `${components.sos_events} safety incident(s) on record`);
  }
  if (components.feedback_count > 0) {
    reasons.push(`${components.feedback_avg}/5 average patient rating (${components.feedback_count} rated trip${components.feedback_count === 1 ? '' : 's'})`);
  } else {
    reasons.push('No patient ratings yet');
  }
  return reasons;
}
