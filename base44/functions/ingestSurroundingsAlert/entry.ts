import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, validate, Fields } from '../../shared/validate.ts';
import { LEVEL_ORDER, SOURCE_TYPE_KEYS, CATEGORIES, isVerifiedSource } from '../../shared/surroundings.ts';

// ── ingestSurroundingsAlert ───────────────────────────────────────────────────
// The single door through which anything enters the surroundings feed. Admin or
// care team only — there is no automated, model-written, or client path.
//
// WHY THE GATE IS THIS STRICT
// A traveller will act on what this table says. So a row is refused unless it
// names a real source, says when the source reported it, says when a human last
// re-checked it, and says where. And it is refused outright if it tries to
// present an unverified public report as a WARNING or URGENT — that is the one
// failure mode that turns a safety tool into a rumour amplifier. The engine
// would downgrade it at read time anyway; refusing at write time tells the
// operator plainly instead of letting them believe they published a warning.
//
// Re-ingesting the same event (same dedupe_key) UPDATES the existing row rather
// than creating a second one, because two rows means two notifications for one
// closed road.

const schema = z.discriminatedUnion('action', [
  strictObject({
    action: z.literal('upsert'),
    alert_id: z.string().trim().max(120).optional(),
    headline: Fields.shortText(240),
    detail: z.string().trim().max(2000).optional().default(''),
    category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]),
    level: z.enum(LEVEL_ORDER as [string, ...string[]]),
    source_type: z.enum(SOURCE_TYPE_KEYS as [string, ...string[]]),
    source_name: Fields.shortText(160),
    source_url: z.string().trim().url().max(600).optional().or(z.literal('')),
    independently_confirmed: z.boolean().optional().default(false),
    confidence: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius_m: z.number().min(0).max(200000).optional(),
    area_label: z.string().trim().max(200).optional().default(''),
    city: z.string().trim().max(100).optional().default(''),
    country: z.string().trim().max(100).optional().default(''),
    reported_at: z.string().trim().min(10).max(40),
    last_checked_at: z.string().trim().min(10).max(40),
    expires_at: z.string().trim().min(10).max(40).optional(),
    suggested_action: z.string().trim().max(400).optional().default(''),
    dedupe_key: z.string().trim().max(300).optional(),
  }),
  strictObject({
    action: z.literal('withdraw'),
    alert_id: Fields.shortText(120),
    withdrawal_reason: Fields.shortText(300),
  }),
]);

function parseTime(value: string): number {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : NaN;
}

function buildDedupeKey(input: any): string {
  if (input.dedupe_key) return input.dedupe_key.toLowerCase().trim();
  const headline = String(input.headline).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const lat = Number.isFinite(input.latitude) ? input.latitude.toFixed(3) : 'na';
  const lng = Number.isFinite(input.longitude) ? input.longitude.toFixed(3) : 'na';
  return `${input.source_type}:${headline}:${lat}:${lng}`;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  // Admin gate — this endpoint can put a claim in front of every traveller.
  if (!['admin', 'platform_admin'].includes(user!.role)) return err('Forbidden', 403);

  const parsed = validate(schema, await body());
  if (!parsed.ok) return err(parsed.message);
  const input: any = parsed.data;

  if (input.action === 'withdraw') {
    const existing = await base44.asServiceRole.entities.SurroundingsAlert.get(input.alert_id)
      .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!existing) return err('That advisory is not on record.', 404);

    const updated = await base44.asServiceRole.entities.SurroundingsAlert.update(input.alert_id, {
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
      withdrawal_reason: input.withdrawal_reason,
    });
    return ok({ success: true, alert: updated });
  }

  const reportedMs = parseTime(input.reported_at);
  const checkedMs = parseTime(input.last_checked_at);
  if (Number.isNaN(reportedMs)) return err('reported_at is not a valid date.');
  if (Number.isNaN(checkedMs)) return err('last_checked_at is not a valid date.');

  const now = Date.now();
  const skewMs = 15 * 60 * 1000;
  if (checkedMs > now + skewMs) return err('last_checked_at cannot be in the future.');
  if (reportedMs > now + skewMs) return err('reported_at cannot be in the future.');
  if (checkedMs < reportedMs) return err('last_checked_at cannot be earlier than reported_at.');

  const hasCoords = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  if ((Number.isFinite(input.latitude) !== Number.isFinite(input.longitude))) {
    return err('Provide both a latitude and a longitude, or neither.');
  }
  if (!hasCoords && !input.area_label && !input.country) {
    return err('An advisory needs coordinates, a named area, or a country — otherwise nobody can act on it.');
  }

  const verified = isVerifiedSource(input.source_type) || input.independently_confirmed === true;
  if (!verified && (input.level === 'urgent' || input.level === 'warning')) {
    return err(
      'An unverified report cannot be published as WARNING or URGENT. Record it as CAUTION, or mark it independently_confirmed only if a second source corroborates it.',
      422,
    );
  }

  const dedupeKey = buildDedupeKey(input);

  const existing = input.alert_id
    ? await base44.asServiceRole.entities.SurroundingsAlert.get(input.alert_id)
        .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)))
    : (await base44.asServiceRole.entities.SurroundingsAlert
        .filter({ dedupe_key: dedupeKey }, '-reported_at', 1)
        .catch(() => []))?.[0] || null;

  const record: Record<string, unknown> = {
    headline: input.headline,
    detail: input.detail,
    category: input.category,
    level: input.level,
    source_type: input.source_type,
    source_name: input.source_name,
    source_url: input.source_url || '',
    independently_confirmed: input.independently_confirmed === true,
    confidence: input.confidence,
    latitude: hasCoords ? input.latitude : null,
    longitude: hasCoords ? input.longitude : null,
    radius_m: Number.isFinite(input.radius_m) ? input.radius_m : null,
    area_label: input.area_label,
    city: input.city,
    country: input.country,
    reported_at: new Date(reportedMs).toISOString(),
    last_checked_at: new Date(checkedMs).toISOString(),
    expires_at: input.expires_at
      ? new Date(parseTime(input.expires_at)).toISOString()
      : new Date(checkedMs + 24 * 60 * 60 * 1000).toISOString(),
    suggested_action: input.suggested_action,
    status: 'active',
    dedupe_key: dedupeKey,
    ingested_by: user!.email,
  };

  if (input.expires_at && Number.isNaN(parseTime(input.expires_at))) {
    return err('expires_at is not a valid date.');
  }

  if (existing) {
    // A correction reopens the record: withdrawn/expired becomes active again,
    // and the correction is what the next sweep will judge freshness against.
    const updated = await base44.asServiceRole.entities.SurroundingsAlert.update(existing.id, {
      ...record,
      withdrawn_at: null,
      withdrawal_reason: '',
    });
    return ok({ success: true, updated: true, alert: updated });
  }

  const created = await base44.asServiceRole.entities.SurroundingsAlert.create(record);
  return ok({ success: true, created: true, alert: created });
}, { name: 'ingestSurroundingsAlert', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));