import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';

const TIMEOUT_MINUTES = 15;

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

function shortId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// dispatchSoloSecurity — the actual security-agency contact step for an
// unresponsive solo traveler.
//
// escalateSoloCheckIn already moves a check-in to status 'escalated_5h' and
// emails the admin "DISPATCH PRIVATE SECURITY IMMEDIATELY" — that part was
// already real and already scheduled. What this function used to do was
// weaker than it looked: it required a human admin session to run at all
// (so unless someone opened /admin and clicked a button, it never ran),
// picked exactly one agency, emailed them, and immediately marked the
// incident 'resolved' with no verification anyone actually responded.
//
// Fixed to be a real, automatic, verified dispatch: runs on the same
// GitHub Actions safety cron as every other life-safety job
// (cronAuthorized, not an admin session), creates a real confirmable
// OfflineHandshake checkpoint (role: 'security') the agency replies to via
// SMS — same channel drivers already use — and if no confirmation lands
// within 15 minutes, automatically tries the next available agency in the
// country. Only marks 'confirmed' when a real reply lands. If every
// available agency is exhausted with nobody confirming, that is a loud,
// distinct failure — not a silent 'resolved'.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    const escalated5h = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'escalated_5h' },
      '-scheduled_time',
      50
    );

    let dispatched = 0, confirmed = 0, failed = 0;

    for (const checkIn of escalated5h) {
      if (checkIn.security_dispatch_status === 'confirmed' || checkIn.security_dispatch_status === 'failed') continue;

      // A dispatch is already in flight — check whether it's been confirmed,
      // or whether its 15-min window has passed and it's time to try the
      // next agency instead of re-dispatching the same one every tick.
      if (checkIn.security_dispatch_status === 'pending' && checkIn.security_dispatch_checkpoint_id) {
        const hs = await base44.asServiceRole.entities.OfflineHandshake.filter({
          checkpoint_id: checkIn.security_dispatch_checkpoint_id,
        }).catch(() => []);
        const h = hs?.[0];
        if (h?.status === 'completed') {
          await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { security_dispatch_status: 'confirmed' });
          confirmed++;
          continue;
        }
        const deadline = checkIn.security_dispatch_deadline ? new Date(checkIn.security_dispatch_deadline).getTime() : 0;
        if (now.getTime() < deadline) continue; // still inside the confirm window — don't pile on
        // else: timed out unconfirmed, fall through and try the next agency
      }

      let destinationCountry = 'Unknown';
      try {
        const matchedCase = await base44.asServiceRole.entities.CaseRecord.get(checkIn.case_id);
        if (matchedCase?.procedure_country) destinationCountry = matchedCase.procedure_country;
      } catch (_) {}

      const tried = checkIn.security_agencies_tried || [];
      const candidates = await base44.asServiceRole.entities.SecurityAgency.filter(
        { country: destinationCountry, is_available: true },
        '-created_date',
        20
      ).catch(() => []);
      const next = (candidates as any[]).find((a: any) => !tried.includes(a.id) && a.email);

      if (!next) {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { security_dispatch_status: 'failed' }).catch(() => {});
        if (adminEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `🚨🚨 CRITICAL: no security agency confirmed — ${checkIn.user_name}`,
            body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
              <h2 style="margin:0;">No security agency available or responding</h2></div>
              <div style="padding:20px;border:1px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
              <p>Every available security agency in <strong>${destinationCountry}</strong> has been tried for this unresponsive solo traveler and none confirmed. This needs immediate human intervention.</p>
              <p><strong>Traveler:</strong> ${checkIn.user_name}<br/><strong>Phone:</strong> ${checkIn.user_phone || 'N/A'}<br/><strong>Case ID:</strong> ${checkIn.case_id}<br/><strong>Last known location:</strong> ${checkIn.location_label || (checkIn.location_lat ? `${checkIn.location_lat},${checkIn.location_lng}` : 'Unknown')}</p>
              <p style="color:#fca5a5;font-weight:bold;">NO SECURITY RESPONSE — ESCALATE MANUALLY NOW</p></div>`,
          }).catch(() => {});
        }
        try {
          await base44.asServiceRole.entities.DispatchFailureLog.create({
            case_id: checkIn.case_id,
            partner_type: 'security',
            reason: `All ${tried.length + 1} available security agencies in ${destinationCountry} exhausted with no confirmation`,
            timestamp: now.toISOString(),
            fallback_action: 'admin_critical_alert_sent',
          });
        } catch (_) {}
        failed++;
        continue;
      }

      const checkpointId = `HS_${shortId()}`;
      const timeoutAtIso = new Date(now.getTime() + TIMEOUT_MINUTES * 60_000).toISOString();

      await base44.asServiceRole.entities.OfflineHandshake.create({
        case_id: checkIn.case_id,
        handshake_role: 'security',
        handshake_type: 'welfare_check',
        checkpoint_id: checkpointId,
        status: 'pending',
        timeout_at: timeoutAtIso,
        expected_phone: next.phone || '',
        escalated: false,
        rerouted: false,
        received_at: now.toISOString(),
      }).catch(() => {});

      const locStr = checkIn.location_label || (checkIn.location_lat ? `${checkIn.location_lat},${checkIn.location_lng}` : 'Unknown');
      const dispatchMsg = `🚨 SECURITY DISPATCH: ${checkIn.user_name} (solo traveler) has been unresponsive for 5+ hours. Last location: ${locStr}. Phone: ${checkIn.user_phone}. Case ID: ${checkIn.case_id}. Please attempt welfare check immediately, then reply SECURITY ${checkpointId} to confirm you are responding.`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: next.email,
          subject: `🚨 URGENT: Solo Traveler Welfare Check Required`,
          body: `<p>${dispatchMsg}</p>`,
        });
      } catch (e) {
        console.error('Failed to notify security agency:', e);
      }

      await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
        security_dispatch_status: 'pending',
        security_dispatch_checkpoint_id: checkpointId,
        security_dispatch_deadline: timeoutAtIso,
        security_dispatched_agency_id: next.id,
        security_agencies_tried: [...tried, next.id],
      });

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
          security_agency_notified: next.agency_name,
          checkpoint_id: checkpointId,
          attempt_number: tried.length + 1,
          last_location: locStr,
        },
        sensitive: true,
        timestamp: now.toISOString(),
        prev_hash: prevHash,
      });

      dispatched++;
    }

    return Response.json({ dispatched, confirmed, failed, checked: escalated5h.length });
  } catch (error) {
    console.error('[dispatchSoloSecurity]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
