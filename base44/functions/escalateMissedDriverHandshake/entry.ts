import { createHandler } from '../../shared/createHandler.ts';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { findDriverBackup } from '../../shared/findDriverBackup.ts';

// ── escalateMissedDriverHandshake — cron/scheduled function ──────────────────
// Runs every 15 minutes via GitHub Actions, not Base44's own scheduler — see
// .github/workflows/safety-cron.yml, which is the actual, verified trigger.
//
// REWRITTEN 2026-08-04: the previous version watched OfflineHandshake rows
// with handshake_role:'driver' — but nothing in the live app ever created
// those (their only producer, confirmHandshake, has zero callers anywhere).
// The real, live journey system is the 9-step handshake in
// completeHandshake/entry.ts, driven entirely by the PATIENT tapping
// "confirm" in the app — there was never any independent driver-side signal
// or timeout for it. This version checks TravelRequest directly: if the next
// expected handshake step needs a driver (1, 3, 5, 7, or 9) and enough time
// has passed with no confirmation, it dispatches a backup driver for real.
//
// Anchor for "how long is too long":
//   Step 1 (origin pickup, home->airport): scheduled_departure minus a lead
//     window — the earliest real time signal available. Skipped entirely if
//     no flight is on file yet (degrades gracefully, doesn't guess).
//   Steps 3/5/7/9: time since the PRECEDING step was confirmed — always
//     available once that step is "next," same anchor pattern already used
//     by completeHandshake's own HS4/HS5 dual-signal timeout.
//
// Schedule: */15 * * * *  (.github/workflows/safety-cron.yml)

const DRIVER_STEPS = new Set([1, 3, 5, 7, 9]);
const NOSHOW_MINUTES = 30;      // reasonable "your ride is late" window before paging a backup
const PICKUP_LEAD_HOURS = 3;    // HS1 only: driver expected roughly this far ahead of wheels-up

// Outbound SMS (Twilio) — inline, matching every other function in this
// codebase (see the original version of this file / findDoctorBackup.ts)
// rather than a shared module: shared SMS modules have caused issues in
// Base44 per that established convention.
async function sendSms(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'twilio_not_configured' };
  }
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: message });
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const result = await resp.json().catch(() => ({}));
    return resp.ok ? { ok: true, sid: result.sid } : { ok: false, error: result.message || 'twilio_error' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function legForStep(n: number): 'origin' | 'destination' {
  return (n === 1 || n === 9) ? 'origin' : 'destination';
}

Deno.serve(createHandler(async ({ req, base44 }) => {
  // cronAuthorized proves the caller: cron secret, or admin session. Fails
  // closed when CRON_SECRET is unset. This endpoint sends real Twilio SMS
  // and dispatches real backup drivers, so it must never be reachable by
  // an anonymous caller with just the URL.
  if (!(await cronAuthorized(req, base44))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = Date.now();

  // Trips that are actually paid/confirmed and in flight — draft/quote-stage
  // requests never have a driver assigned yet, so scanning them is wasted work.
  const trips = await base44.asServiceRole.entities.TravelRequest.filter(
    { package_status: 'confirmed' }, '-updated_at', 200
  ).catch(() => []);

  const results: Record<string, unknown>[] = [];

  for (const trip of trips as any[]) {
    if (trip.paused) continue;                       // patient/admin already handling this manually
    const currentStep = trip.current_step ?? 0;
    if (currentStep >= 9) continue;                   // journey already complete

    const n = currentStep + 1;
    if (!DRIVER_STEPS.has(n)) continue;                // next step doesn't need a driver to show up

    const flagged: number[] = trip.noshow_flagged_steps || [];
    if (flagged.includes(n)) continue;                 // already dispatched a backup for this step

    let anchor: number | null = null;
    if (n === 1) {
      if (!trip.scheduled_departure) continue;          // no flight synced yet — degrade gracefully, don't guess
      anchor = new Date(trip.scheduled_departure).getTime() - PICKUP_LEAD_HOURS * 3600_000;
    } else {
      const prevTs = trip.handshake_timestamps?.[String(n - 1)];
      if (!prevTs) continue;                            // shouldn't happen if n === currentStep+1, but guard anyway
      anchor = new Date(prevTs).getTime();
    }

    if (Number.isNaN(anchor) || now - anchor < NOSHOW_MINUTES * 60_000) continue; // not overdue yet

    if (!trip.case_id) {
      results.push({ trip_id: trip.id, step: n, action: 'skipped_no_case_id' });
      continue;
    }

    const cases = await base44.asServiceRole.entities.CaseRecord.filter({ id: trip.case_id }).catch(() => []);
    const caseRecord = (cases as any[])?.[0];
    if (!caseRecord) {
      results.push({ trip_id: trip.id, step: n, action: 'skipped_case_not_found' });
      continue;
    }

    const leg = legForStep(n);
    const excludeId = leg === 'origin' ? caseRecord.origin_driver_id : caseRecord.destination_driver_id;

    const backupResult = await findDriverBackup(base44, caseRecord, leg, excludeId, 'no_show')
      .catch(() => ({ success: false }));

    if (trip.user_phone) {
      const msg = backupResult.success
        ? "Your ride is running behind — we've already dispatched a backup driver. Check your app for the update."
        : "Your ride is running behind and we're finding you a replacement right now — hang tight, we'll update you shortly.";
      await sendSms(trip.user_phone, msg).catch(() => {});
    }

    await base44.asServiceRole.entities.TravelRequest.update(trip.id, {
      noshow_flagged_steps: [...flagged, n],
    }).catch(() => {});

    results.push({
      trip_id: trip.id,
      case_id: trip.case_id,
      step: n,
      leg,
      backup_dispatched: backupResult.success,
    });
  }

  return Response.json({ success: true, checked: trips.length, escalations: results });
// Cron-only: cronAuthorized/CRON_SECRET is the real gate — rate-limiting the
// scheduler itself would risk throttling legitimate runs.
}, { name: 'escalateMissedDriverHandshake', requireAuth: false, rateLimit: false }));
