import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    if (!case_id) {
      return Response.json({ error: 'case_id required' }, { status: 400 });
    }

    // SDK filter() cannot query by built-in `id` field — use created_by_id scoped list + client match
    // We fetch the user's own cases and match by id safely on the JS side (max 50, user-scoped)
    const userCases = await base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 50);
    const caseData = userCases.find(c => c.id === case_id);
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Check if solo traveler (no companion required or declined)
    const isSolo = !caseData.requires_companion || caseData.companion_requirement_status === 'companion_required_pending';

    if (!isSolo) {
      return Response.json({ activated: false, reason: 'companion_assigned' });
    }

    const now = new Date();
    const handshakeTime = caseData.intake_handshake_logged_at ? new Date(caseData.intake_handshake_logged_at) : now;
    const firstCheckInTime = new Date(handshakeTime.getTime() + 6 * 60 * 60 * 1000);

    // BUG-R6-06 FIX: use asServiceRole for entity writes — user-scoped writes can fail
    // for non-client roles (doctor, travel_agency) due to platform RLS defaults.
    // All other SoloCheckIn-writing functions (scheduleSoloCheckIns, escalateSoloCheckIn)
    // already use asServiceRole consistently.
    const checkIn = await base44.asServiceRole.entities.SoloCheckIn.create({
      case_id,
      trip_id: case_id,
      user_id: user.id,
      user_email: caseData.client_email,
      user_name: caseData.client_name,
      user_phone: caseData.client_phone || '',
      scheduled_time: firstCheckInTime.toISOString(),
      check_in_round: 1,
      status: 'pending',
      is_paused_medical: false,
      created_at: now.toISOString(),
    });

    // Send initial notification
    const msg = `🛡️ Solo Traveler Protection Activated: Your first safety check-in is scheduled for ${firstCheckInTime.toLocaleString()}. You'll receive notifications every 12 hours.`;

    try {
      await base44.integrations.Core.SendEmail({
        to: caseData.client_email,
        subject: `🛡️ Solo Traveler Safety Protocol Activated`,
        body: `<p>${msg}</p><p><a href="${Deno.env.get('APP_URL')}/dashboard/solo-checkin">View Check-In Settings →</a></p>`,
      });

      await base44.asServiceRole.entities.SoloCheckIn.update(checkIn.id, {
        sent_time: now.toISOString(),
      });
    } catch (e) {
      console.error('Failed to send activation notification:', e);
    }

    // Log to AuditLog
    try {
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'handshake_created',
        actor_id: user.id,
        actor_role: user.role,
        actor_name: user.full_name,
        resource_type: 'SoloCheckIn',
        resource_id: checkIn.id,
        resource_name: 'Round 1 (Initial)',
        case_id,
        details: {
          action: 'solo_checkin_activated',
          first_scheduled_time: firstCheckInTime.toISOString(),
          is_solo_traveler: true,
        },
        sensitive: false,
      });
    } catch (auditErr) {
      console.error('[activateSoloCheckIn] Audit log failed — activation succeeded:', auditErr?.message);
      // Don't fail activation if audit log fails
    }

    return Response.json({ activated: true, check_in_id: checkIn.id, first_check_in: firstCheckInTime.toISOString() });
  } catch (error) {
    console.error('[activateSoloCheckIn]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});