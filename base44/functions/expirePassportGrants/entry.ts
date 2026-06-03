import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled function: runs every hour to auto-expire stale access grants
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();
    let expiredGrantCount = 0;

    // Expire approved grants past their expiry time
    const approvedGrants = await base44.asServiceRole.entities.PassportAccessGrant.filter({ status: 'approved' });
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

    // Archive vaults past their retention date
    const allVaults = await base44.asServiceRole.entities.PassportVault.filter({ status: 'active' });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});