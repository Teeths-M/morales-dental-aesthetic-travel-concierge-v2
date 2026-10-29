import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { logJourneyEvent } from '../../shared/logJourneyEvent.ts';

/**
 * synthesizeProactiveBrief — M-Care's proactive layer.
 *
 * The gap this closes: every existing automation in this app watches ONE
 * thing (departure milestones, post-op days, solo check-ins, SLA breaches).
 * None of them ever looks ACROSS those systems, so nobody notices the
 * compound situations — "you fly in 2 days and your transfer is still
 * unconfirmed", "your day-7 recovery check-in has been open for 3 days",
 * "your case hasn't moved in 9 days". Those are exactly the moments a
 * coordinator would speak up unprompted, and they were invisible.
 *
 * This function reads the whole case at once, ranks what it finds, and says
 * the SINGLE most important thing — or nothing at all.
 *
 * ── Silence is the feature ──────────────────────────────────────────────────
 * It is designed to stay quiet far more often than it speaks:
 *   • one brief per case per run, chosen from the highest-scoring signal
 *   • nothing at all when no signal clears the bar (reported as `silent`)
 *   • the same signal never re-fires (deduped by a stable `brief_key`)
 *   • a 6-hour quiet window after any non-urgent brief
 * A Jarvis that pings you is just a notification feed. This one has to earn
 * every interruption.
 *
 * ── Why the copy is deterministic ───────────────────────────────────────────
 * message_text is built here from values this run actually read — never an
 * LLM. That is logJourneyEvent's documented contract, and it matters more
 * here than anywhere: a synthesized sentence that overstates what the
 * platform knows ("your transfer is booked") would be a safety claim nobody
 * made. Every sentence is assembled from confirmed entity fields.
 *
 * Auth: cron secret OR admin session (shared/cronAuth.ts), same guard as
 * every other scheduled function in this app.
 */

// ── Tuning ────────────────────────────────────────────────────────────────────
const CHECKIN_LEAD_MS = 90 * 60 * 1000;      // speak up 90 min before a check-in
const POSTOP_OVERDUE_MS = 24 * 60 * 60 * 1000; // >24h late counts as a real gap
const QUIET_WINDOW_MS = 6 * 60 * 60 * 1000;  // at most one non-urgent brief / 6h
const STALL_DAYS = 7;                        // idle this long is worth naming
// Past this, the case is not "waiting" — it is dormant, and that is an admin
// problem, not something to keep mentioning to the patient. The first test
// run surfaced 128–150-day-old cases; without a ceiling a weekly key would
// have messaged those people roughly twenty more times each.
const STALL_CEILING_DAYS = 60;
const PREDEPARTURE_WINDOW_DAYS = 3;
const MAX_CASES_PER_RUN = 60;

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Signal {
  key: string;
  score: number;
  priority: Priority;
  message: string;
  action: string;
  userActionRequired: boolean;
  facts: Record<string, unknown>;
}

// Cases still being actively worked — excludes Completed, and the later
// filter drops cancelled/GDPR-erased records.
const LIVE_STATUSES = new Set([
  'Submitted', 'Safe-T-Reviewed', 'Doctor-Pending', 'Vendor-Pending',
  'Admin-Review', 'Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid',
  'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress',
  'SURGICAL_EXECUTION_WINDOW', 'RECOVERY_PHASE_7_DAY', 'Recovery',
  'waiver_refused', 'companion_required_pending', 'companion_required_waived',
]);

// Where M-Care is genuinely the one holding the ball — so "nothing has
// moved" is a fair thing to say. Deliberately excludes Submitted (that's the
// patient's own unfinished intake) and Recovery (other systems own it).
const PLANNING_STATUSES = new Set([
  'Safe-T-Reviewed', 'Doctor-Pending', 'Vendor-Pending', 'Admin-Review',
  'Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid', 'Travel-Coordination',
]);

// Only these stages can realistically still be pre-departure, so a stale
// departure_date on a finished case can never produce a "you fly tomorrow".
const PREDEPARTURE_STATUSES = new Set(['Deposit-Paid', 'Travel-Coordination', 'Ready-For-Travel']);

const STATUS_LABEL: Record<string, string> = {
  'Safe-T-Reviewed': 'past your safety review',
  'Doctor-Pending': 'waiting on your doctor',
  'Vendor-Pending': 'waiting on your travel partners',
  'Admin-Review': 'in our review queue',
  'Proposal-Sent': 'waiting on your decision on the proposal',
  'PMP-25': 'waiting on your 25% payment step',
  'PMP-50': 'waiting on your 50% payment step',
  'Deposit-Paid': 'past your deposit and in coordination',
  'Travel-Coordination': 'in travel coordination',
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function groupBy(rows: any[], field: string): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const r of rows || []) {
    const k = r?.[field];
    if (!k) continue;
    (out[k] ||= []).push(r);
  }
  return out;
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const day = String(dateStr).slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`).getTime();
  if (!Number.isFinite(parsed)) return null;
  const n = new Date();
  const todayUTC = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((parsed - todayUTC) / 86_400_000);
}

function whenPhrase(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// Relative, never a clock time — the traveler may be in any timezone and a
// wrong "at 14:30" is worse than no time at all.
function inPhrase(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins <= 5) return 'in a few minutes';
  if (mins < 60) return `in about ${Math.max(10, Math.round(mins / 10) * 10)} minutes`;
  return 'in about an hour';
}

function listPhrase(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ── Signals ───────────────────────────────────────────────────────────────────

/**
 * A safety check-in about to fall due. Not the escalation (escalateSoloCheckIn
 * already owns that ladder) — this is the calm nudge BEFORE it, which nothing
 * was sending.
 */
function checkInDue(ctx: { now: number; checkIns: any[] }, caseId: string): Signal | null {
  for (const ci of ctx.checkIns) {
    if (ci.case_id !== caseId) continue;
    if (ci.is_paused_medical) continue;
    if (!ci.scheduled_time) continue;
    const at = new Date(ci.scheduled_time).getTime();
    if (!Number.isFinite(at)) continue;
    const msAway = at - ctx.now;
    if (msAway <= 0 || msAway > CHECKIN_LEAD_MS) continue;

    return {
      key: `checkin_due:${ci.id}`,
      score: 100,
      priority: 'medium',
      message: `Your safety check-in comes up ${inPhrase(msAway)}. Tap below when you're somewhere safe — if I don't hear from you, I'll follow the check-in procedure we agreed on.`,
      action: 'Surfaced an upcoming safety check-in before it fell due',
      userActionRequired: true,
      facts: { check_in_id: ci.id, due_at: ci.scheduled_time },
    };
  }
  return null;
}

/**
 * A recovery check-in that has sat open for more than a day. sendDuePostOpCheckIns
 * sends the ones that just came due; nobody chased the ones that were missed,
 * which is precisely when a quiet complication can go unmentioned.
 */
function postOpOverdue(ctx: { now: number; postOp: any[] }, caseId: string): Signal | null {
  for (const po of ctx.postOp) {
    if (po.case_id !== caseId) continue;
    if (!po.scheduled_at) continue;
    const at = new Date(po.scheduled_at).getTime();
    if (!Number.isFinite(at)) continue;
    const overdueMs = ctx.now - at;
    if (overdueMs < POSTOP_OVERDUE_MS) continue;

    const daysLate = Math.floor(overdueMs / 86_400_000);
    const duePhrase = daysLate <= 1 ? 'yesterday' : `${daysLate} days ago`;

    return {
      key: `postop_overdue:${po.id}`,
      score: 80,
      priority: 'medium',
      message: `Your day-${po.day} recovery check-in is still open — it was due ${duePhrase}. It takes under a minute, and it's how I catch a problem while it's still small.`,
      action: `Surfaced a day-${po.day} recovery check-in left open ${daysLate} day(s)`,
      userActionRequired: true,
      facts: { post_op_check_in_id: po.id, day: po.day, days_late: daysLate },
    };
  }
  return null;
}

/**
 * The compound one — cross-references itinerary, transfer, doctor confirmation
 * and payment against an imminent departure date. No single existing
 * automation could see this, because each only owns one of those fields.
 */
function predepartureGap(c: any): Signal | null {
  if (!PREDEPARTURE_STATUSES.has(c.status)) return null;

  const days = daysUntil(c.departure_date);
  if (days === null || days < 0 || days > PREDEPARTURE_WINDOW_DAYS) return null;

  const open: string[] = [];
  if (c.itinerary_status !== 'CONFIRMED') open.push('your flights');
  if (c.transfer_status !== 'CONFIRMED') open.push('your airport transfer');
  if (c.booking_type !== 'travel_only'
    && !['CONFIRMED', 'Confirmed'].includes(c.doctor_confirmation_status)) {
    open.push("your doctor's confirmation");
  }
  if (!['Paid In Full', '50% Paid', '25% Paid'].includes(c.payment_status)) {
    open.push('your remaining balance');
  }

  if (open.length === 0) return null;

  const pronoun = open.length === 1 ? 'it' : 'them';
  const urgent = days <= 1;

  return {
    key: `predeparture:${String(c.departure_date).slice(0, 10)}:${days}`,
    score: urgent ? 90 : 70,
    priority: urgent ? 'high' : 'medium',
    message: `You fly ${whenPhrase(days)}. Still open: ${listPhrase(open)}. I'd rather close ${pronoun} now than at the airport — want me to chase ${pronoun}?`,
    action: `Flagged ${open.length} open pre-departure item(s) ${days} day(s) before departure`,
    userActionRequired: true,
    facts: { days_to_departure: days, open_items: open },
  };
}

/** A case nobody has touched in over a week, while it is genuinely ours to move. */
function stalledCase(c: any, now: number): Signal | null {
  if (!PLANNING_STATUSES.has(c.status)) return null;

  const updated = new Date(c.updated_date).getTime();
  if (!Number.isFinite(updated)) return null;

  const days = Math.floor((now - updated) / 86_400_000);
  if (days < STALL_DAYS || days > STALL_CEILING_DAYS) return null;

  const label = STATUS_LABEL[c.status] || c.status.toLowerCase().replace(/-/g, ' ');

  return {
    // Month-bucketed, so a case can be named at most twice (day 7-29, then
    // day 30-60) rather than once a week.
    key: `stalled:${c.status}:${Math.floor(days / 30)}`,
    score: 30,
    priority: 'low',
    message: `Nothing has moved on your case in ${days} days — it's ${label}. Nothing is broken; it's just waiting. Want me to chase it?`,
    action: `Flagged a case idle ${days} day(s) at stage ${c.status}`,
    userActionRequired: true,
    facts: { days_idle: days, stage: c.status },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();

    // Four queries for the whole run, not four per case — every pending record
    // is grouped by case in memory. The case list is deliberately NOT caught:
    // a failure there should surface as a real 500 in the run history rather
    // than a cheerful "0 cases checked".
    const cases = await base44.asServiceRole.entities.CaseRecord.list('-updated_date', 200);

    const [pendingCheckIns, pendingPostOp, recentBriefs] = await Promise.all([
      base44.asServiceRole.entities.SoloCheckIn
        .filter({ status: 'pending' }, 'scheduled_time', 200).catch(() => []),
      base44.asServiceRole.entities.PostOpCheckIn
        .filter({ status: 'pending' }, 'scheduled_at', 200).catch(() => []),
      base44.asServiceRole.entities.JourneyEvent
        .filter({ event_type: 'proactive_brief' }, '-created_date', 200).catch(() => []),
    ]);

    const checkInsByCase = groupBy(pendingCheckIns as any[], 'case_id');
    const postOpByCase = groupBy(pendingPostOp as any[], 'case_id');
    const briefsByCase = groupBy(recentBriefs as any[], 'case_id');

    const eligible = (cases as any[]).filter(c =>
      c.client_email
      && !c.cancelled_at
      && !c.gdpr_deleted_at
      && LIVE_STATUSES.has(c.status)
    ).slice(0, MAX_CASES_PER_RUN);

    const sent: Array<{ case_id: string; signal: string; priority: Priority }> = [];
    let silent = 0;

    for (const c of eligible) {
      const ctx = {
        now,
        checkIns: checkInsByCase[c.id] || [],
        postOp: postOpByCase[c.id] || [],
      };

      const signals = [
        checkInDue(ctx, c.id),
        postOpOverdue(ctx, c.id),
        predepartureGap(c),
        stalledCase(c, now),
      ].filter(Boolean) as Signal[];

      // Nothing worth interrupting for — the common, correct outcome.
      if (signals.length === 0) { silent++; continue; }

      signals.sort((a, b) => b.score - a.score);
      const best = signals[0];
      const history = briefsByCase[c.id] || [];

      // This exact signal has already been said.
      if (history.some((e: any) => e?.tool_result?.brief_key === best.key)) { silent++; continue; }

      // Recently spoke about something else here — hold unless it's urgent.
      const spokeRecently = history.some((e: any) =>
        now - new Date(e.created_date).getTime() < QUIET_WINDOW_MS);
      if (spokeRecently && best.priority !== 'high' && best.priority !== 'critical') {
        silent++;
        continue;
      }

      await logJourneyEvent(base44, {
        case_id: c.id,
        client_email: c.client_email,
        event_type: 'proactive_brief',
        source: 'synthesizeProactiveBrief',
        message_text: best.message,
        priority: best.priority,
        action_taken: best.action,
        tool_result: {
          brief_key: best.key,
          signal: best.key.split(':')[0],
          score: best.score,
          ...best.facts,
        },
        user_action_required: best.userActionRequired,
      });

      sent.push({ case_id: c.id, signal: best.key.split(':')[0], priority: best.priority });
    }

    return Response.json({
      success: true,
      cases_checked: eligible.length,
      briefs_sent: sent.length,
      silent_cases: silent,
      sent,
    });
  } catch (error) {
    console.error('[synthesizeProactiveBrief]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});