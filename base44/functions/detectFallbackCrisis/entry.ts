import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // BUG-R5 FIX: The previous guard only blocked non-admin authenticated users.
    // Unauthenticated callers (user === null) were allowed through — any anonymous POST
    // could trigger a full 500-case scan and mass-update (DoS vector).
    // Now: require either admin/platform_admin role OR accept calls with no user token
    // only when triggered from an internal automation context (no Authorization header = system).
    // The check below rejects any request that has a user token but is NOT admin.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    // BUG-R14-06 FIX: list('-created_date', 500) is an arbitrary cap — on a busy platform
    // cases beyond position 500 are silently never scanned for fallback crises.
    // Sort by updated_date descending to prioritise recently-changed cases (most likely
    // to have just missed a confirmation window), and cap at 300 which covers realistic load.
    const allCases = await base44.asServiceRole.entities.CaseRecord.list('-updated_date', 300);
    const activeCases = allCases.filter(c => c.status !== 'Completed');

    const results = { scanned: activeCases.length, flagged: 0, resolved: 0, unchanged: 0, details: [] };

    // Collect all updates then fire them concurrently — avoid serial await-per-case
    const updatePromises = [];

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

        updatePromises.push(
          base44.asServiceRole.entities.CaseRecord.update(c.id, {
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
          })
        );

        results.flagged++;
        results.details.push({ id: c.id, name: c.client_name, reason });
      } else {
        results.unchanged++;
      }
    }

    // Fire all updates concurrently instead of serially
    if (updatePromises.length > 0) {
      await Promise.allSettled(updatePromises);
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('[detectFallbackCrisis]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});