import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grant_token, action } = await req.json(); // action: 'approve' | 'revoke' | 'deny'

    if (!grant_token || !action) {
      return Response.json({ error: 'grant_token and action are required' }, { status: 400 });
    }

    const grants = await base44.asServiceRole.entities.PassportAccessGrant.filter({ grant_token });
    if (!grants.length) {
      return Response.json({ error: 'Grant not found' }, { status: 404 });
    }
    const grant = grants[0];

    // Only the patient owner or admin can approve/revoke
    const isOwner = user.email === grant.patient_email;
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    if (!isOwner && !isAdmin) {
      await base44.asServiceRole.entities.PassportAuditLog.create({
        passport_token: grant.passport_token,
        patient_id: grant.patient_id,
        patient_email: grant.patient_email,
        actor_id: user.id,
        actor_role: 'patient',
        actor_name: user.full_name,
        action: 'deny_request',
        grant_token,
        status: 'denied',
        reason_if_denied: 'Unauthorized: not the document owner',
        timestamp: new Date().toISOString()
      });
      return Response.json({ error: 'Not authorized to manage this grant' }, { status: 403 });
    }

    const validActions = ['approve', 'revoke', 'deny'];
    if (!validActions.includes(action)) {
      return Response.json({ error: 'Invalid action. Use: approve, revoke, or deny' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'revoked';

    await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, {
      status: newStatus,
      granted_at: action === 'approve' ? new Date().toISOString() : grant.granted_at,
      revoked_at: action !== 'approve' ? new Date().toISOString() : null,
      revoked_reason: action !== 'approve' ? `${action}d by ${isAdmin ? 'admin' : 'patient'}` : null
    });

    const auditAction = action === 'approve' ? 'approve_request' : 'revoke_access';

    await base44.asServiceRole.entities.PassportAuditLog.create({
      passport_token: grant.passport_token,
      patient_id: grant.patient_id,
      patient_email: grant.patient_email,
      actor_id: user.id,
      actor_role: isAdmin ? 'admin' : 'patient',
      actor_name: user.full_name,
      action: auditAction,
      grant_token,
      status: 'success',
      timestamp: new Date().toISOString(),
      metadata: { action, requester_role: grant.requester_role, requester_name: grant.requester_name }
    });

    return Response.json({ success: true, grant_token, new_status: newStatus });

  } catch (error) {
    console.error('[approveRevokePassportAccess]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});