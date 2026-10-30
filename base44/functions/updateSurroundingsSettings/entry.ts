import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';

// ── updateSurroundingsSettings ────────────────────────────────────────────────
// Everything the traveller controls about being interrupted, plus the single
// position ping the scheduled sweep relies on.
//
// THE POSITION RULE: a coordinate is stored only when the layer is already
// switched on. Turning the feature on is consent to be watched for relevance;
// the reverse — quietly recording where somebody is, so the feature is warm
// later if they enable it — is exactly the thing we are not doing. When the
// layer is off this endpoint returns `stored: false` rather than pretending.

const schema = z.discriminatedUnion('action', [
  strictObject({
    action: z.literal('save'),
    enabled: z.boolean().optional(),
    min_level: z.enum(['information', 'caution', 'warning', 'urgent']).optional(),
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM').optional(),
    quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM').optional(),
    quiet_hours_timezone: z.string().trim().max(64).optional(),
    country: z.string().trim().max(100).optional(),
  }),
  strictObject({
    action: z.literal('location'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    source: z.enum(['gps', 'approximate']).default('gps'),
  }),
]);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const parsed = validate(schema, await body());
  if (!parsed.ok) return err(parsed.message);
  const input = parsed.data;

  const existing = (await base44.entities.SurroundingsSettings.filter({ owner_email: user!.email }))?.[0] || null;

  if (input.action === 'save') {
    const patch: Record<string, unknown> = {};
    if (input.enabled != null) patch.enabled = input.enabled;
    if (input.min_level != null) patch.min_level = input.min_level;
    if (input.quiet_hours_enabled != null) patch.quiet_hours_enabled = input.quiet_hours_enabled;
    if (input.quiet_hours_start != null) patch.quiet_hours_start = input.quiet_hours_start;
    if (input.quiet_hours_end != null) patch.quiet_hours_end = input.quiet_hours_end;
    if (input.quiet_hours_timezone != null) patch.quiet_hours_timezone = input.quiet_hours_timezone;
    if (input.country != null) patch.country = input.country;

    if (!existing) {
      const created = await base44.entities.SurroundingsSettings.create({
        owner_email: user!.email,
        enabled: input.enabled ?? false,
        min_level: input.min_level ?? 'caution',
        quiet_hours_enabled: input.quiet_hours_enabled ?? true,
        quiet_hours_start: input.quiet_hours_start ?? '22:00',
        quiet_hours_end: input.quiet_hours_end ?? '07:00',
        quiet_hours_timezone: input.quiet_hours_timezone || '',
        country: input.country || '',
        last_location_source: 'none',
      });
      return ok({ success: true, settings: created });
    }

    if (Object.keys(patch).length === 0) return ok({ success: true, settings: existing });

    // Turning the layer OFF is also a request to forget the last position: the
    // feature no longer needs it, and keeping it would outlive the permission.
    if (input.enabled === false) {
      patch.last_latitude = null;
      patch.last_longitude = null;
      patch.last_location_source = 'none';
      patch.last_location_at = null;
    }

    const updated = await base44.entities.SurroundingsSettings.update(existing.id, patch);
    return ok({ success: true, settings: updated });
  }

  if (!existing || existing.enabled !== true) {
    return ok({
      success: true,
      stored: false,
      reason: 'Surroundings awareness is off, so this position was not stored.',
    });
  }

  const updated = await base44.entities.SurroundingsSettings.update(existing.id, {
    last_latitude: input.latitude,
    last_longitude: input.longitude,
    last_location_source: input.source,
    last_location_at: new Date().toISOString(),
  });

  return ok({ success: true, stored: true, settings: updated });
}, { name: 'updateSurroundingsSettings', requireAuth: true }));