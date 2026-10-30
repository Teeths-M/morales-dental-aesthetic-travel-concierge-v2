import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { z, strictObject, validate } from '../../shared/validate.ts';
import {
  selectRelevantAlerts,
  composeAlertMessage,
  categoryLabel,
  sourceLabel,
  verificationLabel,
  quietHoursActive,
  LEVEL_LABEL,
  LEVEL_MEANING,
  LEVEL_COLOR,
  LEVEL_RANK,
  distanceLabel,
  describeAge,
} from '../../shared/surroundings.ts';

// ── getSurroundings ───────────────────────────────────────────────────────────
// The read side of "Around You": what M-Care currently knows that bears on
// where this traveller is or on a place they saved.
//
// WHAT IT REFUSES TO DO
// - Invent: with no active alert records it returns an empty feed and says so.
//   It never manufactures a "nothing unusual nearby" assurance, because we have
//   no source that could support that claim.
// - Overstate: every item carries its source, when it was reported, when it was
//   last checked, and whether the level shown is lower than the source claimed.
// - Reach beyond permission: it only uses a stored position when the layer is
//   switched on, and it reports whether that position is precise or approximate.

const schema = strictObject({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_source: z.enum(['gps', 'approximate']).optional(),
});

// A stored point older than this is not where someone is standing any more.
const POSITION_MAX_AGE_MIN = 90;

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const parsed = validate(schema, await body().catch(() => ({})));
  if (!parsed.ok) return err(parsed.message);
  const input = parsed.data;

  const settings = (await base44.entities.SurroundingsSettings.filter({ owner_email: user!.email }))?.[0] || null;
  const places = (await base44.entities.TravelerPlace.filter({ owner_email: user!.email }, '-created_date', 60)) || [];
  const notices = (await base44.entities.SurroundingsNotice.filter({ client_email: user!.email }, '-delivered_at', 20)) || [];

  // Position: a freshly-supplied one wins; otherwise the stored point, but only
  // when the traveller has the layer on and it is still recent enough to mean
  // something.
  let latitude: number | null = null;
  let longitude: number | null = null;
  let locationSource: string = 'none';
  let locationAgeMinutes: number | null = null;

  if (input.latitude != null && input.longitude != null) {
    latitude = input.latitude;
    longitude = input.longitude;
    locationSource = input.location_source || 'gps';
  } else if (
    settings?.enabled === true &&
    Number.isFinite(settings.last_latitude) &&
    Number.isFinite(settings.last_longitude) &&
    settings.last_location_at
  ) {
    const age = Math.round((Date.now() - Date.parse(settings.last_location_at)) / 60000);
    if (Number.isFinite(age) && age <= POSITION_MAX_AGE_MIN) {
      latitude = settings.last_latitude;
      longitude = settings.last_longitude;
      locationSource = settings.last_location_source || 'gps';
      locationAgeMinutes = age;
    }
  }

  // Trip country is a fallback context only, never a locator.
  let country = settings?.country || '';
  if (!country) {
    const cases = await base44.asServiceRole.entities.CaseRecord
      .filter({ client_email: user!.email }, '-created_date', 3)
      .catch(() => []);
    const active = (cases || []).find((c: any) => c.status !== 'Completed' && c.status !== 'Cancelled') || (cases || [])[0];
    country = active?.procedure_country || '';
  }

  const alerts = await base44.asServiceRole.entities.SurroundingsAlert
    .filter({ status: 'active' }, '-reported_at', 200)
    .catch(() => []);

  const relevant = selectRelevantAlerts({
    alerts: alerts || [],
    latitude,
    longitude,
    places,
    country: country || null,
    minLevel: 'information',
  });

  const quiet = quietHoursActive(settings);

  const feed = relevant.map((item) => ({
    id: item.alert.id,
    level: item.level,
    level_label: LEVEL_LABEL[item.level],
    level_meaning: LEVEL_MEANING[item.level],
    level_color: LEVEL_COLOR[item.level],
    reported_level: item.reported_level,
    reported_level_label: LEVEL_LABEL[item.reported_level],
    downgraded: item.level !== item.reported_level,
    level_reasons: item.level_reasons,
    headline: item.alert.headline,
    detail: item.alert.detail || '',
    category: item.alert.category,
    category_label: categoryLabel(item.alert.category),
    source_name: item.alert.source_name,
    source_url: item.alert.source_url || '',
    source_label: sourceLabel(item.alert.source_type),
    verification_label: verificationLabel(item.alert.source_type, item.alert.independently_confirmed === true),
    source_verified: item.source_verified,
    area_label: item.alert.area_label || '',
    country: item.alert.country || '',
    reported_at: item.alert.reported_at,
    reported_age_label: describeAge(
      item.alert.reported_at ? Math.max(0, Math.round((Date.now() - Date.parse(item.alert.reported_at)) / 60000)) : null,
    ),
    last_checked_at: item.alert.last_checked_at,
    freshness_status: item.freshness.status,
    freshness_label: item.freshness.label,
    distance_m: item.distance_m,
    distance_label: item.distance_label || distanceLabel(item.distance_m),
    proximity: item.proximity,
    matched_place: item.matched_place,
    suggested_action: item.alert.suggested_action || '',
    message: composeAlertMessage(item),
  }));

  // A single honest headline for the surface: the highest level currently
  // relevant, or null when there is nothing to say.
  const attention = feed.reduce(
    (best: string | null, item: any) => (best == null || LEVEL_RANK[item.level] > LEVEL_RANK[best] ? item.level : best),
    null as string | null,
  );

  return ok({
    settings: settings
      ? {
          enabled: settings.enabled === true,
          min_level: settings.min_level || 'caution',
          quiet_hours_enabled: settings.quiet_hours_enabled !== false,
          quiet_hours_start: settings.quiet_hours_start || '22:00',
          quiet_hours_end: settings.quiet_hours_end || '07:00',
          quiet_hours_timezone: settings.quiet_hours_timezone || '',
          country: settings.country || '',
          last_evaluated_at: settings.last_evaluated_at || null,
        }
      : {
          enabled: false,
          min_level: 'caution',
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          quiet_hours_timezone: '',
          country: '',
          last_evaluated_at: null,
        },
    places,
    notices,
    feed,
    meta: {
      location_source: locationSource,
      location_age_minutes: locationAgeMinutes,
      location_precise: locationSource === 'gps',
      country: country || null,
      quiet_hours_active: quiet,
      attention_level: attention,
      considered_alerts: (alerts || []).length,
      matched_alerts: feed.length,
      // Named so the client can say the truth instead of implying live coverage.
      coverage_note:
        (alerts || []).length === 0
          ? 'No monitored advisories are on record right now. That is not a statement that the area is safe — it means nothing has been recorded from a source.'
          : 'Only advisories recorded from a named source are shown. Distance is measured to a point, not along a route.',
      evaluated_at: new Date().toISOString(),
    },
  });
}, { name: 'getSurroundings', requireAuth: true }));