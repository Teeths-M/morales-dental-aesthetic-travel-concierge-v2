import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import { resolveMinorOccurredAt } from '../../shared/minorReunification.ts';
import { openAndNotify } from '../../shared/minorReunificationEngine.ts';

/**
 * getMinorCardContext — what a stranger sees when they scan the printed card.
 *
 * The disclosure surface is deliberately tiny: a FIRST NAME, the case id, and
 * whether a case is already open. No surname, no date of birth, no photo, no
 * guardian phone numbers, no address. A card that can be photographed in a
 * pocket must not become a key to a child's identity.
 *
 * The scan itself is trigger (b). It opens a case if none is open, and attaches
 * as a duplicate event if one already is — so a card scanned at a bus stop
 * raises the alarm immediately rather than waiting for someone to find a way to
 * contact Morales. Repeat scans inside the same window replay the same event
 * and change nothing.
 */
Deno.serve(createHandler(async ({ base44, body }) => {
  if (!(await isMinorReunificationEnabled(base44))) {
    return err('This module is not enabled.', 404);
  }

  const payload = await body<Record<string, unknown>>();
  const token = payload.token ? String(payload.token) : '';
  if (!token) return err('This card link is incomplete.', 400);

  const rows = await base44.asServiceRole.entities.MinorTraveller
    .filter({ qr_token: token }, '-created_date', 2);
  const minor = Array.isArray(rows) ? rows[0] : null;

  if (!minor || minor.is_active === false) {
    return err('This card is not recognised.', 404);
  }

  const occurred = resolveMinorOccurredAt(
    { occurred_at: payload.occurred_at as string | undefined },
    new Date().toISOString(),
  );

  const latitude = typeof payload.latitude === 'number' ? payload.latitude : null;
  const longitude = typeof payload.longitude === 'number' ? payload.longitude : null;

  const result = await openAndNotify(base44, {
    minor,
    trigger_source: 'qr_scan',
    occurred_at: occurred.occurred_at,
    occurred_at_source: occurred.occurred_at_source,
    actor_type: 'third_party',
    actor_id: null,
    evidence: {
      token_kind: 'qr',
      scan_location_supplied: latitude !== null && longitude !== null,
    },
    location: latitude !== null && longitude !== null ? { latitude, longitude } : null,
  });

  // ONLY these four values leave the building. Adding a field here is a privacy
  // decision, not a rendering one — keep the payload this small.
  return ok({
    first_name: minor.display_name || 'this child',
    case_id: result.caseRow.id,
    state: result.caseRow.state,
    care_team_phone: Deno.env.get('ADMIN_PHONE') || null,
  });
}, { requireAuth: false, name: 'getMinorCardContext' }));