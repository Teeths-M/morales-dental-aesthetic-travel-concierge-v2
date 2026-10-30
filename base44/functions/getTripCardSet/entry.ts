import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isFeatureEnabled } from '../../shared/featureFlags.ts';
import { TRIP_CARD_SET_FLAG } from '../../shared/tripCardSet.ts';
import { loadInstances } from '../../shared/tripCardSetEngine.ts';

/**
 * getTripCardSet — what the trip screen is allowed to know.
 *
 * Returns the trip's set, the live cards and the printed acknowledgement. Never
 * the tokens, and never anything a partner could read: the acknowledgement is the
 * traveller's own claim about their own paper, and a driver has no business
 * knowing whether they did their homework.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Sign in to see your trip.' }, { status: 401 });

    const enabled = await isFeatureEnabled(base44, TRIP_CARD_SET_FLAG, false);
    if (!enabled) return Response.json({ enabled: false, card: null, instances: [] });

    const body = await req.json().catch(() => ({}));
    const isAdmin = ['admin', 'platform_admin'].includes(String(user.role || ''));

    let card: any = null;

    if (isAdmin && body?.trip_card_id) {
      card = await base44.asServiceRole.entities.TripEmergencyCard.get(String(body.trip_card_id)).catch(() => null);
    } else if (isAdmin && body?.trip_id) {
      const rows = await base44.asServiceRole.entities.TripEmergencyCard
        .filter({ trip_id: String(body.trip_id) }, '-created_date', 1).catch(() => []);
      card = (Array.isArray(rows) ? rows : [])[0] || null;
    } else {
      const rows = await base44.asServiceRole.entities.TripEmergencyCard
        .filter({ patient_email: user.email }, '-created_date', 5).catch(() => []);
      const all = Array.isArray(rows) ? rows : [];
      card = all.find((r: any) => !r.revoked && new Date(r.expires_at).getTime() > Date.now())
        || all.find((r: any) => !r.revoked)
        || null;
    }

    if (!card) return Response.json({ enabled: true, card: null, instances: [] });

    if (!isAdmin && String(card.patient_email || '').toLowerCase() !== String(user.email || '').toLowerCase()) {
      return Response.json({ error: 'That trip card is not yours.' }, { status: 403 });
    }

    const instances = await loadInstances(base44, card.id);

    return Response.json({
      enabled: true,
      card: {
        id: card.id,
        country_code: card.country_code,
        country_name: card.country_name,
        language: card.language,
        emergency_number: card.local_mcare_number || card.emergency_number,
        local_whatsapp_number: card.local_whatsapp_number || null,
        trip_ends_at: card.trip_ends_at,
        expires_at: card.expires_at,
        card_set_version: card.card_set_version || 1,
        active_instance_count: card.active_instance_count || 0,
      },
      // No token, no URL: the screen shows which cards are live, not how to forge
      // a scan. The QR stays on the printed sheet and in the pack.
      instances: instances.map((i) => ({
        id: i.id,
        short_ref: i.short_ref,
        status: i.status,
        label: i.label,
        issued_at: i.issued_at,
        reported_lost_at: i.reported_lost_at || null,
        reported_stolen_at: i.reported_stolen_at || null,
        revoked_reason: i.revoked_reason || null,
      })),
      printed_acknowledged: card.printed_acknowledged === true,
      printed_acknowledged_at: card.printed_acknowledged_at || null,
      readiness_due_at: card.readiness_due_at || null,
      readiness_notified_at: card.readiness_notified_at || null,
      can_reissue_later: true,
    });
  } catch (error) {
    console.error('[getTripCardSet]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});