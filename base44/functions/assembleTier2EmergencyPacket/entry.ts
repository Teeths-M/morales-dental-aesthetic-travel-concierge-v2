/**
 * assembleTier2EmergencyPacket
 *
 * Tier 2 emergency scaffolding — packet assembly only. Fired as a genuinely
 * separate, non-blocking follow-up from triggerSOS (police/ambulance
 * trigger_type) or escalateSoloCheckIn (9h tier), never awaited by either —
 * a slow or failed packet assembly must never delay or risk the real-time
 * dispatch those functions already perform.
 *
 * This function and everything it calls (routeTier2Emergency) may NEVER
 * place a real outbound call or message to police, ambulance, or a human
 * safety-monitoring partner — no such vendor relationship exists today and
 * no per-country legal/compliance review has been done. The terminal action
 * is always a durable record plus a real notification to Morales' own
 * admin/on-call human. See routeTier2Emergency's own header for the routing
 * decision and notification logic.
 *
 * Deliberately NOT given a bodySchema, matching triggerCovertSOS's own
 * reasoning: this sits directly downstream of the two most safety-critical
 * dispatch paths in the app, and a schema rejection here must never be why a
 * packet fails to assemble.
 */
import { createHandler, ok } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';
import { buildTier2PacketFields } from '../../shared/tier2EmergencyPacket.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
  const raw = await body<any>();
  if (!(await internalOrAdminAuthorized(raw.internal_secret, base44))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!raw.patient_email || !raw.trigger_type || !raw.source_function || !raw.situation_description) {
    // Never surface a 400 on this path — an odd-shaped follow-up call must
    // not itself become a new failure mode on top of a real emergency.
    return ok({ status: 'ok' });
  }

  const fields = await buildTier2PacketFields(base44, raw);

  let packet: any = null;
  try {
    packet = await base44.asServiceRole.entities.Tier2EmergencyPacket.create(fields);
  } catch (_) {
    return ok({ status: 'ok' });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'tier2_emergency_packet_assembled',
    actor_id: 'system',
    actor_role: 'automated',
    actor_name: 'Tier 2 Emergency Packet Assembler',
    resource_type: 'Tier2EmergencyPacket',
    resource_id: packet.id,
    case_id: fields.case_id,
    details: {
      source_function: fields.source_function,
      trigger_type: fields.trigger_type,
      medical_info_consent_given: fields.medical_info_consent_given,
    },
    sensitive: true,
    timestamp: fields.assembled_at,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  if (fields.case_id && fields.patient_email) {
    await logJourneyEvent(base44, {
      case_id: fields.case_id,
      client_email: fields.patient_email,
      event_type: 'emergency_packet_assembled',
      source: 'assembleTier2EmergencyPacket',
      message_text: "I've put together everything relevant for our on-call safety team — your location, what's happening, and your language needs.",
      priority: 'critical',
      action_taken: `Tier 2 emergency packet assembled (packet_id=${packet.id})`,
      tool_result: { packet_id: packet.id, trigger_type: fields.trigger_type },
      escalation_occurred: true,
    });
  }

  // Genuinely separate, non-blocking follow-up — routing/notification
  // latency must never risk this packet's own assembly having succeeded.
  base44.asServiceRole.functions?.invoke?.('routeTier2Emergency', {
    packet_id: packet.id,
    internal_secret: Deno.env.get('CRON_SECRET'),
  }).catch(() => {});

  return ok({ packet_id: packet.id, status: 'packet_assembled' });
}, { name: 'assembleTier2EmergencyPacket', requireAuth: false, rateLimit: false }));
