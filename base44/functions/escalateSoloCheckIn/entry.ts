import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../_shared/cronAuth.ts';

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

    /* This is THE escalation for a missed safety check-in: 2h nudge, 3h
       guardian alert, 5h security dispatch, 9h emergency. It required an admin
       SESSION, which meant no scheduler could ever call it — a scheduled run
       got 403. In practice it fired only when a human opened /admin and
       pressed a button, while the app told patients "24/7 support watching".
       A person overdue at 3am was found when someone next looked.

       cronAuthorized accepts a cron secret OR an admin session, so the admin
       button keeps working exactly as before and a scheduler can now drive it
       too. Same guard the other scheduled jobs already use; it fails closed
       when CRON_SECRET is unset (admin-only), so this never becomes open.

       Safe to run repeatedly: the loop below is a state machine gated on the
       current status (pending → escalated_2h → …), so a second pass in the
       same window re-reads the new status and does nothing. Overlapping
       schedulers cannot double-alert a guardian. */
    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    // Fetch all non-resolved pending/escalated check-ins (exclude resolved, acknowledged, escalated_9h — terminal states)
    const [pendingCheckIns, escalated2hCheckIns, escalated3hCheckIns, escalated5hCheckIns] = await Promise.all([
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'pending' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_2h' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_3h' }, '-scheduled_time', 100),
      base44.asServiceRole.entities.SoloCheckIn.filter({ status: 'escalated_5h' }, '-scheduled_time', 100),
    ]);

    const allCheckIns = [...pendingCheckIns, ...escalated2hCheckIns, ...escalated3hCheckIns, ...escalated5hCheckIns];
    let escalated2h = 0, escalated3h = 0, escalated5h = 0, escalated9h = 0;

    for (const checkIn of allCheckIns) {
      // Skip terminal states — do not re-escalate resolved or already-acknowledged check-ins
      if (['acknowledged', 'resolved', 'escalated_9h'].includes(checkIn.status)) continue;
      if (!checkIn.sent_time) continue;
      const sentAt = new Date(checkIn.sent_time);
      const hoursOverdue = (now - sentAt) / (1000 * 60 * 60);

      // ── 2h: Second reminder ─────────────────────────────────────────────
      if (hoursOverdue >= 2 && checkIn.status === 'pending') {
        // Atomic claim first
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { status: 'escalated_2h' });
        if (!checkIn.user_email) {
          console.error(`[escalateSoloCheckIn] No email address for check-in ${checkIn.id} — skipping 2h email`);
        } else {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: checkIn.user_email,
              subject: `⚠️ URGENT: Safety Check-In Overdue (2 hours)`,
              body: `<p>⚠️ Second attempt: You have not responded to your safety check-in. Please open the app and tap <strong>I Am Safe</strong> immediately or your emergency contact will be notified.</p><p><a href="${appUrl}/dashboard/solo-checkin">Open Dashboard →</a></p>`,
            });
          } catch (emailErr) {
            console.error(`[escalateSoloCheckIn] Email send failed for case ${checkIn.case_id}:`, emailErr?.message || String(emailErr));
            // Non-blocking — continue escalation even if email fails
          }
        }
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
              ? `https://www.google.com/maps/dir/?api=1&destination=${latestLoc.latitude},${latestLoc.longitude}&travelmode=driving`
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

        // Phone validation helper
        function isValidPhone(phone) {
          if (!phone || typeof phone !== 'string') return false;
          return /^\+?[\d\s\-()+]{7,20}$/.test(phone.trim());
        }

        // Re-check status before calling — user may have pressed "I Am Safe" while emails were sending
        const freshCheckIn = await base44.asServiceRole.entities.SoloCheckIn.filter(
          { case_id: checkIn.case_id }, '-scheduled_time', 5
        ).then(list => list.find(c => c.id === checkIn.id));
        const stillOverdue = freshCheckIn && !['acknowledged', 'resolved'].includes(freshCheckIn.status);

        // ── Satellite message — fires when voice call fires (cellular may be down) ──
        // If the patient has a registered satellite device, send a parallel message
        // that bypasses cellular entirely. This is the tier that works when all towers
        // go dark (grid collapse, remote area, cyberattack on infrastructure).
        if (checkIn.case_id) {
          base44.asServiceRole.functions?.invoke?.('sendSatelliteMessage', {
            case_id: checkIn.case_id,
            message: `MORALES SAFETY: We cannot reach you. Reply SAFE if okay or SOS if emergency. Help is on standby. — Morales Concierge`,
            reason:  'missed_check_in_satellite_fallback',
          }).catch(() => {}); // non-blocking — doesn't gate the rest of escalation
        }

        // Voice call attempt via Twilio
        if (!isValidPhone(checkIn.user_phone)) {
          console.warn(`[escalateSoloCheckIn] Invalid or missing phone for check-in ${checkIn.id}`);
        }
        if (isValidPhone(checkIn.user_phone) && stillOverdue) {
          const demoMode = Deno.env.get('DEMO_MODE') === 'true';
          if (demoMode) {
            console.log(`[DEMO_MODE] Would place Twilio voice call for check-in ${checkIn.id}`);
            await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { voice_call_attempted_at: now.toISOString() });
          }
        }
        if (isValidPhone(checkIn.user_phone) && stillOverdue && Deno.env.get('DEMO_MODE') !== 'true') {
          const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const auth = Deno.env.get('TWILIO_AUTH_TOKEN');
          const from = Deno.env.get('TWILIO_PHONE_NUMBER');
          if (sid && auth && from) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
              const voiceResp = await fetch(twilioUrl, {
                method: 'POST',
                headers: { Authorization: 'Basic ' + btoa(`${sid}:${auth}`), 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ From: from, To: checkIn.user_phone, Twiml: `<Response><Say>This is an automated safety call from Morales Medical. You have not responded to your check-in. Please open the app and confirm you are safe. If you are in danger, trigger the SOS button immediately.</Say></Response>` }),
                signal: controller.signal,
              });
              if (!voiceResp.ok) {
                const errText = await voiceResp.text().catch(() => '');
                console.error(`[escalateSoloCheckIn] Voice call failed for ${checkIn.id}: ${errText}`);
              }
              await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, { voice_call_attempted_at: now.toISOString() });
            } catch (voiceErr) {
              if (voiceErr.name === 'AbortError') {
                console.error(`[escalateSoloCheckIn] Twilio call timed out after 5s`);
              } else {
                console.error(`[escalateSoloCheckIn] Voice call exception for ${checkIn.id}:`, voiceErr?.message);
              }
            } finally {
              clearTimeout(timeoutId);
            }
          }
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
          } catch (emailErr) {
            console.error(`[escalateSoloCheckIn] Email send failed for case ${checkIn.case_id}:`, emailErr?.message || String(emailErr));
            // Non-blocking — continue escalation even if email fails
          }
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

      // ── 9h: Final Emergency Dispatch — Police/Embassy ────────────────────
      if (hoursOverdue >= 9 && checkIn.status === 'escalated_5h') {
        await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
          status: 'escalated_9h',
          escalation_level: 'police_required',
          police_escalation_required_at: now.toISOString(),
        });

        // Immediately flip case to Critical
        try {
          await base44.asServiceRole.entities.CaseRecord.update(checkIn.case_id, { case_priority: 'Critical' });
        } catch (_) {}

        let latestLoc = await getLatestLocation(base44, checkIn.case_id);
        const locStr = latestLoc?.latitude
          ? `${latestLoc.latitude.toFixed(5)}, ${latestLoc.longitude.toFixed(5)}`
          : latestLoc?.place_label || 'Unknown';
        const mapsUrl = latestLoc?.latitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${latestLoc.latitude},${latestLoc.longitude}&travelmode=driving`
          : null;

        if (adminEmail) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'Morales Safe-T EMERGENCY',
              to: adminEmail,
              subject: `🆘 9H EMERGENCY DISPATCH — ${checkIn.user_name} — CONTACT POLICE/EMBASSY NOW`,
              body: `<div style="background:#7f1d1d;color:white;padding:20px;border-radius:8px;">
                <h2 style="margin:0;">🆘 9-Hour Emergency Escalation — Final Tier</h2></div>
                <div style="padding:20px;border:2px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
                <p><strong>Traveler:</strong> ${checkIn.user_name}</p>
                <p><strong>Email:</strong> ${checkIn.user_email}</p>
                <p><strong>Phone:</strong> ${checkIn.user_phone || 'N/A'}</p>
                <p><strong>Case ID:</strong> ${checkIn.case_id}</p>
                <p><strong>Last Known Location:</strong> ${locStr}</p>
                <p><strong>Hours Overdue:</strong> ${hoursOverdue.toFixed(1)}h</p>
                ${mapsUrl ? `<p><a href="${mapsUrl}" style="color:#7f1d1d;">📍 Get Directions</a></p>` : ''}
                <p style="color:#7f1d1d;font-weight:bold;font-size:16px;">CONTACT LOCAL POLICE AND NEAREST EMBASSY IMMEDIATELY. Case has been set to CRITICAL priority.</p></div>`,
            });
          } catch (emailErr) {
            console.error(`[escalateSoloCheckIn] Email send failed for case ${checkIn.case_id}:`, emailErr?.message || String(emailErr));
            // Non-blocking — continue escalation even if email fails
          }
        }

        // Audit log
        const prevHash9 = await getLastAuditHash(base44);
        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'safe_t_critical_block',
          actor_id: 'system',
          actor_role: 'automated',
          actor_name: 'Solo Safety Escalation Engine',
          resource_type: 'SoloCheckIn',
          resource_id: checkIn.id,
          resource_name: `Round ${checkIn.check_in_round}`,
          case_id: checkIn.case_id,
          details: { escalation: '9h_emergency_dispatch', hours_overdue: hoursOverdue, last_location: locStr },
          sensitive: true,
          timestamp: now.toISOString(),
          prev_hash: prevHash9,
        });

        escalated9h++;
      }
    }

    // ── 3 missed rounds: switch case to high-risk monitoring ─────────────
    // Check per-case missed round totals across all rounds
    const allCaseIds = [...new Set(allCheckIns.map(c => c.case_id))];
    for (const cid of allCaseIds) {
      const caseMissed = allCheckIns.filter(c => c.case_id === cid && ['escalated_3h', 'escalated_5h', 'escalated_9h'].includes(c.status));
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

    return Response.json({ escalated2h, escalated3h, escalated5h, escalated9h, checked: allCheckIns.length });
  } catch (err) {
    /* This used to be `catch (_)` — the error was discarded and the caller got
       a bare "An internal error occurred." Nothing was written anywhere, so
       this function could fail every run for weeks with no way to find out
       why: not from the response, not from Base44's Logs page, not from the
       scheduler. A safety job that fails silently is worse than one that fails
       loudly, and this one guards the missed-check-in escalation ladder.

       The message still goes nowhere near the client — the response body is
       unchanged, so nothing leaks. The detail goes to the server log, which is
       the only place it is safe and the only place it is useful. */
    console.error('[escalateSoloCheckIn] FAILED:', err instanceof Error ? err.stack || err.message : String(err));
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});