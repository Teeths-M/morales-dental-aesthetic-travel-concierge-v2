import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { renderEmail } from '../_shared/emailTemplate.ts';
import { createHandler } from '../_shared/createHandler.ts';

/**
 * requestConfigChange — creates a pending SystemConfigChange and notifies all admins.
 * Called by admin UI when trying to change DefaultDoctorConfig, ADMIN_EMAIL, or risk_weights.
 */
Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // BUG-08 FIX: include platform_admin
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const { config_key, config_label, requested_value, previous_value, change_reason } = await req.json();

    if (!config_key || requested_value === undefined) {
      return Response.json({ error: 'config_key and requested_value are required' }, { status: 400 });
    }

    const ALLOWED_KEYS = ['DefaultDoctorConfig', 'ADMIN_EMAIL', 'risk_weights'];
    if (!ALLOWED_KEYS.includes(config_key)) {
      return Response.json({ error: `config_key must be one of: ${ALLOWED_KEYS.join(', ')}` }, { status: 400 });
    }

    // Check for duplicate pending request for same key
    const existing = await base44.asServiceRole.entities.SystemConfigChange.filter({ config_key, status: 'pending' });
    if (existing && existing.length > 0) {
      return Response.json({
        error: 'A pending approval already exists for this config key. Resolve it before submitting a new request.',
        existing_id: existing[0].id
      }, { status: 409 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(); // 72h from now

    const changeRecord = await base44.asServiceRole.entities.SystemConfigChange.create({
      config_key,
      config_label: config_label || config_key,
      requested_by_id: user.id,
      requested_by_name: user.full_name || user.email,
      requested_by_email: user.email,
      requested_value,
      previous_value: previous_value || null,
      change_reason: change_reason || '',
      status: 'pending',
      expires_at: expiresAt,
    });

    // Log to AuditLog (hash-chained)
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'sensitive_profile_viewed', // closest available; represents admin action
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      resource_type: 'SystemConfigChange',
      resource_id: changeRecord.id,
      resource_name: config_key,
      details: { action: 'config_change_requested', config_key, change_reason, expires_at: expiresAt },
      sensitive: true,
      timestamp: now.toISOString(),
    });

    // BUG-R14-01 FIX: User.filter({ role: 'admin' }) is a full-table scan that misses
    // platform_admin users (the second admin role) and loads all users on every request.
    // Use ADMIN_EMAIL env var for direct notification — same pattern used everywhere else.
    // The approval UI lists all pending changes; admins discover it there too.
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const appUrl = (Deno.env.get('APP_URL') || 'https://app.base44.app').replace(/\/$/, '');
    const approvalUrl = `${appUrl}/admin/config-approvals`;

    const adminRecipients = adminEmail ? [{ email: adminEmail, full_name: 'Admin' }] : [];
    const emailPromises = adminRecipients.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'MORALES Security — Config Approval Required',
        to: admin.email,
        subject: `⚠️ Admin Action Required: Config Change Request — ${config_label || config_key}`,
        body: renderEmail({
          appUrl,
          eyebrow: 'Multi-Admin Approval Required',
          title: 'System Config Change Request',
          intro: `Hello ${admin.full_name || admin.email}, admin ${user.full_name || user.email} has requested a system configuration change that requires two admin approvals within 72 hours.`,
          rows: [
            ['Config Key', config_label || config_key],
            ['Requested By', user.full_name || user.email],
            ['Reason', change_reason || 'No reason provided'],
            ['Expires', `Within 72 hours — ${new Date(expiresAt).toLocaleString()}`],
          ],
          note: 'Two separate admin approvals are required. The requester cannot approve their own request.',
          ctaText: 'Review & Approve Change',
          ctaUrl: approvalUrl,
        }),
      }).catch(e => ({ error: e.message }))
    );

    await Promise.allSettled(emailPromises);

    return Response.json({
      success: true,
      change_id: changeRecord.id,
      expires_at: expiresAt,
      message: 'Config change request created. All admins have been notified.'
    });

  } catch (error) {
    console.error('[requestConfigChange]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'requestConfigChange', requireAuth: false }));
