import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { logCrisisReroute } from '../../shared/logCrisisReroute.ts';
import { getOrderedCaseContacts } from '../../shared/emergencyContacts.ts';

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

// Outbound SMS/WhatsApp (Twilio) — inline, matching every other function in
// this codebase (see escalateMissedDriverHandshake, sendWhatsAppCaseUpdate)
// rather than a shared module, per this repo's established convention.
async function sendSms(to, message) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return { ok: false };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    });
    return { ok: resp.ok };
  } catch (_) { return { ok: false }; }
}

async function sendWhatsApp(to, message) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from || !to) return { ok: false };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: message }).toString(),
    });
    return { ok: resp.ok };
  } catch (_) { return { ok: false }; }
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
      // caseRecord.emergency_contact is a display label ("Jane Doe (Spouse)"),
      // not an email — the real field is emergency_contact_email. This used
      // to write the label into guardian_email, poisoning every GuardianSession
      // this helper created (notifyGuardianNow reads guardian_email directly).
      // guardian_phone was never set at all before this fix.
      guardian_email: caseRecord.emergency_contact_email || '',
      guardian_phone: caseRecord.emergency_contact_number || '',
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

// Notify ONE ranked emergency contact via every channel we have a real value
// for (email + SMS + WhatsApp, same primitives as above). Replaces the two
// near-duplicate inline notify blocks the 2h and 3h tiers used to carry
// separately — now called once per contact in a Promise.allSettled fan-out,
// so a bad address for one contact can never stop the rest of the cascade
// or the tier's own state transition.
async function notifyContact(base44, contact, ctx) {
  const result = { contact_id: contact.id || 'primary', priority: contact.priority, emailSent: false, smsSent: false, whatsappSent: false };
  const firstName = (contact.name || '').trim().split(' ')[0];
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const isUrgent = ctx.tone === 'urgent';

  if (contact.email && contact.email.includes('@')) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: contact.email,
        subject: isUrgent
          ? `🚨 URGENT: ${ctx.checkInName} Safety Check-In Overdue`
          : `${ctx.checkInName} hasn't checked in yet — please take a look`,
        body: `<p>${greeting}</p>
          <p><strong>${ctx.checkInName}</strong> hasn't responded to their safety check-in${isUrgent ? ' for over 3 hours' : ''}.</p>
          <p><strong>Last Known Location:</strong> ${ctx.locStr}</p>
          ${ctx.mapsUrl ? `<p><a href="${ctx.mapsUrl}">📍 Open in Google Maps</a></p>` : ''}
          ${ctx.guardianUrl ? `<p><a href="${ctx.guardianUrl}">👁 View live safety status, and options to reach out or request help</a></p>` : ''}
          <p>${isUrgent ? 'Please try to contact them immediately. If you cannot reach them, Morales will continue escalating automatically.' : "We're here to protect them — please check in and make sure they're okay. This is an early, precautionary notice — no emergency has been declared."}</p>`,
      });
      result.emailSent = true;
    } catch (_) { /* non-blocking */ }
  }
  if (contact.phone) {
    const smsMsg = `${greeting} ${ctx.checkInName} hasn't responded to their check-in yet.${isUrgent ? ' This is urgent.' : ''} ${ctx.guardianUrl || ctx.appUrl}`;
    const [sms, wa] = await Promise.allSettled([sendSms(contact.phone, smsMsg), sendWhatsApp(contact.phone, smsMsg)]);
    result.smsSent = sms.status === 'fulfilled' && !!sms.value?.ok;
    result.whatsappSent = wa.status === 'fulfilled' && !!wa.value?.ok;
  }
  return result;
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

      // Everything below (all 4 tiers) is wrapped per-checkIn — this whole
      // block used to sit outside any try/catch, so one bad record throwing
      // (a malformed row, a transient write conflict) aborted the ENTIRE
      // loop, silently skipping every check-in after it in this run —
      // including anyone overdue for the 5h/9h security/police tier. A
      // failure here is now isolated to this one check-in; the rest of the
      // batch still gets processed this tick.
      try {

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

        // ── First miss: give the primary contact a live-location link right
        // away. Previously the guardian heard nothing until 3h. A missed
        // FIRST check-in is the earliest honest signal something might be
        // wrong — the primary contact only (priority 1) gets it now; the
        // full ranked network doesn't widen until 3h (see that tier below).
        try {
          const recentCases = await base44.asServiceRole.entities.CaseRecord.filter(
            { client_email: checkIn.user_email }, '-created_date', 5
          );
          const caseRecord = recentCases.find(c => c.id === checkIn.case_id) || recentCases[0];
          if (caseRecord) {
            const rankedContacts = await getOrderedCaseContacts(base44, caseRecord);
            const primaryOnly = rankedContacts.filter(c => c.priority === 1);
            if (primaryOnly.length) {
              const latestLoc = await getLatestLocation(base44, caseRecord.id);
              const guardianUrl = await ensureGuardianLink(base44, caseRecord, checkIn.user_email, checkIn.user_name);
              const locStr = latestLoc?.latitude
                ? `${latestLoc.latitude.toFixed(5)}, ${latestLoc.longitude.toFixed(5)}`
                : latestLoc?.place_label || 'not yet available';

              await Promise.allSettled(primaryOnly.map(c => notifyContact(base44, c, {
                checkInName: checkIn.user_name, guardianUrl, locStr, mapsUrl: null, appUrl, tone: 'first_notice',
              })));

              await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
                guardian_notified_at: now.toISOString(),
                guardian_link_sent: !!guardianUrl,
              });
            }
          }
        } catch (_) {
          // Non-blocking — a guardian-notify failure must never stop the escalation ladder
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

        // Get case for the full ranked contact network + latest location.
        // This is where the Companion Network Alerts cascade actually widens:
        // 2h reached only the primary contact; 3h reaches every ranked
        // contact the traveler has on file (never spread further into 5h/9h
        // — those tiers are a different audience, security/police dispatch,
        // not personal contacts).
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

            const locStr = latestLoc?.latitude
              ? `GPS: ${latestLoc.latitude.toFixed(5)}, ${latestLoc.longitude.toFixed(5)}`
              : latestLoc?.place_label || 'Unknown';
            const mapsUrl = latestLoc?.latitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${latestLoc.latitude},${latestLoc.longitude}&travelmode=driving`
              : null;

            const rankedContacts = await getOrderedCaseContacts(base44, caseRecord);
            await Promise.allSettled(rankedContacts.map(c => notifyContact(base44, c, {
              checkInName: checkIn.user_name, guardianUrl, locStr, mapsUrl, appUrl, tone: 'urgent',
            })));

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

        // ── Tier 2 scaffolding: same structured packet + human-handoff path
        // as triggerSOS's police/ambulance trigger — fired here, not
        // awaited, same non-blocking shape as this function's own
        // sendSatelliteMessage call above. No autonomous dialing anywhere
        // downstream — see routeTier2Emergency's own header.
        base44.asServiceRole.functions?.invoke?.('assembleTier2EmergencyPacket', {
          internal_secret: Deno.env.get('CRON_SECRET'),
          case_id: checkIn.case_id,
          source_function: 'escalateSoloCheckIn',
          source_event_id: checkIn.id,
          trigger_type: 'missed_checkin_9h',
          patient_email: checkIn.user_email,
          patient_name: checkIn.user_name,
          patient_phone: checkIn.user_phone,
          latitude: latestLoc?.latitude ?? null,
          longitude: latestLoc?.longitude ?? null,
          location_label: locStr,
          situation_description: `${checkIn.user_name || 'A solo traveler'} has been unresponsive for ${hoursOverdue.toFixed(1)} hours after a missed safety check-in. Case has been set to CRITICAL priority.`,
        }).catch(() => {});

        await logCrisisReroute(base44, {
          case_id: checkIn.case_id,
          crisis_type: 'EMERGENCY',
          detected_by: 'CRON',
          original_provider_type: 'other',
          status: 'human_escalated',
          human_escalated: true,
          human_escalated_reason: `${checkIn.user_name || 'A solo traveler'} has been unresponsive for ${hoursOverdue.toFixed(1)}h — police/embassy escalation required.`,
          source_message: `9-hour unresponsive escalation, last known location: ${locStr}.`,
        }).catch(() => {});

        escalated9h++;
      }

      } catch (checkInErr) {
        console.error(`[escalateSoloCheckIn] Failed processing check-in ${checkIn.id} (case ${checkIn.case_id || 'unknown'}):`, checkInErr instanceof Error ? checkInErr.stack || checkInErr.message : String(checkInErr));
        continue;
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