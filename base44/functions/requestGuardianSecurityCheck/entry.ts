import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { dispatchSecurityForCheckIn } from '../../shared/dispatchSecurityForCheckIn.ts';

// requestGuardianSecurityCheck — lets a guardian, from their read-only
// GuardianView, ask M to contact a real local security agency for the
// patient RIGHT NOW instead of waiting for the automatic 5h-unresponsive
// tier. Deliberately does not hand the guardian a vendor's raw phone
// number — she directs M's system, and M stays the one actually
// contacting the security company, same as every other automated dispatch
// in this app. Public/token-gated like every other guardian endpoint —
// verifies the same GuardianSession a viewer would need, never a user
// session, since the guardian never logs in.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { token } = await body();

  const sessions = await base44.asServiceRole.entities.GuardianSession.filter({ view_token: token }).catch(() => []);
  const session = sessions?.[0];
  if (!session) return err('This guardian link does not exist or has been revoked.', 404);
  if (!session.is_active) return err('This guardian link has been revoked by the traveler.', 403);
  if (!session.expires_at || isNaN(new Date(session.expires_at).getTime()) || new Date(session.expires_at) < new Date()) {
    return err('This guardian link has expired.', 403);
  }
  if (!session.case_id) return err('No case linked to this guardian link.', 404);

  // Find the case's current, still-open check-in (any tier — a guardian
  // acting on her own judgment shouldn't have to wait until the ladder has
  // already reached 5h). Nothing to escalate if there isn't one.
  const openCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
    { case_id: session.case_id }, '-scheduled_time', 5
  ).catch(() => []);
  const active = (openCheckIns as any[]).find(c =>
    !['acknowledged', 'resolved', 'escalated_9h'].includes(c.status)
  );

  if (!active) {
    return ok({ outcome: 'no_active_concern', message: 'There is no missed check-in on file right now — nothing to escalate.' });
  }

  const result = await dispatchSecurityForCheckIn(base44, active);

  const prevHash = await (async () => {
    try {
      const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
      if (!logs[0]) return 'GENESIS';
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(logs[0])));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (_) { return 'GENESIS'; }
  })();
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'safet_risk_status_changed',
    actor_id: 'guardian',
    actor_role: 'guardian',
    actor_name: session.guardian_name || 'Guardian',
    resource_type: 'SoloCheckIn',
    resource_id: active.id,
    case_id: session.case_id,
    details: { action: 'guardian_requested_security_check', outcome: result.outcome },
    sensitive: true,
    timestamp: new Date().toISOString(),
    prev_hash: prevHash,
  }).catch(() => {});

  return ok({ outcome: result.outcome, agency: (result as any).agency || null });
}, {
  name: 'requestGuardianSecurityCheck',
  requireAuth: false,
  bodySchema: strictObject({ token: Fields.shortText(64) }),
}));
