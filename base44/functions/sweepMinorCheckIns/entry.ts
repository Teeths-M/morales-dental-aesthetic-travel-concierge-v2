import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { cronAuthorized } from '../../shared/cronAuth.ts';
import { isMinorReunificationEnabled } from '../../shared/featureFlags.ts';
import { isCheckInOverdue } from '../../shared/minorReunification.ts';
import { openAndNotify } from '../../shared/minorReunificationEngine.ts';

/**
 * sweepMinorCheckIns — trigger (c): a missed scheduled check-in.
 *
 * Deterministic and narrow. For each enrolled minor whose check-in window has
 * actually elapsed, it opens a case (or attaches to the one already open) and
 * lets the normal fanout run. It does nothing else: it cannot advance a state,
 * cannot close a case, and cannot decide a minor is fine.
 *
 * The trigger's `occurred_at` is the moment the check-in BECAME overdue, not
 * the moment this sweep happened to run. That distinction is the difference
 * between "we noticed twenty minutes late" and "the alarm fired on time and we
 * noticed twenty minutes late" — the response time must stay honest either way.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!(await cronAuthorized(req, base44))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await isMinorReunificationEnabled(base44))) {
      return Response.json({ skipped: true, reason: 'module_disabled', opened: 0 });
    }

    const now = new Date().toISOString();

    const minors = await base44.asServiceRole.entities.MinorTraveller
      .filter({ checkin_active: true }, 'next_checkin_due_at', 200)
      .catch(() => []);

    const opened: any[] = [];
    const attached: any[] = [];
    const failed: any[] = [];

    for (const minor of (Array.isArray(minors) ? minors : [])) {
      if (minor.is_active === false) continue;
      if (!isCheckInOverdue(minor, now)) continue;

      try {
        const result = await openAndNotify(base44, {
          minor,
          trigger_source: 'missed_checkin',
          // The honest moment: when the check-in was due, not when we noticed.
          occurred_at: new Date(minor.next_checkin_due_at).toISOString(),
          occurred_at_source: 'client',
          actor_type: 'system',
          actor_id: 'checkin_sweep',
          evidence: {
            next_checkin_due_at: minor.next_checkin_due_at,
            last_checkin_at: minor.last_checkin_at || null,
            swept_at: now,
            interval_minutes: minor.checkin_interval_minutes || 60,
          },
        });

        if (result.attached) {
          attached.push({
            minor_id: minor.id,
            case_id: result.caseRow.id,
            replayed: result.replayed,
          });
        } else {
          opened.push({
            minor_id: minor.id,
            case_id: result.caseRow.id,
            state: result.caseRow.state,
            notifications: result.notifications.length,
          });
        }
      } catch (error: any) {
        console.error('[sweepMinorCheckIns] failed for minor', minor.id, error);
        failed.push({ minor_id: minor.id, error: String(error?.message || error).slice(0, 200) });
      }
    }

    return Response.json({
      swept_at: now,
      checked: Array.isArray(minors) ? minors.length : 0,
      opened: opened.length,
      attached: attached.length,
      failed: failed.length,
      opened_cases: opened,
      attached_to: attached,
      failures: failed,
    });
  } catch (error) {
    console.error('[sweepMinorCheckIns]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});