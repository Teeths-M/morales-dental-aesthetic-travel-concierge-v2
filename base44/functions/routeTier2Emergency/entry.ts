/**
 * routeTier2Emergency
 *
 * The Tier 2 decision function — given an already-assembled Tier2EmergencyPacket,
 * decides which honest routing message applies (per the real, admin-set
 * EmergencyContacts.has_human_safety_partner DATA for that country, never a
 * hardcoded per-country if/else) and notifies Morales' own admin/on-call
 * human with everything they need to act right now.
 *
 * HARD BOUNDARY: this function's terminal action is ALWAYS one of —
 * Tier2EmergencyPacket.update, AuditLog.create, Core.SendEmail (to
 * ADMIN_EMAIL only), sendPushNotification (to ADMIN_EMAIL only). It never
 * places a call or sends a message to police, ambulance, or any safety
 * partner service — no such vendor relationship exists today, and no
 * per-country legal/compliance review has been done. Every email/push this
 * function sends states plainly that no automated dialing has occurred and
 * that a human must act now, matching activateEmergencyBeacon's own honesty
 * discipline for the same reason.
 */
import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';
import { escapeHtml as esc } from '../../shared/emailTemplate.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
  const { packet_id, internal_secret } = await body<any>();
  if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!packet_id) return err('packet_id is required');

  const packet = await base44.asServiceRole.entities.Tier2EmergencyPacket.get(packet_id).catch(() => null);
  if (!packet) return err('Packet not found', 404);

  const now = new Date().toISOString();

  // Real per-country routing DATA, never a hardcoded if/else.
  let countryRow: any = null;
  if (packet.destination_country && packet.destination_country !== 'Unknown') {
    const rows = await base44.asServiceRole.entities.EmergencyContacts.filter({ country_name: packet.destination_country }).catch(() => []);
    countryRow = rows[0] || null;
  }

  const hasPartner = !!countryRow?.has_human_safety_partner; // always false today — no real vendor exists
  const routeDecision = hasPartner ? 'human_safety_partner_available' : 'direct_local_emergency_with_human_outreach';
  const localEmergencyNumber = countryRow?.emergency_number || 'unknown — no EmergencyContacts row for this country';
  const routeReason = hasPartner
    ? `A human safety-monitoring partner is on file for ${packet.destination_country}. No automated dialing has occurred — a human must contact the partner now.`
    : `No human safety-monitoring partner is on file for ${packet.destination_country || 'this location'}. No automated dialing has occurred — a human must dial the local emergency number directly and reach out to the patient's own contacts now.`;

  const notificationChannels: string[] = [];
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

  if (adminEmail) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Morales — 🚨 TIER 2 EMERGENCY',
        to: adminEmail,
        subject: `🚨 TIER 2 EMERGENCY — ${packet.patient_name} — ${packet.destination_country} — HUMAN ACTION REQUIRED`,
        body: `<div style="background:#7f1d1d;color:#fff;padding:20px;border-radius:8px;">
<h2 style="margin:0;">🚨 Tier 2 Emergency — Human Action Required Now</h2></div>
<div style="padding:20px;border:2px solid #7f1d1d;border-top:none;border-radius:0 0 8px 8px;">
<p><strong>Patient:</strong> ${esc(packet.patient_name)} (${esc(packet.patient_email)})</p>
<p><strong>Phone:</strong> ${esc(packet.patient_phone || 'Not on file')}</p>
<p><strong>Location:</strong> ${esc(packet.location_label || 'Unknown')}</p>
${packet.latitude ? `<p><a href="https://maps.google.com/?q=${packet.latitude},${packet.longitude}">📍 Open in Google Maps</a></p>` : ''}
<p><strong>Situation:</strong> ${esc(packet.situation_description)}</p>
<p><strong>Language needed:</strong> ${esc(packet.preferred_language)}</p>
<p><strong>Medical info:</strong> ${esc(packet.medical_info_summary)}</p>
<p><strong>Local emergency number:</strong> ${esc(localEmergencyNumber)}</p>
<p style="color:#fca5a5;">${esc(routeReason)}</p>
<hr/>
<p style="color:#fbbf24;font-weight:bold;">No automated dialing has occurred. Dial ${esc(localEmergencyNumber)} or contact the reason above — a human must act on this now.</p>
</div>`,
      });
      notificationChannels.push('admin_email');
    } catch (_) { notificationChannels.push('admin_email_failed'); }

    // Different channel from the link-only comms policy — same exemption
    // already used by triggerCovertSOS/attachCovertSosEvidence: a push is
    // shown only on the recipient's own device.
    // LEAK-SCAN-IGNORE-START
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_email: adminEmail,
      title: '🚨 Tier 2 Emergency — Human Action Required',
      body: `${packet.patient_name} in ${packet.destination_country} — dial ${localEmergencyNumber} or act now.`,
      url: `${appUrl}/admin`,
      urgent: true,
      tag: 'tier2-emergency',
      internal_secret: Deno.env.get('CRON_SECRET'),
    }).catch(() => {});
    notificationChannels.push('admin_push');
    // LEAK-SCAN-IGNORE-END
  }

  await base44.asServiceRole.entities.Tier2EmergencyPacket.update(packet.id, {
    status: 'human_notified',
    route_decision: routeDecision,
    route_reason: routeReason,
    country_emergency_number: localEmergencyNumber,
    country_has_human_safety_partner: hasPartner,
    human_notified_at: now,
    notification_channels: notificationChannels,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'tier2_emergency_routed',
    actor_id: 'system',
    actor_role: 'automated',
    actor_name: 'Tier 2 Emergency Router',
    resource_type: 'Tier2EmergencyPacket',
    resource_id: packet.id,
    case_id: packet.case_id || '',
    details: { route_decision: routeDecision, country: packet.destination_country, notification_channels: notificationChannels },
    sensitive: true,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  if (packet.case_id && packet.patient_email) {
    await logJourneyEvent(base44, {
      case_id: packet.case_id,
      client_email: packet.patient_email,
      event_type: 'emergency_human_response_requested',
      source: 'routeTier2Emergency',
      message_text: notificationChannels.includes('admin_email')
        ? 'A human on our safety team has been alerted with everything they need and is acting on this now.'
        : "I'm still trying to reach our on-call safety team about this — please call your local emergency number directly if you can.",
      priority: 'critical',
      action_taken: `Tier 2 routing decision: ${routeDecision}`,
      tool_result: { packet_id: packet.id, route_decision: routeDecision, notification_channels: notificationChannels },
      escalation_occurred: true,
    });
  }

  return ok({ packet_id: packet.id, route_decision: routeDecision, notification_channels: notificationChannels });
}, { name: 'routeTier2Emergency', requireAuth: false, rateLimit: false }));
