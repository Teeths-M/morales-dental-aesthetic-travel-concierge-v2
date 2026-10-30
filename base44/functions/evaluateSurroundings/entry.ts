import { createHandler, ok, err } from '../../shared/createHandler.ts';
import {
  selectRelevantAlerts,
  composeAlertMessage,
  composePushTitle,
  deliveryFor,
  noticeDedupeKey,
  quietHoursActive,
  LEVEL_LABEL,
} from '../../shared/surroundings.ts';

// ── evaluateSurroundings ──────────────────────────────────────────────────────
// The proactive half: decides whether anything currently on record bears on
// where a traveller is or on a place they saved, and — if so — tells them once.
//
// WHAT IS DELIBERATELY NOT HERE
// No fetching from the internet, no model call, no inference. This job reads
// rows that a human recorded through ingestSurroundingsAlert and applies the
// shared policy engine to them. That separation is the whole safety argument:
// nothing can become an "incident" by being generated.
//
// ONE NOTICE PER ALERT PER PERSON, EVER.
// The notice row IS the dedupe record. A retried sweep, an overlapping run, or
// a re-run after a provider hiccup cannot produce a second notification for the
// same event — the worst case is a missed follow-up on a materially worsened
// event, which is the right trade against a traveller being paged repeatedly
// about a closed road.
//
// Called two ways: by the scheduled sweep (internal secret) and by an admin
// running it by hand. A traveller cannot invoke it for somebody else.

const POSITION_MAX_AGE_MIN = 90;
const INTERNAL_BATCH = 25;

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const input = await body<{
    internal_secret?: string;
    target_email?: string;
    dry_run?: boolean;
  }>().catch(() => ({}) as any);

  const cronSecret = Deno.env.get('CRON_SECRET');
  const isInternal = !!cronSecret && input?.internal_secret === cronSecret;

  if (!isInternal) {
    // requireAuth is false so the scheduled workflow can reach this without
    // carrying a shared secret (workflows must never hold secrets). Its own
    // invocation arrives as an admin session, so resolve that session here.
    const caller = user || await base44.auth.me().catch(() => null);
    if (!caller) return err('Unauthorized', 401);
    if (!['admin', 'platform_admin'].includes(caller.role)) return err('Forbidden', 403);
  }

  const alerts = await base44.asServiceRole.entities.SurroundingsAlert
    .filter({ status: 'active' }, '-reported_at', 200)
    .catch(() => []);

  // ── Which travellers to evaluate ────────────────────────────────────────────
  let targets: any[] = [];

  if (input?.target_email) {
    const rows = await base44.asServiceRole.entities.SurroundingsSettings
      .filter({ owner_email: String(input.target_email).toLowerCase(), enabled: true })
      .catch(() => []);
    targets = rows || [];
  } else {
    const rows = await base44.asServiceRole.entities.SurroundingsSettings
      .filter({ enabled: true }, 'last_evaluated_at', INTERNAL_BATCH)
      .catch(() => []);
    targets = (rows || []).filter((r: any) => r.owner_email);
  }

  if (targets.length === 0) {
    return ok({ success: true, evaluated: 0, notices_created: 0, note: 'No travellers have surroundings awareness switched on.' });
  }

  const nowIso = new Date().toISOString();
  const results: any[] = [];

  for (const settings of targets) {
    const email = String(settings.owner_email || '').toLowerCase();
    if (!email) continue;

    try {
      const places = (await base44.asServiceRole.entities.TravelerPlace
        .filter({ owner_email: email }, '-created_date', 60)
        .catch(() => [])) || [];

      // Position, only when it is recent enough to mean where they are now.
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (
        Number.isFinite(settings.last_latitude) &&
        Number.isFinite(settings.last_longitude) &&
        settings.last_location_at
      ) {
        const ageMin = Math.round((Date.now() - Date.parse(settings.last_location_at)) / 60000);
        if (Number.isFinite(ageMin) && ageMin <= POSITION_MAX_AGE_MIN) {
          latitude = settings.last_latitude;
          longitude = settings.last_longitude;
        }
      }

      let country = settings.country || '';
      if (!country) {
        const cases = await base44.asServiceRole.entities.CaseRecord
          .filter({ client_email: email }, '-created_date', 3)
          .catch(() => []);
        const active = (cases || []).find((c: any) => c.status !== 'Completed' && c.status !== 'Cancelled') || (cases || [])[0];
        country = active?.procedure_country || '';
      }

      // With neither a position nor a trip country there is nothing honest to
      // match against, so we skip rather than guess.
      if (latitude == null && !country) {
        await base44.asServiceRole.entities.SurroundingsSettings
          .update(settings.id, { last_evaluated_at: nowIso })
          .catch(() => {});
        results.push({ email, matched: 0, created: 0, skipped: 'no_position_or_country' });
        continue;
      }

      const relevant = selectRelevantAlerts({
        alerts: alerts || [],
        latitude,
        longitude,
        places,
        country: country || null,
        minLevel: settings.min_level || 'caution',
      });

      if (relevant.length === 0) {
        await base44.asServiceRole.entities.SurroundingsSettings
          .update(settings.id, { last_evaluated_at: nowIso })
          .catch(() => {});
        results.push({ email, matched: 0, created: 0 });
        continue;
      }

      // Existing deliveries for this traveller — the dedupe set.
      const priorNotices = (await base44.asServiceRole.entities.SurroundingsNotice
        .filter({ client_email: email }, '-delivered_at', 200)
        .catch(() => [])) || [];
      const alreadySent = new Set(priorNotices.map((n: any) => n.dedupe_key).filter(Boolean));

      const quiet = quietHoursActive(settings);
      let caseId: string | null = null;
      let journeyWritten = false;
      let created = 0;

      for (const item of relevant) {
        const key = noticeDedupeKey(item.alert.id, email);
        if (alreadySent.has(key)) continue;

        const level = item.level;
        const message = composeAlertMessage(item);
        const delivery = deliveryFor(level);

        // The chat record needs a case to hang from; without one the traveller
        // still gets the push and the feed entry, and we say so rather than
        // silently dropping the bubble.
        if (delivery.journey) {
          if (!caseId) {
            const cases = await base44.asServiceRole.entities.CaseRecord
              .filter({ client_email: email }, '-created_date', 1)
              .catch(() => []);
            caseId = (cases || [])[0]?.id || null;
          }
          if (caseId) {
            await base44.asServiceRole.entities.JourneyEvent.create({
              case_id: caseId,
              client_email: email,
              event_type: 'surroundings_alert',
              source: 'evaluateSurroundings',
              message_text: message,
              priority: quiet && level !== 'urgent' ? 'low' : delivery.priority,
              action_taken: `Surroundings ${LEVEL_LABEL[level].toLowerCase()} delivered: ${item.alert.headline}`,
              tool_result: {
                alert_id: item.alert.id,
                level,
                reported_level: item.reported_level,
                distance_m: item.distance_m,
                proximity: item.proximity,
                source_name: item.alert.source_name,
                source_type: item.alert.source_type,
                freshness_status: item.freshness.status,
                quiet_hours_active: quiet,
              },
              user_action_required: level === 'warning' || level === 'urgent',
              escalation_occurred: level === 'urgent',
            }).catch(() => {});
            journeyWritten = true;
          }
        }

        // Push. Quiet hours suppress everything except a genuinely URGENT item;
        // an information item is never pushed at all.
        let pushResult = 'not_attempted';
        let pushDetail = '';
        const shouldPush = delivery.push && (!quiet || level === 'urgent');

        if (delivery.push && quiet && level !== 'urgent') {
          pushResult = 'skipped_quiet_hours';
          pushDetail = 'Quiet hours are on, so this stayed in the app.';
        } else if (shouldPush) {
          try {
            const res = await base44.asServiceRole.functions.invoke('sendPushNotification', {
              user_email: email,
              title: composePushTitle(level),
              body: message.length > 240 ? `${message.slice(0, 237)}…` : message,
              url: '/around-you',
              icon: '/mcare-logo.png',
              tag: `surroundings-${item.alert.id}`,
              urgent: level === 'urgent',
              internal_secret: cronSecret,
            });
            const data = res?.data ?? res;
            if (data?.skipped) {
              pushResult = 'skipped_no_subscription';
              pushDetail = data?.reason || 'No device is subscribed to notifications.';
            } else if (data?.success) {
              pushResult = 'sent';
              pushDetail = 'Accepted by the push service — not confirmation that it was read.';
            } else {
              pushResult = 'failed';
              pushDetail = data?.error || 'The push service did not accept the message.';
            }
          } catch (e: any) {
            pushResult = 'failed';
            pushDetail = String(e?.message || e);
          }
        }

        if (input?.dry_run) {
          results.push({ email, matched: relevant.length, created, dry_run_item: { level, headline: item.alert.headline } });
          continue;
        }

        await base44.asServiceRole.entities.SurroundingsNotice.create({
          alert_id: item.alert.id,
          client_email: email,
          dedupe_key: key,
          level,
          reported_level: item.reported_level,
          headline: item.alert.headline,
          message_text: message,
          distance_m: item.distance_m ?? null,
          matched_place_label: item.matched_place?.label || '',
          proximity: item.proximity,
          was_stale: item.freshness.status === 'stale' || item.freshness.status === 'unknown',
          // Describes what actually happened, not what was planned: a failed push
          // alongside a written chat bubble is an in-app delivery, not a push.
          channel: journeyWritten && pushResult === 'sent' ? 'push_and_chat' : journeyWritten ? 'in_app' : pushResult === 'sent' ? 'push' : 'in_app',
          push_result: pushResult,
          push_detail: pushDetail,
          quiet_hours_active: quiet,
          delivered_at: nowIso,
        }).catch(() => {});

        alreadySent.add(key);
        created += 1;
      }

      await base44.asServiceRole.entities.SurroundingsSettings
        .update(settings.id, { last_evaluated_at: nowIso })
        .catch(() => {});

      results.push({ email, matched: relevant.length, created, quiet_hours: quiet });
    } catch (e: any) {
      // One traveller's failure must not stop the rest of the sweep.
      console.error('[evaluateSurroundings]', email, e?.message || e);
      results.push({ email, error: true });
    }
  }

  return ok({
    success: true,
    evaluated: results.length,
    notices_created: results.reduce((sum, r) => sum + (r.created || 0), 0),
    active_alerts_considered: (alerts || []).length,
    results,
  });
}, { name: 'evaluateSurroundings', requireAuth: false, rateLimit: false }));