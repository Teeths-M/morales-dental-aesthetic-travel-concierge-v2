/**
 * respondToCompanionJob
 *
 * Called from CompanionDashboard when a companion accepts or rejects a job offer.
 *
 * action: 'accept' — marks CompanionAssignment as 'confirmed',
 *                    auto-declines all other offers for the same case,
 *                    updates CaseRecord.companion_status, notifies admin.
 *
 * action: 'reject' — marks CompanionAssignment as 'declined'.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const { assignment_id, action, reject_reason } = await req.json().catch(() => ({}));

    if (!assignment_id || !['accept', 'reject'].includes(action)) {
      return Response.json({ error: 'assignment_id and action (accept|reject) required' }, { status: 400 });
    }

    const assignment = await base44.entities.CompanionAssignment.get(assignment_id);
    if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });

    // Security: verify this companion owns the offer
    if (assignment.companion_user_id !== user.id && assignment.companion_email !== user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (assignment.status !== 'offered') {
      return Response.json({ error: 'This offer is no longer available' }, { status: 409 });
    }

    const now      = new Date().toISOString();
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || '';
    const companionDisplay = assignment.companion_name || user.full_name || user.email;

    if (action === 'accept') {
      await base44.entities.CompanionAssignment.update(assignment_id, {
        status:      'confirmed',
        accepted_at: now,
      });

      // Auto-decline all other outstanding offers for the same case
      try {
        const others = await base44.asServiceRole.entities.CompanionAssignment.filter({
          case_id: assignment.case_id, status: 'offered'
        });
        for (const offer of others) {
          if (offer.id !== assignment_id) {
            await base44.asServiceRole.entities.CompanionAssignment.update(offer.id, {
              status: 'declined_auto',
            }).catch(() => {});
          }
        }
      } catch (_) {}

      // Update CaseRecord
      try {
        await base44.asServiceRole.entities.CaseRecord.update(assignment.case_id, {
          companion_status: 'assigned',
          companion_name:   companionDisplay,
          companion_email:  assignment.companion_email || user.email,
          companion_assigned_at: now,
        });
      } catch (_) {}

      // Audit log
      await base44.functions.invoke('logAuditEvent', {
        event_type:   'companion_job_accepted',
        performed_by: user.email,
        target_email: assignment.companion_email || user.email,
        metadata:     { case_id: assignment.case_id, assignment_id, destination: assignment.destination_country },
        timestamp:    now,
      }).catch(() => {});

      // Admin notification
      if (adminEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales — Companion Assignment',
          to: adminEmail,
          subject: `✅ Companion Accepted — ${companionDisplay} (${assignment.destination_country})`,
          body: `<p><strong>${companionDisplay}</strong> has accepted the companion job for case <strong>${assignment.case_id}</strong> in ${assignment.destination_country}.</p>
<p>Patient: ${assignment.patient_first_name}</p>
<p>Arrival: ${assignment.arrival_date ? new Date(assignment.arrival_date).toLocaleDateString() : 'TBC'}</p>
<p>Package fee: $${assignment.package_fee || 650}</p>`,
        }).catch(() => {});
      }

      // Companion Mission Briefing — sent to companion on acceptance
      const companionEmail = assignment.companion_email || user.email;
      const GOLD = '#D4AF37';
      const appUrl = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');
      const e = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const arrivalStr = assignment.arrival_date ? new Date(assignment.arrival_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';
      const departureStr = assignment.departure_date ? new Date(assignment.departure_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';

      const briefingHtml = `<!doctype html><html><body style="margin:0;background:#060B16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060B16;padding:28px 14px;"><tr><td align="center">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#060B16;border:1px solid #2A3F4A;border-radius:22px;overflow:hidden;">
<tr><td style="background:#0C1A1D;padding:28px 32px;border-bottom:1px solid #2A3F4A;">
  <div style="font-family:Georgia,serif;font-size:22px;color:#fff;">Morales Medical Travel Safety</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Companion Mission Briefing</div>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#fff;">
    Your assignment is confirmed, ${e(companionDisplay)}.
  </h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.6);">
    Thank you for accepting this mission. Your patient is counting on your presence and care. Here is everything you need.
  </p>

  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:14px;padding:20px;margin-bottom:20px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;">Mission Details</div>
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;width:42%;">Patient (first name only)</td><td style="padding:7px 0;color:#fff;font-size:14px;font-weight:700;">${e(assignment.patient_first_name || 'Your patient')}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Destination</td><td style="padding:7px 0;color:#fff;font-size:14px;">${e(assignment.destination_country || 'TBC')}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Hotel</td><td style="padding:7px 0;color:#fff;font-size:14px;">${e(assignment.hotel_name || 'To be confirmed')}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Arrival</td><td style="padding:7px 0;color:#fff;font-size:14px;">${e(arrivalStr)}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Departure</td><td style="padding:7px 0;color:#fff;font-size:14px;">${e(departureStr)}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Package fee</td><td style="padding:7px 0;color:${GOLD};font-size:14px;font-weight:700;">$${assignment.package_fee || 650}</td></tr>
      <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;">Meals included</td><td style="padding:7px 0;color:#fff;font-size:14px;">${assignment.meals_included ? '✓ Yes' : 'No'}</td></tr>
    </table>
  </div>

  <div style="background:#0C1A1D;border:1px solid #2A3F4A;border-radius:14px;padding:20px;margin-bottom:20px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;">Your Responsibilities</div>
    <ul style="margin:0;padding:0 0 0 18px;color:rgba(255,255,255,0.7);font-size:13px;line-height:1.9;">
      <li>Meet the patient at their hotel upon arrival</li>
      <li>Accompany them to the clinic for their procedure</li>
      <li>Coordinate meal delivery during recovery</li>
      <li>Be available via WhatsApp during their stay</li>
      <li>Complete HS6 (Companion Meal Delivery) in the Morales app</li>
      <li>Report any safety concerns immediately to Morales Concierge</li>
    </ul>
  </div>

  <div style="text-align:center;margin-bottom:24px;">
    <a href="${appUrl}/companion-dashboard" style="display:inline-block;background:${GOLD};color:#060B16;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:14px;font-weight:700;">
      Open Companion Dashboard →
    </a>
  </div>

  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:16px 20px;">
    <p style="margin:0;font-size:12px;color:#fca5a5;line-height:1.6;">
      <strong>Emergency Protocol:</strong> If you or the patient are in danger at any time, contact Morales Emergency Line immediately. Do not hesitate. Patient safety is always the priority.
    </p>
  </div>

  <p style="margin:24px 0 0;font-size:12px;color:#475569;text-align:center;">
    Morales Medical Travel Safety · Companion Mission Briefing · ${e(assignment.destination_country || '')}
  </p>
</td></tr>
</table></td></tr></table></body></html>`;

      if (companionEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Morales — Companion Briefing',
          to: companionEmail,
          subject: `🌍 Your Mission Briefing — ${e(assignment.patient_first_name || 'Patient')} in ${e(assignment.destination_country || 'your destination')}`,
          body: briefingHtml,
        }).catch(() => {});
      }

      return Response.json({ success: true, action: 'accepted', status: 'confirmed', companion: companionDisplay });
    }

    if (action === 'reject') {
      await base44.entities.CompanionAssignment.update(assignment_id, {
        status:        'declined',
        declined_at:   now,
        decline_reason: reject_reason || '',
      });

      return Response.json({ success: true, action: 'rejected', status: 'declined' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[respondToCompanionJob]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
