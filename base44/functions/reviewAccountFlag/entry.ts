import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

/**
 * reviewAccountFlag — the only route back from a block.
 *
 * There is deliberately no self-service appeal: an appeal button is a loophole,
 * and the system protects the user rather than the abuser. A human clears it or
 * nobody does.
 *
 * Clearing restores COMMERCIAL features only. Safety features were never
 * restricted in the first place (see _shared/blocker.ts ALWAYS_OPEN_FEATURES) —
 * check-ins, handshakes, SOS and emergency contacts stay available at every
 * tier including 'locked', so a flagged patient is never left unable to call
 * for help. Nothing here can change that.
 */

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { flag_id, action, notes } = await body<{
    flag_id?: string; action?: 'clear' | 'lock'; notes?: string;
  }>();

  if (!flag_id) return err('flag_id is required');
  if (action !== 'clear' && action !== 'lock') return err("action must be 'clear' or 'lock'");

  const flag = await base44.asServiceRole.entities.AccountFlag.get(flag_id).catch(() => null);
  if (!flag) return err('Flag not found', 404);

  const now = new Date().toISOString();

  const patch = action === 'clear'
    ? {
      tier: 'warned',
      cleared_by: user?.email || 'admin',
      cleared_at: now,
      admin_notes: String(notes || '').slice(0, 2000),
      safety_paths_open: true,
    }
    : {
      tier: 'locked',
      cleared_by: '',
      cleared_at: null,
      admin_notes: String(notes || '').slice(0, 2000),
      // Restated on the lock path too: locking an account must never be a way
      // to close someone's route to emergency help.
      safety_paths_open: true,
    };

  await base44.asServiceRole.entities.AccountFlag.update(flag_id, patch);

  // The decision joins the hash chain. A human overriding the blocker is
  // exactly the kind of act that must be reconstructable later.
  const prevHash = await computePrevHash(base44).catch(() => '');
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: action === 'clear' ? 'account_flag_cleared' : 'account_flag_locked',
    actor_id: user?.id || '', actor_role: user?.role || 'admin',
    actor_name: user?.full_name || user?.email || 'admin',
    resource_type: 'AccountFlag', resource_id: flag_id,
    case_id: '',
    details: { action, tier: patch.tier, has_notes: !!notes },
    sensitive: true,
    timestamp: now,
    prev_hash: prevHash,
  }).catch(() => {});

  return ok({ flag_id, tier: patch.tier });
}, { name: 'reviewAccountFlag', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
