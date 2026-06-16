import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Check-in intervals by surgery complexity (hours)
const CHECKIN_INTERVALS = { minor: 12, moderate: 8, major: 4 };
// Recovery monitoring duration by complexity (hours)
const RECOVERY_DURATION = { minor: 24, moderate: 48, major: 72 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { case_id, surgery_type, surgery_complexity = 'moderate', family_contacts = [] } = await req.json();
    if (!case_id) return Response.json({ error: 'case_id required' }, { status: 400 });

    const intervalHours = CHECKIN_INTERVALS[surgery_complexity] || 8;
    const durationHours = RECOVERY_DURATION[surgery_complexity] || 48;
    const now = new Date();
    const endAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    // Build check-in schedule
    const checkins = [];
    let t = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    while (t <= endAt) {
      checkins.push({
        scheduled_at: t.toISOString(),
        completed_at: null,
        status: 'pending',
        pain_level: null,
        notes: null,
        escalated: false
      });
      t = new Date(t.getTime() + intervalHours * 60 * 60 * 1000);
    }

    // Create recovery session
    const session = await base44.entities.RecoverySession.create({
      case_id,
      patient_id: user.id,
      patient_email: user.email,
      patient_name: user.full_name,
      surgery_type: surgery_type || 'General Surgery',
      surgery_complexity,
      recovery_start_at: now.toISOString(),
      recovery_end_at: endAt.toISOString(),
      is_active: true,
      notification_silencing_active: true,
      checkin_interval_hours: intervalHours,
      checkins,
      total_checkins_scheduled: checkins.length,
      total_checkins_completed: 0,
      escalations: 0,
      family_contacts
    });

    // Enable notification blackout on CaseRecord
    await base44.asServiceRole.entities.CaseRecord.update(case_id, {
      notification_blackout_active: true,
      notification_blackout_started_at: now.toISOString(),
      status: 'RECOVERY_PHASE_7_DAY'
    });

    // Notify patient
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: '🌿 Recovery Mode Activated — Your Post-Surgery Care Has Begun',
      body: `Dear ${user.full_name},\n\nYour procedure is complete and your Recovery Mode has been activated.\n\n✅ Non-critical notifications have been silenced\n✅ Your concierge check-ins are scheduled every ${intervalHours} hours\n✅ Emergency SOS remains available at all times\n\nYour recovery monitoring runs until: ${endAt.toLocaleDateString()}\n\nRest well. Your care team is watching over you.\n\nMorales Medical Recovery Team`
    });

    return Response.json({ success: true, session, checkins_scheduled: checkins.length, recovery_ends_at: endAt.toISOString() });
  } catch (error) {
    console.error('activateRecoveryMode error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});