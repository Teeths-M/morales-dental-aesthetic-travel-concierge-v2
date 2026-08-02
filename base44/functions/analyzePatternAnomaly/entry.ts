/**
 * analyzePatternAnomaly — MedGuard Pattern Intelligence engine.
 *
 * Called by the frontend hook when a client-side anomaly score exceeds the
 * notification threshold. This function:
 *   1. Updates the BehavioralProfile status + score
 *   2. Writes a platform Notification (in-app nudge)
 *   3. For escalations: emails the guardian + logs to AuditLog
 *
 * Signal recording (entity writes) is handled client-side — zero credits.
 * This function only fires when we actually need to dispatch a nudge.
 * Expected call frequency: once per anomaly event, not on every signal.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    profile_id,
    case_id,
    anomaly_score,
    action,          // 'soft_ping' | 'check_in_requested' | 'escalated'
    nudge_message,
    context_note,
    anomaly_reason,
  } = await body();

  if (!profile_id || !action) return err('profile_id and action are required');

  // Load profile
  const profiles = await base44.asServiceRole.entities.BehavioralProfile.filter(
    { id: profile_id }, '-created_date', 1
  ).catch(() => []);
  if (!profiles.length) return err('Profile not found');

  const profile   = profiles[0];
  const now       = new Date().toISOString();
  const nudgeCount = (profile.nudge_count || 0) + 1;

  // Throttle: no more than 1 nudge per 30 minutes
  if (profile.last_nudge_at) {
    const minSinceLast = (Date.now() - new Date(profile.last_nudge_at).getTime()) / 60000;
    if (minSinceLast < 30 && action !== 'escalated') {
      return ok({ skipped: true, reason: 'throttled', next_nudge_in_min: Math.ceil(30 - minSinceLast) });
    }
  }

  // Update profile status
  await base44.asServiceRole.entities.BehavioralProfile.update(profile.id, {
    status:         action,
    anomaly_score,
    anomaly_reason,
    context_note,
    last_nudge_at:  now,
    nudge_count:    nudgeCount,
  }).catch(() => {});

  // Write in-app notification
  if (nudge_message) {
    await base44.asServiceRole.entities.Notification.create({
      user_email: profile.user_email,
      message:    nudge_message,
      type:       'pattern_nudge',
      case_id:    case_id || profile.case_id,
      is_read:    false,
      created_at: now,
    }).catch(() => {});
  }

  // Guardian + AuditLog on escalation
  if (action === 'escalated') {
    // Audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      event_type:   'pattern_escalation',
      entity_type:  'BehavioralProfile',
      entity_id:    profile.id,
      performed_by: 'system:medguard',
      metadata: {
        anomaly_score,
        anomaly_reason,
        nudge_count: nudgeCount,
        case_id:     case_id || profile.case_id,
      },
      created_at: now,
      prev_hash: await computePrevHash(base44),
    }).catch(() => {});

    // Email the case guardian if we have one
    const caseId = case_id || profile.case_id;
    if (caseId) {
      const cases = await base44.asServiceRole.entities.CaseRecord
        .filter({ id: caseId }, '-created_date', 1)
        .catch(() => []);
      const caseRecord = cases[0];

      if (caseRecord?.emergency_contact_email) {
        await base44.integrations.Core.SendEmail({
          to:      caseRecord.emergency_contact_email,
          subject: `[Morales] Pattern alert — ${caseRecord.patient_name || 'Your traveler'} hasn't checked in`,
          body: `Hi,\n\nMorales MedGuard has detected an unusual pattern for ${caseRecord.patient_name || 'your traveler'}.\n\n${nudge_message || 'Their behavioral patterns have deviated from their baseline.'}\n\nLast known location is available in your Guardian View link.\n\nIf you cannot reach them, please call the Morales Emergency Line immediately.\n\n— Morales Safety Team`,
        }).catch(() => {});
      }
    }
  }

  return ok({
    action_dispatched: action,
    nudge_count:       nudgeCount,
    profile_status:    action,
  });
}, { name: 'analyzePatternAnomaly', requireAuth: true }));
