import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled automation calls (no user) and direct admin calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-created_date', 500);
    const activeCases = allCases.filter(c => c.status !== 'Completed');

    const results = { scanned: activeCases.length, flagged: 0, resolved: 0, unchanged: 0, details: [] };

    for (const c of activeCases) {
      // Skip if already explicitly resolved
      if (c.fallback_state?.in_flux === false && c.fallback_state?.resolved_at) {
        results.unchanged++;
        continue;
      }

      let shouldFlag = false;
      let reason = '';
      let primaryPartnerType = '';
      let primaryPartnerName = '';
      let missedAt = null;

      // Check: doctor notified but confirmation window missed
      if (
        c.doctor_confirmation_status === 'PENDING' &&
        c.doctor_notified_at &&
        (now - new Date(c.doctor_notified_at)) > CONFIRMATION_WINDOW_MS &&
        !['Completed', 'Submitted'].includes(c.status)
      ) {
        shouldFlag = true;
        reason = 'DOCTOR_MISSED_CONFIRMATION_WINDOW';
        primaryPartnerType = 'doctor';
        primaryPartnerName = c.doctor_selected || 'Assigned Doctor';
        missedAt = new Date(c.doctor_notified_at);
      }

      if (shouldFlag && !c.fallback_state?.in_flux) {
        const confirmationDeadline = new Date(missedAt.getTime() + CONFIRMATION_WINDOW_MS);
        const auditEntry = {
          timestamp: now.toISOString(),
          action: 'IN_FLUX_AUTO_DETECTED',
          actor: 'system',
          notes: `${reason} — primary partner: ${primaryPartnerName}. Notified at ${missedAt.toISOString()}, window expired.`,
        };

        await base44.asServiceRole.entities.CaseRecord.update(c.id, {
          case_priority: c.case_priority === 'Normal' ? 'Urgent' : c.case_priority,
          fallback_state: {
            in_flux: true,
            in_flux_triggered_at: now.toISOString(),
            primary_partner_type: primaryPartnerType,
            primary_partner_name: primaryPartnerName,
            primary_partner_contact_phone: '',
            confirmation_deadline: confirmationDeadline.toISOString(),
            current_escalation_level: 1,
            escalation_reason: reason,
            human_intervention_required: false,
            fallback_sequence: [],
            audit_trail: [...(c.fallback_state?.audit_trail || []), auditEntry],
          },
        });

        results.flagged++;
        results.details.push({ id: c.id, name: c.client_name, reason });
      } else {
        results.unchanged++;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});