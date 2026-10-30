import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  computeUsage,
  ensureBundle,
  isTripAssistanceEnabled,
  resolveTrip,
} from '../../shared/tripAssistanceEngine.ts';
import { isQuietNow, quietWindowLabel } from '../../shared/tripAssistance.ts';
import { packetPairs } from '../../shared/tripPacket.ts';

/**
 * getTripAssistance — everything the traveller's own screen may read.
 *
 * Assembles the trip's policy, standing list, packet and show cards on read, so
 * a trip that was booked before this module existed still gets a packet the
 * first time it is opened. Returns no token, no delivery body and nothing about
 * any other traveller.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to see your trip.' }, { status: 401 });

    if (!(await isTripAssistanceEnabled(base44))) {
      return Response.json({ enabled: false });
    }

    const body = await req.json().catch(() => ({}));
    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));

    let ctx = await resolveTrip(base44, { trip_id: body?.trip_id, user });
    if (!ctx) {
      return Response.json({ enabled: true, trip: null, requests: [], cards: [] });
    }

    if (!isAdmin && ctx.patient_email !== String(user.email || '').toLowerCase()) {
      if (body?.trip_id) return Response.json({ error: 'That trip is not yours.' }, { status: 403 });
      ctx = null;
      return Response.json({ enabled: true, trip: null, requests: [], cards: [] });
    }

    const bundle = await ensureBundle(base44, ctx);
    const usage = await computeUsage(base44, ctx, bundle.policy);

    const [requests, deliveries] = await Promise.all([
      base44.asServiceRole.entities.TripAssistanceRequest
        .filter({ trip_id: ctx.trip_id, patient_email: ctx.patient_email }, '-created_date', 30)
        .catch(() => []),
      base44.asServiceRole.entities.TripPacketDelivery
        .filter({ trip_id: ctx.trip_id }, '-sent_at', 15)
        .catch(() => []),
    ]);

    return Response.json({
      enabled: true,
      trip: {
        trip_id: ctx.trip_id,
        case_id: ctx.case_id,
        country_name: ctx.country_name,
        local_number: bundle.policy.local_number || ctx.local_number,
        local_number_label: bundle.policy.local_number_label || ctx.local_number_label,
      },
      policy: {
        trip_language: bundle.policy.trip_language,
        languages: bundle.policy.languages || [],
        per_trip_cap: bundle.policy.per_trip_cap,
        per_day_cap: bundle.policy.per_day_cap,
        quiet_hours_start: bundle.policy.quiet_hours_start,
        quiet_hours_end: bundle.policy.quiet_hours_end,
        quiet_hours_timezone: bundle.policy.quiet_hours_timezone,
        retention_days_outcomes: bundle.policy.retention_days_outcomes,
        retention_days_audio: bundle.policy.retention_days_audio,
        automated_voice_enabled: bundle.policy.automated_voice_enabled === true,
      },
      usage,
      quiet: {
        is_quiet_now: isQuietNow(bundle.policy),
        window_label: quietWindowLabel(bundle.policy),
        ends_at_label: bundle.policy.quiet_hours_end || '07:00',
      },
      disclosure: {
        approved: bundle.disclosure.approved === true,
        approved_at: bundle.disclosure.approved_at || null,
        version: bundle.disclosure.version || 1,
        fields: bundle.disclosure.fields || [],
        always_excluded: bundle.disclosure.always_excluded || [],
      },
      packet: {
        id: bundle.packet.id,
        version: bundle.packet.version || 1,
        status: bundle.packet.status,
        assembled_at: bundle.packet.assembled_at || null,
        fields: packetPairs(bundle.packet),
      },
      packet_deliveries: (Array.isArray(deliveries) ? deliveries : []).map((d: any) => ({
        id: d.id,
        packet_version: d.packet_version,
        recipient_type: d.recipient_type,
        recipient_label: d.recipient_label,
        channel: d.channel,
        outcome: d.outcome,
        sent_at: d.sent_at,
        fallback_note: d.fallback_note || '',
      })),
      cards: (Array.isArray(bundle.cards) ? bundle.cards : [])
        .sort((a: any, b: any) => String(a.situation).localeCompare(String(b.situation)))
        .map((c: any) => ({
          situation: c.situation,
          label: c.label,
          text_local: c.text_local,
          text_en: c.text_en,
          language_code: c.language_code,
          language_name: c.language_name,
        })),
      requests: (Array.isArray(requests) ? requests : []).map((r: any) => ({
        id: r.id,
        tier: r.tier,
        category_label: r.category_label,
        mode: r.mode,
        status: r.status,
        ask_text: r.ask_text,
        recipient_name: r.recipient_name,
        attempt_status: r.attempt_status,
        agreement: r.agreement,
        next_step: r.next_step,
        summary_text: r.summary_text,
        retry_used: r.retry_used === true,
        agreed_at: r.agreed_at || null,
        created_date: r.created_date,
      })),
    });
  } catch (error) {
    console.error('[getTripAssistance]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});