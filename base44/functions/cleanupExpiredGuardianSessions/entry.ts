import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is a cron/admin function
    const user = await base44.auth.me().catch(() => null);
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Find expired active sessions
    const activeSessions = await base44.asServiceRole.entities.GuardianSession.filter(
      { is_active: true }, '-created_date', 200
    ).catch(() => []);

    const expired = (activeSessions || []).filter(s => {
      if (!s.expires_at) return false;
      return new Date(s.expires_at) < new Date();
    });

    let deactivated = 0;
    for (const session of expired) {
      try {
        await base44.asServiceRole.entities.GuardianSession.update(session.id, {
          is_active: false,
          deactivated_at: now,
          deactivation_reason: 'expired',
        });
        deactivated++;
      } catch (e) {
        console.error('[cleanupExpiredGuardianSessions] Failed to deactivate:', session.id, e?.message);
      }
    }

    console.log(`[cleanupExpiredGuardianSessions] Deactivated ${deactivated}/${expired.length} expired sessions`);
    return Response.json({
      success: true,
      checked: activeSessions?.length || 0,
      expired: expired.length,
      deactivated,
    });

  } catch (err) {
    console.error('[cleanupExpiredGuardianSessions] Error:', err?.message);
    return Response.json({ error: 'Cleanup failed' }, { status: 500 });
  }
});
