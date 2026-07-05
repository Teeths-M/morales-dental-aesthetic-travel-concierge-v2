// @ts-nocheck — Deno types not in VS Code LSP (pre-existing config gap, not a real error)
import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

// Valid override actions
const VALID_ACTIONS = new Set(['fast_track_clear', 'whitelist', 'escalate']);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { doctor_id, action, reason, verified_by } = await body();

  if (!doctor_id)                        return err('doctor_id is required');
  if (!action || !VALID_ACTIONS.has(action))
    return err('action must be fast_track_clear, whitelist, or escalate');
  if (!reason || reason.trim().length < 10)
    return err('reason is required and must be at least 10 characters');

  const now = new Date().toISOString();
  const adminName = verified_by || user?.full_name || user?.email || 'Admin';

  const overrideState =
    action === 'escalate'  ? 'escalated'  :
    action === 'whitelist' ? 'whitelisted' :
    'cleared';

  await base44.asServiceRole.entities.Doctor.update(doctor_id, {
    fraud_override:        overrideState,
    fraud_override_reason: reason.trim(),
    fraud_override_by:     adminName,
    fraud_override_at:     now,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type:    'fraud_override_applied',
    resource_type: 'doctor',
    resource_id:   doctor_id,
    actor_id:      user?.id || 'admin',
    actor_role:    'admin',
    actor_name:    adminName,
    details:       { action, override_state: overrideState, reason: reason.trim() },
    sensitive:     true,
    timestamp:     now,
    prev_hash:     await computePrevHash(base44),
  });

  return ok({ success: true, override: overrideState, cleared_by: adminName, timestamp: now });
}, { name: 'runFraudOverride', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
