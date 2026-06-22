import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled function: runs every hour to auto-expire stale access grants
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is a scheduled/admin function — enforce admin auth to prevent unauthorized mass-archival
    let user;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let expiredGrantCount = 0;

    // BUG-05 FIX: Always pass a limit — unbounded filter() loads the entire table into memory.
    // 500 is a safe batch ceiling; the cron runs hourly so backlog can't grow faster than this.
    const approvedGrants = await base44.asServiceRole.entities.PassportAccessGrant.filter({ status: 'approved' }, '-created_date', 500);
    const staleGrants = approvedGrants.filter(g => g.expires_at && new Date(g.expires_at) < new Date());

    for (const grant of staleGrants) {
      await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, { status: 'expired' });

      await base44.asServiceRole.entities.PassportAuditLog.create({
        passport_token: grant.passport_token,
        patient_id: grant.patient_id,
        patient_email: grant.patient_email,
        actor_id: 'system',
        actor_role: 'system',
        actor_name: 'System Auto-Expiry',
        action: 'access_expired',
        grant_token: grant.grant_token,
        status: 'success',
        timestamp: now,
        metadata: {
          expired_at: grant.expires_at,
          requester_role: grant.requester_role,
          requester_name: grant.requester_name,
          access_count: grant.access_count
        }
      });

      expiredGrantCount++;
    }

    // BUG-05 FIX (cont.): Same — bound the vault scan
    const allVaults = await base44.asServiceRole.entities.PassportVault.filter({ status: 'active' }, '-created_date', 500);
    const expiredVaults = allVaults.filter(v => v.expires_at && new Date(v.expires_at) < new Date());
    let archivedVaultCount = 0;

    for (const vault of expiredVaults) {
      await base44.asServiceRole.entities.PassportVault.update(vault.id, { status: 'archived' });

      await base44.asServiceRole.entities.PassportAuditLog.create({
        passport_token: vault.passport_token,
        patient_id: vault.created_by_id,
        patient_email: vault.patient_email,
        actor_id: 'system',
        actor_role: 'system',
        actor_name: 'System Retention Policy',
        action: 'delete',
        status: 'success',
        timestamp: now,
        metadata: { reason: 'retention_period_expired', vault_expires_at: vault.expires_at }
      });

      archivedVaultCount++;
    }

    return Response.json({
      success: true,
      processed_at: now,
      expired_grants: expiredGrantCount,
      archived_vaults: archivedVaultCount
    });

  } catch (error) {
    console.error('[expirePassportGrants]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});