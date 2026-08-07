import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let case_id: string | null = null;
    try {
      const body = await req.json();
      case_id = body?.case_id || null;
    } catch (_) {
      const url = new URL(req.url);
      case_id = url.searchParams.get('case_id');
    }
    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { caseRecord = null; }
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const isOwner = caseRecord.client_email && caseRecord.client_email === user.email;
    const isAdmin = ADMIN_ROLES.has(user.role || '');
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: not the case owner' }, { status: 403 });
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
    return Response.json({
      success: true,
      case_id: caseRecord.id,
      active: milestones.some((m) => m.state !== 'not_scheduled'),
      confirmed_count: confirmed,
      total: MILESTONES.length,
      milestones,
    });
  } catch (error) {
    console.error('[getGuardianStatus]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});