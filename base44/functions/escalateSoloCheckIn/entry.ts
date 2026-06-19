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

function generateToken(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

// Ensure an active guardian session exists for the case; returns the guardian URL.
async function ensureGuardianLink(base44, caseRecord, patientEmail, patientName) {
  const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
  try {
    const existing = await base44.asServiceRole.entities.GuardianSession.filter({
      case_id: caseRecord.id, is_active: true,
    });
    const valid = existing.find(s => new Date(s.expires_at) > new Date() && s.shared_data_scope?.includes('location'));
    if (valid) return `${appUrl}/guardian/${valid.view_token}`;

    // Create new 48h guardian link
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.GuardianSession.create({
      case_id: caseRecord.id,
      patient_email: patientEmail,
      patient_name: patientName,
      guardian_name: 'Emergency Contact',
      guardian_email: caseRecord.emergency_contact || '',
      view_token: token,
      expires_at: expiresAt,
      is_active: true,
      view_count: 0,
      shared_data_scope: ['case_status', 'journey_stage', 'location'],
      created_at: new Date().toISOString(),
    });
    return `${appUrl}/guardian/${token}`;
  } catch (_) { return null; }
}

async function getLatestLocation(base44, caseId) {
  try {
    const crumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter({ case_id: caseId, is_purged: false });
    if (!crumbs?.length) return null;
    const sorted = crumbs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    return sorted[0];
  } catch (_) { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    // Fetch all non-resolved pending/escalated check-ins
    const pendingCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'pending' }, '-scheduled_time', 100
    );
    const escalated2hCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'escalated_2h' }, '-scheduled_time', 100
    );
    const escalated3hCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { status: 'escalated_3h' }, '-scheduled_time', 100
    );

    const allCheckIns = [...pendingCheckIns, ...escalated2hCheckIns, ...escalated3hCheckIns];
    let escalated2h = 0, escalated3h = 0, escalated5h = 0;

    for (const checkIn of allCheckIns) {
      if (!checkIn.sent_time) continue;
      const sentAt = new Date(checkIn.sent_time);
      const hoursOverdue = (now - sentAt) / (1000 * 60 * 60);

      // ── 2h: Second reminder ─────────────────────────────────────────────
      if (hoursOverdue >= 2 && checkIn.status === 'pending') {
        // Atomic claim first
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { status: 'escalated_2h' });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: checkIn.user_email,
            subject: `⚠️ URGENT: Safety Check-In Overdue (2 hours)`,
            body: `<p>⚠️ Second attempt: You have not responded to your safety check-in. Please open the app and tap <strong>I Am Safe</strong> immediately or your emergency contact will be notified.</p><p><a href="${appUrl}/dashboard/solo-checkin">Open Dashboard →</a></p>`,
          });
        } catch (_) {}
        escalated2h++;
      }

      // ── 3h: Guardian + emergency contact notification ────────────────────
      if (hoursOverdue >= 3 && checkIn.status === 'escalated_2h') {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'escalated_3h',
          escalation_level: 'contact_notified',
          emergency_contact_notified_at: now.toISOString(),
        });

        // Get case for emergency contact + latest location
        let guardianUrl = null;
        let latestLoc = null;
        try {
          const recentCases = await base44.asServiceRole.entities.CaseRecord.filter(
            { client_email: checkIn.user_email }, '-created_date', 5
          );
          const caseRecord = recentCases.find(c => c.id === checkIn.case_id) || recentCases[0];
          if (caseRecord) {
            latestLoc = await getLatestLocation(base44, caseRecord.id);
            guardianUrl = await ensureGuardianLink(base44, caseRecord, checkIn.user_email, checkIn.user_name);

            const emergencyEmail = caseRecord.emergency_contact;
            const locStr = latestLoc?.latitude
              ? `GPS: ${latestLoc.latitude.toFixed(5)}, ${latestLoc.longitude.toFixed(5)}`
              : latestLoc?.place_label || 'Unknown';
            const mapsUrl = latestLoc?.latitude
              ? `https://www.google.com/maps/search/?api=1&query=${latestLoc.latitude},${latestLoc.longitude}`
              : null;

            const alertBody = `<p>🚨 <strong>${checkIn.user_name}</strong> has not responded to their safety check-in for <strong>3 hours</strong>.</p>
              <p><strong>Last Known Location:</strong> ${locStr}</p>
              ${mapsUrl ? `<p><a href="${mapsUrl}">📍 Open in Google Maps</a></p>` : ''}
              ${guardianUrl ? `<p><a href="${guardianUrl}">👁 View Live Safety Status</a></p>` : ''}
              <p>Please try to contact them immediately. If you cannot reach them, reply to this email or call the Morales emergency line.</p>`;

            await Promise.allSettled([
              emergencyEmail && emergencyEmail.includes('@') ? base44.asServiceRole.integrations.Core.SendEmail({
                to: emergencyEmail,
                subject: `🚨 URGENT: ${checkIn.user_name} Safety Check-In Overdue`,
                body: alertBody,
              }) : Promise.resolve(),
              guardianUrl && emergencyEmail && emergencyEmail.includes('@') ? base44.asServiceRole.integrations.Core.SendEmail({
                to: emergencyEmail,
                subject: `👁 Guardian Live Status Link for ${checkIn.user_name}`,
                body: `<p>Use this secure link to monitor ${checkIn.user_name}'s live safety status and last known GPS location:</p><p><a href="${guardianUrl}">${guardianUrl}</a></p><p>No login required. Link expires in 48 hours.</p>`,
              }) : Promise.resolve(),
            ]);

            await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
              guardian_notified_at: now.toISOString(),
              guardian_link_sent: !!guardianUrl,
            });
          }
        } catch (_) {}

        // Voice call attempt via Twilio
        if (checkIn.user_phone) {
          try {
            const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
            const from = Deno.env.get('TWILIO_PHONE_NUMBER');
            if (sid && auth && from) {
              await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
                method: 'POST',
                headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ From: from, To: checkIn.user_phone, Twiml: `<Response><Say>This is an automated safety call from Morales Medical. You have not responded to your check-in. Please open the app and confirm you are safe. If you are in danger, trigger the SOS button immediately.</Say></Response>` }),
              });
              await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { voice_call_attempted_at: now.toISOString() });
            }
          } catch (_) {}
        }

        escalated3h++;
      }

      // ── 5h: Admin + private security dispatch ────────────────────────────
      if (hoursOverdue >= 5 && checkIn.status === 'escalated_3h') {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'escalated_5h',
          escalation_level: 'security_dispatched',
          security_dispatched_at: now.toISOString(),
        });

        let latestLoc = await getLatestLocation(base44, checkIn.case_id);
        const locStr = latestLoc?.latitude
          ? `${latestLoc.latitude.toFixed(5)}, ${latestLoc.longitude.toFixed(5)}`
          : latestLoc?.place_label || 'Unknown';
        const mapsUrl = latestLoc?.latitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${latestLoc.latitude},${latestLoc.longitude}&travelmode=driving`
          : null;

        // Notify admin/security
        if (adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safe-T Emergency',
              to: adminEmail,
              subject: `🚨 5H ESCALATION — ${checkIn.user_name} — SECURITY DISPATCH REQUIRED`,
              body: `<div style="background:#dc2626;color:white;padding:20px;border-radius:8px;">
                <h2 style="margin:0;">🚨 5-Hour Safety Escalation</h2></div>
                <div style="padding:20px;border:1px solid #fca5a5;border-top:none;border-radius:0 0 8px 8px;">
                <p><strong>Traveler:</strong> ${checkIn.user_name}</p>
                <p><strong>Email:</strong> ${checkIn.user_email}</p>
                <p><strong>Phone:</strong> ${checkIn.user_phone || 'N/A'}</p>
                <p><strong>Case ID:</strong> ${checkIn.case_id}</p>
                <p><strong>Last Known Location:</strong> ${locStr}</p>
                <p><strong>Hours Overdue:</strong> ${hoursOverdue.toFixed(1)}h</p>
                <p><strong>Missed Round:</strong> ${checkIn.check_in_round}</p>
                ${mapsUrl ? `<p><a href="${mapsUrl}" style="color:#dc2626;">📍 Get Directions</a></p>` : ''}
                <p style="color:#dc2626;font-weight:bold;">DISPATCH PRIVATE SECURITY IMMEDIATELY</p></div>`,
            });
          } catch (_) {}
        }

        // Log dispatch failure if no security partner assigned (DispatchFailureLog)
        try {
          const recentCases = await base44.asServiceRole.entities.CaseRecord.filter(
            { client_email: checkIn.user_email }, '-created_date', 5
          );
          const caseRecord = recentCases.find(c => c.id === checkIn.case_id);
          const hasSecurityPartner = !!caseRecord?.travel_vendor_id;
          if (!hasSecurityPartner) {
            await base44.asServiceRole.entities.DispatchFailureLog.create({
              case_id: checkIn.case_id,
              partner_type: 'security',
              reason: 'No private security partner assigned to case',
              timestamp: now.toISOString(),
              fallback_action: 'admin_email_sent',
            });
          }
        } catch (_) {}

        // Audit
        const prevHash = await getLastAuditHash(base44);
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'safe_t_critical_block',
          actor_id: 'system',
          actor_role: 'automated',
          actor_name: 'Solo Safety Escalation Engine',
          resource_type: 'SoloCheckIn',
          resource_id: checkIn.id,
          resource_name: `Round ${checkIn.check_in_round}`,
          case_id: checkIn.case_id,
          details: { escalation: '5h_security_dispatch', hours_overdue: hoursOverdue, last_location: locStr },
          sensitive: true,
          timestamp: now.toISOString(),
          prev_hash: prevHash,
        });

        escalated5h++;
      }
    }

    // ── 3 missed rounds: switch case to high-risk monitoring ─────────────
    // Check per-case missed round totals across all rounds
    const allCaseIds = [...new Set(allCheckIns.map(c => c.case_id))];
    for (const cid of allCaseIds) {
      const caseMissed = allCheckIns.filter(c => c.case_id === cid && ['escalated_3h', 'escalated_5h'].includes(c.status));
      if (caseMissed.length >= 3) {
        try {
          const recentCases = await base44.asServiceRole.entities.CaseRecord.filter(
            { client_email: caseMissed[0].user_email }, '-created_date', 5
          );
          const caseRecord = recentCases.find(c => c.id === cid);
          if (caseRecord && caseRecord.case_priority !== 'Critical') {
            await base44.asServiceRole.entities.CaseRecord.update(cid, { case_priority: 'Critical' });
            if (adminEmail) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: adminEmail,
                subject: `🚨 CRITICAL: ${caseMissed[0].user_name} — 3 Missed Check-Ins`,
                body: `<p>Case ${cid} has been automatically escalated to CRITICAL priority. ${caseMissed[0].user_name} has missed 3+ consecutive check-ins. Immediate human intervention required.</p>`,
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
    }

    return Response.json({ escalated2h, escalated3h, escalated5h, checked: allCheckIns.length });
  } catch (_) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});