import { createHandler, ok, err } from '../../shared/createHandler.ts';

// ── getGuardianStatus ─────────────────────────────────────────────────────────
// Returns the six Traveler Guardian milestone check-ins for a case and their
// current status, so the dashboard can render a milestone checklist. The
// case owner or an admin may call this.

const ADMIN_ROLES = new Set(['admin', 'platform_admin']);

const MILESTONES = [
  { type: 'landed', label: 'Landed at destination', order: 1 },
  { type: 'arrived_at_hotel', label: 'Arrived at hotel', order: 2 },
  { type: 'pre_procedure', label: 'Pre-procedure check', order: 3 },
  { type: 'post_procedure', label: 'Post-procedure check', order: 4 },
  { type: 'departure', label: 'Departure for home', order: 5 },
  { type: 'home_safe', label: 'Home safe', order: 6 },
] as const;

Deno.serve(createHandler(async ({ req, base44, user, body }) => {
    const payload = await body();
    let case_id: string | null = payload?.case_id || null;
    if (!case_id) {
      const url = new URL(req.url);
      case_id = url.searchParams.get('case_id');
    }
    if (!case_id) {
      return err('case_id is required');
    }

    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { caseRecord = null; }
    if (!caseRecord) {
      return err('Case not found', 404);
    }

    const isOwner = caseRecord.client_email && caseRecord.client_email === user.email;
    const isAdmin = ADMIN_ROLES.has(user.role || '');
    if (!isOwner && !isAdmin) {
      return err('Forbidden: not the case owner', 403);
    }

    const checkIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { case_id: caseRecord.id },
      '-scheduled_time',
      200,
    );
    const byMilestone = new Map<string, any>();
    for (const c of checkIns) {
      if (c.milestone_type && !byMilestone.has(c.milestone_type)) {
        byMilestone.set(c.milestone_type, c);
      }
    }

    const milestones = MILESTONES.map((m) => {
      const rec = byMilestone.get(m.type);
      let state = 'not_scheduled';
      if (rec) {
        if (rec.status === 'acknowledged' || rec.status === 'resolved') state = 'confirmed';
        else if (String(rec.status || '').startsWith('escalated')) state = 'escalated';
        else state = 'pending';
      }
      return {
        type: m.type,
        label: m.label,
        order: m.order,
        state,
        scheduled_time: rec?.scheduled_time || null,
        acknowledged_at: rec?.acknowledged_at || null,
        status: rec?.status || null,
      };
    });

    const confirmed = milestones.filter((m) => m.state === 'confirmed').length;
    return ok({
      success: true,
      case_id: caseRecord.id,
      active: milestones.some((m) => m.state !== 'not_scheduled'),
      confirmed_count: confirmed,
      total: MILESTONES.length,
      milestones,
    });
}, { name: 'getGuardianStatus' }));