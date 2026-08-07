import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── activateTravelerGuardian ──────────────────────────────────────────────────
// Turns on "Traveler Guardian" mode for a case: schedules the six milestone
// check-ins M-Care watches over a journey — landed, arrived at hotel,
// pre-procedure, post-procedure, departure, home safe. Reuses SoloCheckIn
// records tagged with milestone_type so the existing monitoring/escalation
// ladder applies. Idempotent — re-activating only fills milestones that don't
// exist yet, never duplicates.
//
// Authorization: the case owner (client_email == caller email) or an admin.
// Dates drive scheduling; a milestone whose required date is missing on the
// case is created in a "pending_date" note rather than silently skipped, so
// the traveler knows it will be scheduled once the date is known.

const ADMIN_ROLES = new Set(['admin', 'platform_admin']);

type MilestoneType =
  | 'landed'
  | 'arrived_at_hotel'
  | 'pre_procedure'
  | 'post_procedure'
  | 'departure'
  | 'home_safe';

const MILESTONE_LABELS: Record<MilestoneType, string> = {
  landed: 'Landed at destination',
  arrived_at_hotel: 'Arrived at hotel',
  pre_procedure: 'Pre-procedure check',
  post_procedure: 'Post-procedure check',
  departure: 'Departure for home',
  home_safe: 'Home safe',
};

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}
function atTime(d: Date, h: number, m = 0): Date {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}
function addMs(d: Date, ms: number): Date { return new Date(d.getTime() + ms); }
function addDays(d: Date, days: number): Date { return addMs(d, days * 86400000); }
const H = (n: number) => n * 3600000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { case_id } = await req.json();
    if (!case_id) {
      return Response.json({ error: 'case_id is required' }, { status: 400 });
    }

    let caseRecord: any = null;
    try {
      caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    } catch (_) { caseRecord = null; }
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Authorization: case owner or admin.
    const isOwner = caseRecord.client_email && caseRecord.client_email === user.email;
    const isAdmin = ADMIN_ROLES.has(user.role || '');
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden: not the case owner' }, { status: 403 });
    }

    // Existing milestone check-ins for this case (idempotency).
    const existing = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { case_id: caseRecord.id },
      '-scheduled_time',
      200,
    );
    const existingTypes = new Set(existing.filter((c: any) => c.milestone_type).map((c: any) => c.milestone_type));

    const departureDate = toDate(caseRecord.departure_date);
    const procedureDate = toDate(caseRecord.procedure_date);
    const recoveryDays = (caseRecord.recovery_days && caseRecord.recovery_days > 0) ? caseRecord.recovery_days : 5;
    const procedureHours = (caseRecord.treatment_duration && caseRecord.treatment_duration > 0) ? caseRecord.treatment_duration : 4;

    // Compute each milestone's scheduled time, guarding missing dates.
    const planned: { type: MilestoneType; at: Date | null; note: string }[] = [];
    planned.push({
      type: 'landed',
      at: departureDate ? atTime(departureDate, 14, 0) : null,
      note: departureDate ? '' : 'Pending departure date',
    });
    const landed = planned[0].at ? addMs(planned[0].at as Date, H(2)) : null;
    planned.push({
      type: 'arrived_at_hotel',
      at: landed,
      note: landed ? '' : 'Pending departure date',
    });
    planned.push({
      type: 'pre_procedure',
      at: procedureDate ? atTime(addDays(procedureDate, 0), 8, 0) : null,
      note: procedureDate ? '' : 'Pending procedure date',
    });
    const postOp = procedureDate ? addMs(procedureDate, H(procedureHours)) : null;
    planned.push({
      type: 'post_procedure',
      at: postOp,
      note: postOp ? '' : 'Pending procedure date',
    });
    const depart = postOp ? atTime(addDays(postOp, recoveryDays), 10, 0) : null;
    planned.push({
      type: 'departure',
      at: depart,
      note: depart ? '' : 'Pending procedure date',
    });
    const home = depart ? addMs(depart, H(4)) : null;
    planned.push({
      type: 'home_safe',
      at: home,
      note: home ? '' : 'Pending procedure date',
    });

    const now = new Date();
    const created: any[] = [];

    for (const p of planned) {
      if (existingTypes.has(p.type)) continue;
      const record: any = {
        case_id: caseRecord.id,
        trip_id: caseRecord.id,
        user_id: caseRecord.created_by_id || user.id,
        user_email: caseRecord.client_email,
        user_name: caseRecord.client_name,
        user_phone: caseRecord.client_phone || '',
        milestone_type: p.type,
        check_in_round: 0,
        status: 'pending',
        is_paused_medical: false,
        created_at: now.toISOString(),
        escalation_status: p.note || 'Guardian milestone scheduled',
      };
      if (p.at) record.scheduled_time = p.at.toISOString();
      else {
        // No date yet: schedule far enough out that the cron won't fire it; it
        // will be re-scheduled when the date is set. Mark status pending.
        record.scheduled_time = addDays(now, 365).toISOString();
      }
      try {
        const created_rec = await base44.entities.SoloCheckIn.create(record);
        created.push({ milestone_type: p.type, label: MILESTONE_LABELS[p.type], scheduled_time: record.scheduled_time, id: created_rec.id, note: p.note });
      } catch (_) {
        // If user-scope create fails (e.g. partner/admin caller), fall back to service role.
        const created_rec = await base44.asServiceRole.entities.SoloCheckIn.create(record);
        created.push({ milestone_type: p.type, label: MILESTONE_LABELS[p.type], scheduled_time: record.scheduled_time, id: created_rec.id, note: p.note });
      }
    }

    // Audit log the activation.
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'handshake_created',
        actor_id: user.id,
        actor_role: user.role || 'user',
        actor_email: user.email,
        resource_type: 'CaseRecord',
        resource_id: caseRecord.id,
        case_id: caseRecord.id,
        details: { action: 'traveler_guardian_activated', milestones_scheduled: created.length },
        sensitive: false,
        timestamp: now.toISOString(),
      });
    } catch (_) { /* best-effort */ }

    return Response.json({
      success: true,
      case_id: caseRecord.id,
      activated_by: user.email,
      scheduled: created,
      already_scheduled: [...existingTypes],
    });
  } catch (error) {
    console.error('[activateTravelerGuardian]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});