import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

// ── Scheduled: every 5 minutes ── */5 * * * *
// Checks all active LiveLocation records and escalates stale ones:
//   15 min stale → email guardian + flag SoloCheckIn
//   30 min stale → email admin + security dispatch + push nudge to patient

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Admin or scheduler only — cron secret OR admin session. The previous
    // guard passed an unauthenticated caller (null user), which on this
    // function meant anyone could drive the stale-location safety sweep.
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';

    const threshold15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const threshold30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    // All active live location records
    const activeLocations = await base44.asServiceRole.entities.LiveLocation.filter(
      { is_active: true }, '-updated_at', 200
    );

    let alerted15 = 0, alerted30 = 0;

    for (const loc of activeLocations) {
      if (!loc.updated_at) continue;
      const updatedAt = loc.updated_at;

      // ── 15 min stale: alert guardian/admin once ──────────────────────
      if (updatedAt < threshold15m && !loc.stale_alerted_15m) {
        await base44.asServiceRole.entities.LiveLocation.update(loc.id, { stale_alerted_15m: true });

        // Log notification
        try {
          await base44.asServiceRole.entities.NotificationLog.create({
            case_id: loc.case_id,
            recipient_email: adminEmail || '',
            notification_type: 'live_location_stale_15m',
            channel: 'email',
            status: 'pending',
            created_at: now.toISOString(),
          });
        } catch (_) {}

        // Load guardian sessions for this case
        const sessions = await base44.asServiceRole.entities.GuardianSession.filter({
          case_id: loc.case_id, is_active: true,
        }).catch(() => []);

        const minutesAgo = Math.round((now - new Date(updatedAt)) / 60000);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;

        // Email guardian
        for (const session of sessions) {
          if (session.guardian_email && session.guardian_email.includes('@')) {
            const guardianUrl = `${appUrl}/guardian/${session.view_token}`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: session.guardian_email,
              subject: `⚠️ Location signal lost — ${session.patient_name}`,
              body: `<p>⚠️ <strong>${session.patient_name}'s</strong> live location has not updated for <strong>${minutesAgo} minutes</strong>.</p>
                <p>This may mean their device lost internet, the app went to background, or the device was locked.</p>
                <p><strong>Last known location:</strong> ${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}</p>
                <p><a href="${mapsUrl}">📍 View on Maps</a> &nbsp; <a href="${guardianUrl}">👁 Guardian Live View</a></p>
                <p>If you cannot reach them, contact the Morales emergency line immediately.</p>`,
            }).catch(() => {});
          }
        }

        // Find matching SoloCheckIn and escalate to escalated_2h
        const pendingCheckins = await base44.asServiceRole.entities.SoloCheckIn.filter({
          case_id: loc.case_id, status: 'pending',
        }, '-scheduled_time', 1).catch(() => []);
        if (pendingCheckins[0]) {
          await base44.asServiceRole.entities.SoloCheckIn.update(pendingCheckins[0].id, {
            status: 'escalated_2h',
          }).catch(() => {});
        }

        alerted15++;
      }

      // ── 30 min stale: escalate to security ──────────────────────────
      if (updatedAt < threshold30m && !loc.stale_alerted_30m) {
        await base44.asServiceRole.entities.LiveLocation.update(loc.id, { stale_alerted_30m: true });

        const minutesAgo = Math.round((now - new Date(updatedAt)) / 60000);

        // Get case record for security partner / emergency contact
        let caseRecord = null;
        try {
          const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: loc.case_id });
          caseRecord = cases[0];
        } catch (_) {}

        const mapsUrl = loc.latitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}&travelmode=driving`
          : null;

        if (adminEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Morales Safe-T Emergency',
            to: adminEmail,
            subject: `🚨 30-MIN LOCATION BLACKOUT — ${caseRecord?.client_name || loc.user_email}`,
            body: `<div style="background:#dc2626;color:white;padding:16px;border-radius:8px;"><strong>🚨 30-Minute Location Blackout</strong></div>
              <div style="padding:16px;border:1px solid #fca5a5;border-top:none;border-radius:0 0 8px 8px;">
              <p><strong>Traveler:</strong> ${caseRecord?.client_name || loc.user_email}</p>
              <p><strong>Case ID:</strong> ${loc.case_id}</p>
              <p><strong>Last GPS:</strong> ${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}</p>
              <p><strong>Last Update:</strong> ${minutesAgo} minutes ago</p>
              ${mapsUrl ? `<p><a href="${mapsUrl}">📍 Get Directions to Last Known Location</a></p>` : ''}
              <p style="color:#dc2626;font-weight:bold;">DISPATCH PRIVATE SECURITY IF UNREACHABLE</p></div>`,
          }).catch(() => {});
        }

        // Push notification to patient: nudge them to re-open the app and share location
        if (loc.user_email) {
          try {
            await base44.asServiceRole.functions.invoke('sendPushNotification', {
              user_email: loc.user_email,
              title: 'Are you safe?',
              body: "We haven't heard from you in 30 minutes. Tap to update your location.",
              data: { type: 'location_stale', case_id: loc.case_id },
            });
          } catch (_) { /* push is best-effort */ }
        }

        // Check if security partner assigned — log failure if not
        const hasSecurityPartner = !!caseRecord?.travel_vendor_id;
        if (!hasSecurityPartner) {
          await base44.asServiceRole.entities.DispatchFailureLog.create({
            case_id: loc.case_id,
            partner_type: 'security',
            reason: 'No security partner assigned — 30min location blackout',
            timestamp: now.toISOString(),
            fallback_action: 'admin_email_sent',
          }).catch(() => {});
        }

        // Escalate any active SoloCheckIn
        const escalated = await base44.asServiceRole.entities.SoloCheckIn.filter({
          case_id: loc.case_id,
        }, '-scheduled_time', 3).catch(() => []);
        const active = escalated.find(c => !['acknowledged', 'resolved'].includes(c.status));
        if (active) {
          await base44.asServiceRole.entities.SoloCheckIn.update(active.id, {
            status: 'escalated_5h',
            escalation_level: 'security_dispatched',
            security_dispatched_at: now.toISOString(),
          }).catch(() => {});
        }

        alerted30++;
      }
    }

    return Response.json({ checked: activeLocations.length, alerted15, alerted30 });
  } catch (err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});