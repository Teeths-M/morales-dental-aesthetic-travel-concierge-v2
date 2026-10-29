import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { advanceDispatch, loadOffers, appendAudit } from '../../shared/incidentEngine.ts';

/**
 * sweepDispatchOffers — runs every minute.
 *
 * Three jobs, all deterministic:
 *   1. Expire any OFFERED offer whose 90 seconds are up, then offer the next
 *      ranked responder.
 *   2. Recover an incident stuck in DISPATCHING with no live offer — the
 *      crash-between-writes case — by continuing the sequence.
 *   3. Never do anything else. It cannot accept an offer, cannot resolve an
 *      incident, and cannot skip the ranking.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const expired: any[] = [];
    const continued: any[] = [];

    // ── 1. Expire overdue offers ────────────────────────────────────────────
    const live = await base44.asServiceRole.entities.DispatchOffer
      .filter({ status: 'OFFERED' }, 'expires_at', 100)
      .catch(() => []);

    for (const offer of live as any[]) {
      const expMs = new Date(offer.expires_at).getTime();
      if (!Number.isFinite(expMs) || expMs > new Date(now).getTime()) continue;

      await base44.asServiceRole.entities.DispatchOffer.update(offer.id, {
        status: 'EXPIRED',
        responded_at: offer.expires_at,
        responded_at_source: 'server_fallback',
      }).catch(() => {});

      await appendAudit(base44, {
        incident_id: offer.incident_id,
        patient_email: offer.patient_email,
        subject_type: 'offer',
        subject_id: offer.id,
        from_state: 'OFFERED',
        to_state: 'EXPIRED',
        actor: 'dispatch_engine',
        actor_type: 'engine',
        timestamp: now,
        evidence: { reason: 'timer_expired', expires_at: offer.expires_at, attempt_number: offer.attempt_number },
      });

      expired.push({ incident_id: offer.incident_id, offer_id: offer.id });

      const incident = await base44.asServiceRole.entities.Incident.get(offer.incident_id).catch(() => null);
      if (!incident || incident.status !== 'DISPATCHING') continue;

      const policy = await base44.asServiceRole.entities.EmergencyDispatchPolicy
        .filter({ country_code: String(incident.country_code || '').toUpperCase(), is_active: true })
        .catch(() => []).then((r: any) => r?.[0] || null);

      if (!policy) continue;

      const result = await advanceDispatch(base44, { incident, policy, now, reason: 'offer_timer_expired' });
      continued.push({
        incident_id: incident.id,
        next_offer: result.offer ? result.offer.responder_id : null,
        unresolved: result.unresolved,
      });
    }

    // ── 2. Recover incidents orphaned mid-dispatch ──────────────────────────
    const dispatching = await base44.asServiceRole.entities.Incident
      .filter({ status: 'DISPATCHING' }, '-created_date', 50)
      .catch(() => []);

    for (const incident of dispatching as any[]) {
      const offers = await loadOffers(base44, incident.id);
      const hasLive = offers.some((o: any) => o.status === 'OFFERED');
      const hasAccepted = offers.some((o: any) => o.status === 'ACCEPTED');
      if (hasLive || hasAccepted) continue;

      const policy = await base44.asServiceRole.entities.EmergencyDispatchPolicy
        .filter({ country_code: String(incident.country_code || '').toUpperCase(), is_active: true })
        .catch(() => []).then((r: any) => r?.[0] || null);

      if (!policy) continue;

      const result = await advanceDispatch(base44, { incident, policy, now, reason: 'orphaned_dispatch_recovery' });
      continued.push({
        incident_id: incident.id,
        next_offer: result.offer ? result.offer.responder_id : null,
        recovered: true,
        unresolved: result.unresolved,
      });
    }

    return Response.json({
      success: true,
      expired_offers: expired.length,
      advanced: continued.length,
      detail: continued,
    });
  } catch (error) {
    console.error('[sweepDispatchOffers]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});