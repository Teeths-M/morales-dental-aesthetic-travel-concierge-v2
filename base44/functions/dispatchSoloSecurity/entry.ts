import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // BUG-FIX: include platform_admin — consistent with all other admin-guarded functions
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // Find check-ins escalated at 3h level that are now 5+ hours overdue
    const escalated3h = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'escalated_3h' },
      '-scheduled_time',
      50
    );

    let dispatched = 0;

    for (const checkIn of escalated3h) {
      if (!checkIn.sent_time) continue;

      const sentAt = new Date(checkIn.sent_time);
      const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

      // If 5+ hours since original send (2h more after 3h escalation)
      if (hoursSinceSent >= 5) {
        // BUG-R15-02 FIX: filter({ client_email }) + JS find() to resolve case is correct,
        // BUT it's O(n) on up to 20 cases per dispatch iteration. Since checkIn.case_id IS
        // the CaseRecord primary key, use .get() directly — one call, guaranteed correct match,
        // no risk of mismatching a different case belonging to the same email address.
        let destinationCountry = 'Unknown';
        try {
          const matchedCase = await base44.asServiceRole.entities.CaseRecord.get(checkIn.case_id);
          if (matchedCase?.procedure_country) destinationCountry = matchedCase.procedure_country;
        } catch (_) {}

        const securityAgency = await base44.asServiceRole.entities.SecurityAgency.filter(
          { country: destinationCountry, is_available: true },
          '-created_date',
          1
        );

        const dispatchMsg = `🚨 SECURITY DISPATCH: ${checkIn.user_name} (solo traveler) has been unresponsive for 5+ hours. Last location: ${checkIn.location_label || `${checkIn.location_lat},${checkIn.location_lng}` || 'Unknown'}. Phone: ${checkIn.user_phone}. Case ID: ${checkIn.case_id}. Please attempt welfare check immediately.`;

        if (securityAgency.length > 0) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: securityAgency[0].email,
              subject: `🚨 URGENT: Solo Traveler Welfare Check Required`,
              body: `<p>${dispatchMsg}</p>`,
            });
          } catch (e) {
            console.error('Failed to notify security agency:', e);
          }
        }

        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'resolved',
          escalation_level: 'security_dispatched',
          security_dispatched_at: now.toISOString(),
        });

        // BUG-FIX: real prev_hash (not hardcoded literal) + correct event_type for a security dispatch
        const prevHash = await getLastAuditHash(base44);
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'safet_risk_status_changed',
          actor_id: 'system',
          actor_role: 'automated',
          actor_name: 'Solo Check-In Emergency Dispatch',
          resource_type: 'SoloCheckIn',
          resource_id: checkIn.id,
          resource_name: `Round ${checkIn.check_in_round}`,
          case_id: checkIn.case_id,
          details: {
            escalation: '5h_security_dispatched',
            security_agency_notified: securityAgency.length > 0 ? securityAgency[0].agency_name : 'None available',
            hours_overdue: hoursSinceSent,
            last_location: checkIn.location_label || `${checkIn.location_lat},${checkIn.location_lng}`,
          },
          sensitive: true,
          timestamp: now.toISOString(),
          prev_hash: prevHash,
        });

        dispatched++;
      }
    }

    return Response.json({ dispatched, checked: escalated3h.length });
  } catch (error) {
    console.error('[dispatchSoloSecurity]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});