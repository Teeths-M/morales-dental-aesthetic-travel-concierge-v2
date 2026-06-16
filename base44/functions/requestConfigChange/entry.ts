import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * requestConfigChange — creates a pending SystemConfigChange and notifies all admins.
 * Called by admin UI when trying to change DefaultDoctorConfig, ADMIN_EMAIL, or risk_weights.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
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

    // Notify all admins by email
    const allAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const appUrl = (Deno.env.get('APP_URL') || 'https://app.base44.app').replace(/\/$/, '');
    const approvalUrl = `${appUrl}/admin/config-approvals`;

    const emailPromises = allAdmins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'MORALES Security — Config Approval Required',
        to: admin.email,
        subject: `⚠️ Admin Action Required: Config Change Request — ${config_label || config_key}`,
        body: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: #0F3A20; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h2 style="color: #fff; margin: 0; font-size: 18px;">System Config Change Request</h2>
              <p style="color: #C5A059; margin: 6px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Multi-Admin Approval Required</p>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 14px;">Hello ${admin.full_name || admin.email},</p>
              <p style="color: #374151; font-size: 14px;">Admin <strong>${user.full_name || user.email}</strong> has requested a system configuration change that requires <strong>two admin approvals within 72 hours</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 35%;">Config Key</td>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; color: #111827;">${config_label || config_key}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Requested By</td>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; color: #111827;">${user.full_name || user.email}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Reason</td>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; color: #111827;">${change_reason || 'No reason provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Expires</td>
                  <td style="padding: 10px 14px; border: 1px solid #e5e7eb; color: #dc2626;">Within 72 hours — ${new Date(expiresAt).toLocaleString()}</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 28px 0 8px;">
                <a href="${approvalUrl}" style="background: #0F3A20; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                  Review & Approve Change →
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">Two separate admin approvals are required. The requester cannot approve their own request.</p>
            </div>
          </div>
        `
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});