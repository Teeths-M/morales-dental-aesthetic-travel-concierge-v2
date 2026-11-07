import { createHandler } from '../../shared/createHandler.ts';
import { checkCheckInCode, raiseDuressAlarm } from '../../shared/checkInCode.ts';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getLastAuditHash(base44) {
  try {
    const logs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
    return logs[0] ? await sha256(JSON.stringify(logs[0])) : 'GENESIS';
  } catch (_) { return 'GENESIS'; }
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const {
      case_id,
      code,
      response_method = 'app',
      location_lat, location_lng,
      accuracy_meters,
      location_source = 'gps',
      country, country_code, city, region, timezone,
    } = await body().catch(() => ({}));

    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    const now = new Date().toISOString();


    // Find the latest pending check-in for this case
    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { case_id, status: 'pending' }, '-scheduled_time', 1
    );
    // Also check escalated statuses (2h/3h) — traveler might respond late
    const escalatedCheckIns = checkIns.length === 0
      ? await base44.asServiceRole.entities.SoloCheckIn.filter(
          { case_id }, '-scheduled_time', 5
        ).then(list => list.filter(c => ['escalated_2h', 'escalated_3h', 'escalated_5h', 'escalated_9h'].includes(c.status)))
      : [];

    const checkIn = checkIns[0] || escalatedCheckIns[0];
    if (!checkIn) return Response.json({ error: 'No active check-in found' }, { status: 404 });

    // Idempotency — already acknowledged
    if (checkIn.status === 'acknowledged' || checkIn.status === 'resolved') {
      return Response.json({ success: true, check_in_id: checkIn.id, already_acknowledged: true });
    }

    // Fetch fresh state before updating to prevent race with escalation cron
    const freshCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter({ id: checkIn.id });
    const fresh = freshCheckIns[0];
    if (!fresh || fresh.status === 'acknowledged' || fresh.status === 'resolved') {
      return Response.json({ success: true, message: 'Already acknowledged' });
    }

    // Only the traveler can say they're safe (or an admin who reached them some other way). This used to accept any
    // signed-in account that knew the trip's id, which could switch off someone else's alarm.
    const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
    let ownerEmail = String(fresh.user_email || checkIn.user_email || '').trim().toLowerCase();
    if (!ownerEmail) {
      const caseRec = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
      ownerEmail = String(caseRec?.client_email || '').trim().toLowerCase();
    }
    if (!isAdmin && (!ownerEmail || ownerEmail !== String(user.email || '').trim().toLowerCase())) {
      return Response.json({ error: 'This check-in belongs to another traveler.' }, { status: 403 });
    }

    // Once the traveler has set a check-in code, the button alone no longer marks them safe, so someone holding
    // their unlocked phone can't switch the alarm off (checkInCode.ts). A wrong or locked code is no answer, and the
    // ladder carries on. A duress code gets the same success answer and silently raises an alarm.
    let duress = false;
    if (!isAdmin) {
      const codeCheck = await checkCheckInCode(base44, ownerEmail, code);
      if (codeCheck === 'missing') {
        return Response.json({ error: 'Enter your 4-digit check-in code.', code: 'CODE_REQUIRED' }, { status: 401 });
      }
      if (codeCheck === 'invalid' || codeCheck === 'locked') {
        return Response.json({ error: "That code didn't match. Check it and try again.", code: 'INVALID_CODE' }, { status: 401 });
      }
      duress = codeCheck === 'duress';
    }

    // Determine place label
    let locationLabel = null;
    if (location_lat != null && location_lng != null) {
      locationLabel = `${Number(location_lat).toFixed(4)}, ${Number(location_lng).toFixed(4)}`;
    } else if (city || country) {
      locationLabel = [city, country].filter(Boolean).join(', ');
    }

    // Log LocationBreadcrumb
    let breadcrumbId = null;
    try {
      const crumbRes = await base44.functions.invoke('logLocationBreadcrumb', {
        action: 'log',
        case_id,
        latitude: location_lat ?? null,
        longitude: location_lng ?? null,
        accuracy_meters: accuracy_meters ?? null,
        place_label: locationLabel,
        source: location_source,
        country: country ?? null,
        country_code: country_code ?? null,
        city: city ?? null,
        region: region ?? null,
        timezone: timezone ?? null,
      });
      breadcrumbId = crumbRes?.data?.crumb_id ?? null;
    } catch (_) {}

    // Mark acknowledged — atomic write before any side effects
    await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
      responded_time: now,
      response_method,
      location_lat: location_lat ?? null,
      location_lng: location_lng ?? null,
      location_accuracy_meters: accuracy_meters ?? null,
      location_label: locationLabel,
      location_source,
      location_breadcrumb_id: breadcrumbId,
      status: 'acknowledged',
      acknowledged_at: now,
    });
    if (duress) await raiseDuressAlarm(base44, { checkIn: fresh, channel: 'in_app', now });

    // Audit log
    const prevHash = await getLastAuditHash(base44);
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'handshake_completed',
      actor_id: user.id,
      actor_role: user.role,
      actor_name: user.full_name,
      resource_type: 'SoloCheckIn',
      resource_id: checkIn.id,
      resource_name: `Solo check-in round ${checkIn.check_in_round}`,
      case_id,
      details: {
        action: 'solo_checkin_acknowledged',
        response_method,
        location_source,
        has_gps: location_lat != null,
        breadcrumb_id: breadcrumbId,
      },
      sensitive: false,
      timestamp: now,
      prev_hash: prevHash,
    });

    return Response.json({ success: true, check_in_id: checkIn.id, breadcrumb_id: breadcrumbId });
}, { name: 'acknowledgeSoloCheckIn' }));
