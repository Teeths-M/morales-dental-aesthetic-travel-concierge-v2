import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, validate, Fields } from '../../shared/validate.ts';

// ── saveTravelerPlace ─────────────────────────────────────────────────────────
// The ONLY way a place gets into TravelerPlace. Deliberately a user-initiated
// write with no autonomous caller: M-Care may suggest a place in conversation,
// but it is stored only when the traveller taps save, and the record is theirs
// to edit or delete afterwards. There is no path here that mines a chat
// transcript for places somebody merely mentioned.
//
// kind is a personal preference ("I'd rather not go there"), never a safety
// verdict about an area — nothing in this function derives one.

const PLACE_CATEGORIES = ['lodging', 'clinic', 'pharmacy', 'restaurant', 'market', 'transport', 'attraction', 'embassy', 'other'];

// A cap, not a target. Without it "save every place I walk past" turns into an
// unbounded proximity table that costs a sweep time for no one's benefit.
const MAX_PLACES = 40;

const coords = {
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().trim().max(300).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  trip_id: z.string().trim().max(100).optional(),
};

const schema = z.discriminatedUnion('action', [
  strictObject({
    action: z.literal('create'),
    label: Fields.shortText(120),
    kind: z.enum(['visit', 'avoid']).default('visit'),
    category: z.string().trim().max(30).optional().default('other'),
    source: z.enum(['manual', 'current_location', 'search', 'agent']).optional().default('manual'),
    ...coords,
  }),
  strictObject({
    action: z.literal('update'),
    place_id: Fields.shortText(120),
    label: z.string().trim().min(1).max(120).optional(),
    kind: z.enum(['visit', 'avoid']).optional(),
    category: z.string().trim().max(30).optional(),
    ...coords,
  }),
  strictObject({
    action: z.literal('delete'),
    place_id: Fields.shortText(120),
  }),
]);

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const parsed = validate(schema, await body());
  if (!parsed.ok) return err(parsed.message);
  const input = parsed.data;

  if (input.action === 'create') {
    const existing = await base44.entities.TravelerPlace.count({});
    if (existing >= MAX_PLACES) {
      return err(`You can keep up to ${MAX_PLACES} saved places. Remove one to add another.`, 422);
    }

    const lat = input.latitude;
    const lng = input.longitude;
    // A coordinate must arrive as a matched pair — half a pair is not a place.
    if ((lat == null) !== (lng == null)) return err('A saved place needs both a latitude and a longitude, or neither.');

    // User-scoped client on purpose: the platform stamps created_by_id, which is
    // what the entity's read/update/delete rules are anchored on. Service role
    // here would create a row its own owner could not read.
    const created = await base44.entities.TravelerPlace.create({
      owner_email: user!.email,
      label: input.label,
      kind: input.kind,
      category: PLACE_CATEGORIES.includes(input.category) ? input.category : 'other',
      source: input.source,
      latitude: lat ?? null,
      longitude: lng ?? null,
      address: input.address,
      notes: input.notes,
      city: input.city || '',
      country: input.country || '',
      trip_id: input.trip_id || '',
    });

    return ok({ success: true, place: created });
  }

  if (input.action === 'update') {
    const existing = await base44.entities.TravelerPlace.get(input.place_id)
      .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
    if (!existing) return err('That place is not on your list.', 404);

    const patch: Record<string, unknown> = {};
    if (input.label != null) patch.label = input.label;
    if (input.kind != null) patch.kind = input.kind;
    if (input.category != null) patch.category = PLACE_CATEGORIES.includes(input.category) ? input.category : 'other';
    if (input.address != null) patch.address = input.address;
    if (input.notes != null) patch.notes = input.notes;
    if (input.city != null) patch.city = input.city;
    if (input.country != null) patch.country = input.country;
    if (input.latitude != null) patch.latitude = input.latitude;
    if (input.longitude != null) patch.longitude = input.longitude;

    if (Object.keys(patch).length === 0) return err('Nothing to update.');

    const updated = await base44.entities.TravelerPlace.update(input.place_id, patch);
    return ok({ success: true, place: updated });
  }

  const existing = await base44.entities.TravelerPlace.get(input.place_id)
    .catch((e: any) => (e?.status === 404 ? null : Promise.reject(e)));
  if (!existing) return err('That place is not on your list.', 404);

  await base44.entities.TravelerPlace.delete(input.place_id);
  return ok({ success: true, deleted: input.place_id });
}, { name: 'saveTravelerPlace', requireAuth: true }));