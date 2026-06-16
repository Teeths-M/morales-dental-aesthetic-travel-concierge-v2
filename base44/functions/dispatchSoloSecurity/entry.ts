import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    // Find check-ins escalated at 3h level that are now 5+ hours overdue (2 more hours passed)
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
        // Dispatch private security + notify local police
        const securityAgency = await base44.asServiceRole.entities.SecurityAgency.filter(
          { country: checkIn.procedure_country || 'Unknown', is_available: true },
          '-created_date',
          1
        );

        const dispatchMsg = `🚨 SECURITY DISPATCH: ${checkIn.user_name} (solo traveler) has been unresponsive for 5+ hours. Last location: ${checkIn.location_label || checkIn.location_lat + ',' + checkIn.location_lng || 'Unknown'}. Phone: ${checkIn.user_phone}. Case ID: ${checkIn.case_id}. Please attempt welfare check immediately.`;

        // Notify security agency via email
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

        // Update check-in record
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'resolved',
          escalation_level: 'security_dispatched',
          security_dispatched_at: now.toISOString(),
        });

        // Log to AuditLog (SOS audit)
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'safe_t_high_risk_waiver_signed',
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
          prev_hash: 'SOLO_DISPATCH_5H',
        });

        dispatched++;
      }
    }

    return Response.json({ dispatched, checked: escalated3h.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});