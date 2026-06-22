import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all active cases for this user
    const cases = await base44.entities.CaseRecord.filter(
      { client_email: user.email },
      '-created_date',
      10
    );

    const activeCases = cases.filter(c => c.status !== 'Completed');
    if (activeCases.length === 0) {
      return Response.json({ active_solo_trips: 0, check_ins: [] });
    }

    const caseIds = new Set(activeCases.map(c => c.id));

    // BUG-06 FIX: SDK filter() $in operator is not guaranteed — fetch by user_email
    // (an indexed entity field on SoloCheckIn) and filter case membership in JS.
    const rawCheckIns = await base44.entities.SoloCheckIn.filter(
      { user_email: user.email, status: 'pending' },
      '-scheduled_time',
      50
    );
    const allCheckIns = rawCheckIns.filter(c => caseIds.has(c.case_id));

    // Find upcoming check-ins (next 12 hours)
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const upcoming = allCheckIns.filter(c => {
      if (!c.scheduled_time) return false;
      const scheduled = new Date(c.scheduled_time);
      return scheduled > now && scheduled < twelveHoursFromNow;
    });

    // Find overdue check-ins
    const overdue = allCheckIns.filter(c => {
      if (!c.scheduled_time) return false;
      return new Date(c.scheduled_time) < now && c.status === 'pending';
    });

    return Response.json({
      active_solo_trips: activeCases.length,
      pending_check_ins: allCheckIns.length,
      upcoming_check_ins: upcoming,
      overdue_check_ins: overdue,
    });
  } catch (error) {
    console.error('[getSoloCheckInStatus]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});