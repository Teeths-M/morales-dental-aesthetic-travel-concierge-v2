/**
 * startActivitySafetyMode
 * Activates Nightlife / Activity Safety Mode for a solo traveler.
 * Creates a NightlifeSafetySession, logs starting location, creates guardian link,
 * and schedules a tighter check-in using the existing SoloCheckIn system.
 */
import { createHandler } from '../../shared/createHandler.ts';

function generateToken(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join('');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const {
      case_id,
      activity_type = 'nightlife',
      venue_name,
      venue_address,
      start_latitude,
      start_longitude,
      expected_return_hours = 4,
      checkin_interval_minutes = 60,
      is_demo = false,
    } = await body();

    const appUrl = Deno.env.get('APP_URL') || 'https://morales.app';
    const now = new Date();
    const expectedReturn = new Date(now.getTime() + expected_return_hours * 60 * 60 * 1000);

    // Find most recent active case if not provided
    let resolvedCaseId = case_id;
    let caseRecord = null;
    if (!resolvedCaseId) {
      const cases = await base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 5);
      caseRecord = cases.find(c => ['Travel-Coordination', 'Ready-For-Travel', 'Recovery', 'Procedure-In-Progress', 'RECOVERY_PHASE_7_DAY'].includes(c.status)) || cases[0];
      resolvedCaseId = caseRecord?.id || '';
    } else {
      const cases = await base44.entities.CaseRecord.filter({ client_email: user.email }, '-created_date', 5);
      caseRecord = cases.find(c => c.id === resolvedCaseId) || cases[0];
    }

    // Log starting location breadcrumb
    if (start_latitude != null && start_longitude != null && resolvedCaseId) {
      try {
        await base44.asServiceRole.entities.LocationBreadcrumb.create({
          case_id: resolvedCaseId,
          patient_email: user.email,
          patient_name: user.full_name,
          latitude: start_latitude,
          longitude: start_longitude,
          place_label: venue_name ? `${venue_name} (activity start)` : `${activity_type} start`,
          source: 'gps',
          provider: 'browser_gps',
          location_precision: 'precise',
          logged_at: now.toISOString(),
          is_saved: true,
          auto_purge_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (_) {}
    }

    // Create/reuse guardian link for this session
    let guardianUrl = null;
    let guardianLinkId = null;
    if (resolvedCaseId) {
      try {
        const existing = await base44.asServiceRole.entities.GuardianSession.filter({
          case_id: resolvedCaseId, is_active: true,
        });
        const valid = existing.find(s => new Date(s.expires_at) > now);
        if (valid) {
          guardianUrl = `${appUrl}/guardian/${valid.view_token}`;
          guardianLinkId = valid.id;
        } else {
          const token = generateToken(32);
          const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
          const gs = await base44.asServiceRole.entities.GuardianSession.create({
            case_id: resolvedCaseId,
            patient_email: user.email,
            patient_name: user.full_name,
            guardian_name: 'Emergency Contact',
            guardian_email: caseRecord?.emergency_contact || '',
            view_token: token,
            expires_at: expiresAt,
            is_active: true,
            view_count: 0,
            shared_data_scope: ['case_status', 'journey_stage', 'location'],
            created_at: now.toISOString(),
          });
          guardianUrl = `${appUrl}/guardian/${token}`;
          guardianLinkId = gs?.id || null;
        }
      } catch (_) {}
    }

    // Create NightlifeSafetySession
    const session = await base44.asServiceRole.entities.NightlifeSafetySession.create({
      case_id: resolvedCaseId || '',
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      activity_type,
      venue_name: venue_name || '',
      venue_address: venue_address || '',
      start_latitude: start_latitude ?? null,
      start_longitude: start_longitude ?? null,
      start_location_label: venue_name || activity_type,
      start_time: now.toISOString(),
      expected_return_time: expectedReturn.toISOString(),
      checkin_interval_minutes,
      status: 'active',
      guardian_link_id: guardianLinkId || '',
      guardian_url: guardianUrl || '',
      guardian_link_sent: false,
      emergency_pin_confirmed: false,
      last_checkin_at: now.toISOString(),
      missed_checkin_count: 0,
      is_demo,
      created_at: now.toISOString(),
    });

    // Schedule a tighter SoloCheckIn if there's an active case
    if (resolvedCaseId) {
      const firstCheckInAt = new Date(now.getTime() + checkin_interval_minutes * 60 * 1000);
      try {
        await base44.asServiceRole.entities.SoloCheckIn.create({
          case_id: resolvedCaseId,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          user_phone: caseRecord?.client_phone || '',
          scheduled_time: firstCheckInAt.toISOString(),
          sent_time: now.toISOString(),
          status: 'pending',
          check_in_round: 1,
          missed_round_count: 0,
          escalation_level: 'none',
          created_at: now.toISOString(),
        });
      } catch (_) {}
    }

    return Response.json({
      success: true,
      session_id: session.id,
      activity_type,
      start_time: now.toISOString(),
      expected_return_time: expectedReturn.toISOString(),
      guardian_url: guardianUrl,
      checkin_interval_minutes,
      case_id: resolvedCaseId,
    });
}, { name: 'startActivitySafetyMode' }));
