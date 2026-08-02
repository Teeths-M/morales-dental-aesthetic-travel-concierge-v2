import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

/**
 * processConfigApproval — handles approve or deny actions on a SystemConfigChange.
 * Enforces: requester cannot approve own request, same admin cannot approve twice,
 * two separate approvals required, and applies the change on final approval.
 */
Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // BUG-07 FIX: include platform_admin — consistent with all other governance functions
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const { change_id, action, deny_reason } = await req.json();
    if (!change_id || !['approve', 'deny'].includes(action)) {
      return Response.json({ error: 'change_id and action (approve|deny) are required' }, { status: 400 });
    }

    // BUG-02 FIX: SDK filter() cannot query by built-in `id` field — returns empty always.
    // List recent pending records and match by id on the JS side.
    const recentChanges = await base44.asServiceRole.entities.SystemConfigChange.list('-created_date', 100);
    const change = recentChanges.find(r => r.id === change_id);
    if (!change) {
      return Response.json({ error: 'Config change record not found' }, { status: 404 });
    }

    // Status guard
    if (change.status !== 'pending') {
      return Response.json({ error: `Cannot act on a request with status: ${change.status}` }, { status: 409 });
    }

    // Expiry check
    if (change.expires_at && new Date(change.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SystemConfigChange.update(change.id, { status: 'expired' });
      return Response.json({ error: 'This config change request has expired.' }, { status: 410 });
    }

    const now = new Date().toISOString();

    // ── DENY ──────────────────────────────────────────────────────────────────
    if (action === 'deny') {
      await base44.asServiceRole.entities.SystemConfigChange.update(change.id, {
        status: 'denied',
        denied_by_id: user.id,
        denied_by_name: user.full_name || user.email,
        denied_reason: deny_reason || 'No reason provided',
        denied_at: now,
      });

      await base44.functions.invoke('logAuditEvent', {
        event_type: 'role_escalation_attempt',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        resource_type: 'SystemConfigChange',
        resource_id: change.id,
        resource_name: change.config_key,
        details: { action: 'config_change_denied', config_key: change.config_key, reason: deny_reason },
        sensitive: true,
        timestamp: now,
      });

      return Response.json({ success: true, status: 'denied', message: 'Config change denied.' });
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────

    // Requester cannot approve their own request
    if (change.requested_by_id === user.id) {
      return Response.json({ error: 'You cannot approve your own config change request.' }, { status: 403 });
    }

    // Same admin cannot approve twice
    if (change.approved_by_1_id === user.id) {
      return Response.json({ error: 'You have already approved this request. A second, different admin must approve.' }, { status: 403 });
    }

    let updatedChange = {};

    if (!change.approved_by_1_id) {
      // First approval
      updatedChange = {
        approved_by_1_id: user.id,
        approved_by_1_name: user.full_name || user.email,
        approved_by_1_email: user.email,
        approved_by_1_at: now,
      };
      await base44.asServiceRole.entities.SystemConfigChange.update(change.id, updatedChange);

      await base44.functions.invoke('logAuditEvent', {
        event_type: 'partner_notified',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        resource_type: 'SystemConfigChange',
        resource_id: change.id,
        resource_name: change.config_key,
        details: { action: 'config_change_approved_1_of_2', config_key: change.config_key },
        sensitive: true,
        timestamp: now,
      });

      return Response.json({
        success: true,
        status: 'awaiting_second_approval',
        message: 'First approval recorded. One more admin approval required.'
      });

    } else {
      // Second approval — finalize and apply
      updatedChange = {
        approved_by_2_id: user.id,
        approved_by_2_name: user.full_name || user.email,
        approved_by_2_email: user.email,
        approved_by_2_at: now,
        status: 'approved',
        approved_at: now,
      };
      await base44.asServiceRole.entities.SystemConfigChange.update(change.id, updatedChange);

      // Apply the config change
      let applyError = null;
      try {
        await applyConfigChange(base44, change.config_key, change.requested_value);
        await base44.asServiceRole.entities.SystemConfigChange.update(change.id, { applied_at: now });
      } catch (e) {
        applyError = e.message;
      }

      await base44.functions.invoke('logAuditEvent', {
        event_type: 'handshake_completed',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        resource_type: 'SystemConfigChange',
        resource_id: change.id,
        resource_name: change.config_key,
        details: {
          action: 'config_change_approved_and_applied',
          config_key: change.config_key,
          apply_error: applyError || null,
          requested_by: change.requested_by_email,
          approver_1: change.approved_by_1_email,
          approver_2: user.email,
        },
        sensitive: true,
        timestamp: now,
      });

      return Response.json({
        success: true,
        status: 'approved',
        applied: !applyError,
        apply_error: applyError,
        message: applyError
          ? `Approved but failed to apply: ${applyError}`
          : 'Config change fully approved and applied.'
      });
    }

  } catch (error) {
    console.error('[processConfigApproval]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'processConfigApproval', requireAuth: false }));

/**
 * Actually applies the config change to the relevant entity/system.
 */
async function applyConfigChange(base44, configKey, requestedValue) {
  if (configKey === 'DefaultDoctorConfig') {
    // Find and update the active DefaultDoctorConfig record
    const existing = await base44.asServiceRole.entities.DefaultDoctorConfig.filter({ is_active: true });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.DefaultDoctorConfig.update(existing[0].id, {
        ...requestedValue,
        updated_at: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.DefaultDoctorConfig.create({
        ...requestedValue,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }
    return;
  }

  if (configKey === 'risk_weights') {
    // Store as a named ComplexityModifier or similar entity — log for now
    // Future: update ComplexityModifier records based on requestedValue keys
    console.log('[applyConfigChange] risk_weights update:', JSON.stringify(requestedValue));
    return;
  }

  if (configKey === 'ADMIN_EMAIL') {
    // ADMIN_EMAIL is an env var — cannot update env vars at runtime.
    // Flag for manual action; the audit log entry is the source of truth.
    console.warn('[applyConfigChange] ADMIN_EMAIL is an environment variable. Update it manually in dashboard settings.');
    throw new Error('ADMIN_EMAIL is an environment variable — please update it manually in the Base44 dashboard settings after approval.');
  }

  throw new Error(`No apply handler for config_key: ${configKey}`);
}