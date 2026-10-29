import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import { resolveMinorOccurredAt } from '../../shared/minorReunification.ts';
import { openAndNotify } from '../../shared/minorReunificationEngine.ts';

/**
 * openReunificationCase — the token trigger for three of the four ways a case
 * opens: the minor's own help button, an authorised adult's phone, and a scan
 * of the printed card. (The fourth, a missed check-in, has no human behind it
 * and is driven by the scheduled sweep.)
 *
 * This endpoint judges NOTHING. It does not ask a model whether the situation
 * is real, whether the child is really missing, or how urgent it is. A trigger
 * arrives, the case opens or attaches, and everyone is notified in parallel.
 * The alternative — grading a child's cry for help — is the failure this
 * module is built to avoid.
 *
 * Unauthenticated by design: a lost child does not have a login. The token is
 * the authorisation, and each token carries a different authority — the help
 * token may raise an alarm, the adult token may open a case, and the printed
 * QR token can do neither on its own behalf beyond reporting a scan.
 */

const TOKEN_FIELD: Record<string, 'help_token' | 'adult_token' | 'qr_token'> = {
  help: 'help_token',
  adult: 'adult_token',
  qr: 'qr_token',
};

const TRIGGER_SOURCE = {
  help: 'minor_help',
  adult: 'authorised_adult',
  qr: 'qr_scan',
} as const;

const ACTOR_TYPE = {
  help: 'minor',
  adult: 'third_party',
  qr: 'third_party',
} as const;

Deno.serve(createHandler(async ({ base44, body }) => {
  if (!(await isMinorReunificationEnabled(base44))) {
    return err('This module is not enabled.', 404);
  }

  const payload = await body<Record<string, unknown>>();
  const kind = String(payload.kind || 'help');
  const token = payload.token ? String(payload.token) : '';

  const field = TOKEN_FIELD[kind];
  if (!field) return err('Unrecognised link.', 400);
  if (!token) return err('This link is incomplete.', 400);

  const rows = await base44.asServiceRole.entities.MinorTraveller
    .filter({ [field]: token }, '-created_date', 2);
  const minor = Array.isArray(rows) ? rows[0] : null;

  if (!minor || minor.is_active === false) {
    return err('This link is not valid.', 404);
  }

  // The device's own timestamp when one is supplied, so a queued offline alarm
  // keeps the moment it happened rather than the moment the phone reconnected.
  const occurred = resolveMinorOccurredAt(
    { occurred_at: payload.occurred_at as string | undefined },
    new Date().toISOString(),
  );

  const latitude = typeof payload.latitude === 'number' ? payload.latitude : null;
  const longitude = typeof payload.longitude === 'number' ? payload.longitude : null;

  const result = await openAndNotify(base44, {
    minor,
    trigger_source: TRIGGER_SOURCE[kind],
    occurred_at: occurred.occurred_at,
    occurred_at_source: occurred.occurred_at_source,
    actor_type: ACTOR_TYPE[kind],
    actor_id: null,
    evidence: {
      token_kind: kind,
      device_location_supplied: latitude !== null && longitude !== null,
    },
    location: latitude !== null && longitude !== null ? { latitude, longitude } : null,
  });

  return ok({
    case_id: result.caseRow.id,
    state: result.caseRow.state,
    attached: result.attached,
    replayed: result.replayed,
    first_name: minor.display_name,
    question: 'are you safe right now?',
    notifications: result.notifications.length,
  });
}, { requireAuth: false, name: 'openReunificationCase' }));