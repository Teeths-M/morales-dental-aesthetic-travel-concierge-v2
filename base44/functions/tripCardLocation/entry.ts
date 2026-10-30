import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { loadCardByToken, computeStatus } from '../../shared/tripCardEngine.ts';
import { appendAudit } from '../../shared/incidentEngine.ts';
import { validCoordinate } from '../../shared/tripCard.ts';
import {
  renderLocationPage,
  renderStatusPage,
  renderNeutralPage,
  htmlResponse,
} from '../../shared/tripCardHtml.ts';

/**
 * tripCardLocation — the stranger's optional answer to "where are they?".
 *
 * Three answers, all recorded as facts:
 *   • gps      — a coordinate the device actually produced
 *   • address  — one plain-text place the stranger typed, never geocoded into
 *                a precision we did not earn
 *   • skip     — an explicit "location not provided", stored as such
 *
 * Whatever arrives goes into bystander_location_* and stays there. It is never
 * merged into the traveller's own location.
 */

const APP_URL = (Deno.env.get('APP_URL') || 'https://sentinel-dental-care.base44.app').replace(/\/$/, '');

Deno.serve(async (req) => {
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return htmlResponse(renderNeutralPage({ lang: 'en', emergencyNumber: '', reason: 'invalid' }));
    }

    const token = String(form.get('t') || '').trim();
    const kind = String(form.get('kind') || '').trim();

    if (!token) {
      return htmlResponse(renderNeutralPage({ lang: 'en', emergencyNumber: '', reason: 'invalid' }));
    }

    const { card, error } = await loadCardByToken(base44, token);

    if (error || !card) {
      return htmlResponse(renderNeutralPage({
        lang: card?.language || 'en',
        emergencyNumber: card?.emergency_number || Deno.env.get('ADMIN_PHONE') || '',
        reason: error === 'expired' ? 'expired' : 'invalid',
      }));
    }

    if (card.request_state !== 'open') {
      const status = await computeStatus(base44, card, now);
      return htmlResponse(renderStatusPage({
        lang: card.language,
        token,
        pageUrl: `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`,
        reference: card.request_ref || 'MC-OPEN',
        emergencyNumber: card.emergency_number,
        statusKey: status.key,
        terminal: true,
        refresh: false,
      }));
    }

    const patch: Record<string, unknown> = {};
    const evidence: Record<string, unknown> = { action: 'bystander_location', kind };
    let scanKind = 'location_skip';

    if (kind === 'gps') {
      scanKind = 'location_gps';
      const coord = validCoordinate(form.get('lat'), form.get('lng'));
      if (coord) {
        const accuracy = Number(form.get('accuracy'));
        patch.bystander_location_source = 'gps';
        patch.bystander_latitude = coord.lat;
        patch.bystander_longitude = coord.lng;
        patch.bystander_location_at = now;
        patch.bystander_location_note = null;
        evidence.received = true;
        evidence.accuracy_m = Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : null;
      } else {
        // The device produced no coordinate. Say so rather than storing a
        // location nobody gave us.
        patch.bystander_location_source = 'none';
        patch.bystander_location_at = now;
        patch.bystander_location_note = 'bystander chose to share location but the device provided no coordinates';
        evidence.received = false;
      }
    } else if (kind === 'address') {
      scanKind = 'location_address';
      const address = String(form.get('address') || '').trim().slice(0, 240);
      if (address.length < 3) {
        // Nothing usable was typed; ask again rather than recording an empty one.
        return htmlResponse(renderLocationPage({
          lang: card.language,
          actionUrl: `${APP_URL}/functions/tripCardLocation`,
          token,
          reference: card.request_ref || 'MC-OPEN',
          emergencyNumber: card.emergency_number,
        }));
      }
      patch.bystander_location_source = 'address';
      patch.bystander_address = address;
      patch.bystander_location_at = now;
      patch.bystander_location_note = null;
      evidence.received = true;
      evidence.address_length = address.length;
    } else {
      patch.bystander_location_source = 'none';
      patch.bystander_location_at = now;
      patch.bystander_location_note = 'bystander location not provided';
      evidence.received = false;
    }

    const updated = await base44.asServiceRole.entities.TripEmergencyCard.update(card.id, patch).catch(() => null);
    const live = updated || { ...card, ...patch };

    await base44.asServiceRole.entities.TripEmergencyScan.create({
      card_id: card.id,
      trip_id: card.trip_id,
      token_id: card.token_id || null,
      incident_id: card.open_incident_id || null,
      kind: scanKind,
      outcome: evidence.received ? 'bystander location recorded' : 'no bystander location',
      at: now,
      purge_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).catch(() => {});

    if (card.open_incident_id) {
      await appendAudit(base44, {
        incident_id: card.open_incident_id,
        patient_email: card.patient_email,
        subject_type: 'incident',
        subject_id: card.open_incident_id,
        from_state: null,
        to_state: 'BYSTANDER_LOCATION',
        actor: 'bystander:trip_card',
        actor_type: 'system',
        timestamp: now,
        evidence,
      });
    }

    const status = await computeStatus(base44, live, now);

    return htmlResponse(renderStatusPage({
      lang: live.language,
      token,
      pageUrl: `${APP_URL}/functions/tripCardPage?t=${encodeURIComponent(token)}`,
      reference: live.request_ref || 'MC-OPEN',
      emergencyNumber: live.emergency_number,
      statusKey: status.key,
      terminal: status.terminal,
      refresh: status.refresh,
    }));
  } catch (error) {
    console.error('[tripCardLocation]', error);
    return htmlResponse(renderNeutralPage({
      lang: 'en',
      emergencyNumber: Deno.env.get('ADMIN_PHONE') || '',
      reason: 'invalid',
    }));
  }
});