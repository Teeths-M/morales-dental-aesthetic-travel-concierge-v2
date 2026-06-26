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
