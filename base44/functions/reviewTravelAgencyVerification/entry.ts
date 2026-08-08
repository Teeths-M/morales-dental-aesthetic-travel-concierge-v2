import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Tools 5/6/7: approve_agency / reject_agency / escalate_to_human, unified.
// The M-Care agent calls this with a decision after gathering info and running
// the IATA + website checks. For "approve" it RE-RUNS the IATA check itself —
// the agent is never trusted to approve on a stale or unverified code; if the
// live IATA lookup fails, the function refuses to approve and escalates instead.
//
// Admin-only, same discipline as reviewTaxiServiceVerification — without this
// gate, TravelAgency's own RLS lets an agency update its own record, so an
// agency could otherwise call this on its own agency_id and self-approve,
// skipping human review entirely.
Deno.serve(createHandler(async ({ base44, body }) => {
    const payload = await body();
    const agency_id = payload?.agency_id;
    const decision = String(payload?.decision || '').toLowerCase();
    const reason = String(payload?.reason || '');

    if (!agency_id || !['approve', 'reject', 'escalate'].includes(decision)) {
      return err('agency_id and decision (approve|reject|escalate) required');
    }

    const agency = await base44.entities.TravelAgency.get(agency_id).catch(() => null);
    if (!agency) return err('Agency not found', 404);

    // Approve gate: re-verify IATA live before trusting the decision.
    let iata = null;
    if (decision === 'approve') {
      if (!agency.iata_code) {
        return ok({ ok: false, decision: 'reject', note: 'Cannot approve: the agency has no IATA code on file.' });
      }
      const r = await base44.functions.invoke('verifyIATACode', { iata_code: agency.iata_code });
      iata = r?.data || r;
      if (!iata?.is_valid) {
        const mapped = String(iata?.status || 'Error').toLowerCase().replace(/\s+/g, '_');
        await base44.entities.TravelAgency.update(agency_id, {
          iata_verification_status: ['not_listed', 'format_invalid', 'error', 'valid'].includes(mapped) ? mapped : 'error',
          verification_status: 'pending_manual',
          ai_decision: 'ESCALATED',
          ai_reasoning: `Approval refused — IATA check returned "${iata?.status}". ${reason}`.trim()
        });
        await base44.entities.AgencyIATAVerification.create({
          agency_id, agency_email: agency.email, agency_name: agency.agency_name,
          iata_code: agency.iata_code,
          iata_is_valid: false,
          iata_status: iata?.status || 'Error',
          iata_agency_name: iata?.agency_name || null,
          iata_agency_class: iata?.agency_class || null,
          iata_country: iata?.country || null,
          iata_raw_response: iata?.raw_response || null,
          website_url: agency.website_url,
          ai_decision: 'ESCALATED',
          ai_reasoning: `Approval refused — IATA "${iata?.status}". ${reason}`.trim(),
          status: 'PENDING_HUMAN_REVIEW',
          decided_at: new Date().toISOString()
        });
        return ok({ ok: false, decision: 'escalate', note: `I could not confirm IATA code ${agency.iata_code} (${iata?.status}). I'm escalating to a human reviewer rather than approving.`, iata });
      }
    }

    const now = new Date().toISOString();
    let newStatus, verStatus, aiDecision, verRecordStatus;
    if (decision === 'approve') {
      newStatus = 'active'; verStatus = 'verified'; aiDecision = 'APPROVED'; verRecordStatus = 'APPROVED';
    } else if (decision === 'reject') {
      newStatus = 'inactive'; verStatus = 'rejected'; aiDecision = 'REJECTED'; verRecordStatus = 'REJECTED';
    } else {
      newStatus = 'pending_verification'; verStatus = 'pending_manual'; aiDecision = 'ESCALATED'; verRecordStatus = 'PENDING_HUMAN_REVIEW';
    }

    const update = {
      status: newStatus,
      verification_status: verStatus,
      iata_verified: decision === 'approve',
      iata_verification_status: decision === 'approve' ? 'valid' : (agency.iata_verification_status || 'pending'),
      iata_raw_response: iata?.raw_response || agency.iata_raw_response || null,
      ai_decision: aiDecision,
      ai_reasoning: reason,
      approved_at: decision === 'approve' ? now : null
    };
    await base44.entities.TravelAgency.update(agency_id, update);

    await base44.entities.AgencyIATAVerification.create({
      agency_id, agency_email: agency.email, agency_name: agency.agency_name,
      iata_code: agency.iata_code,
      iata_is_valid: decision === 'approve' ? true : !!iata?.is_valid,
      iata_status: iata?.status || null,
      iata_agency_name: iata?.agency_name || null,
      iata_agency_class: iata?.agency_class || null,
      iata_country: iata?.country || null,
      iata_raw_response: iata?.raw_response || null,
      website_url: agency.website_url,
      ai_decision: aiDecision,
      ai_reasoning: reason,
      status: verRecordStatus,
      decided_at: now,
      approved_at: decision === 'approve' ? now : null
    });

    // Email the agency (registered app users only — the onboarding contact is logged in).
    try {
      const subject = decision === 'approve'
        ? 'Your agency is approved on Morales'
        : decision === 'reject'
          ? 'Update on your Morales agency application'
          : 'Your Morales agency application needs human review';
      const greeting = `Hi ${agency.contact_person || agency.agency_name},`;
      const msg = decision === 'approve'
        ? `${greeting}\n\nM-Care verified your IATA code ${agency.iata_code} and your agency is approved on Morales. You can now receive patient bookings.\n\nReasoning: ${reason}`
        : decision === 'reject'
          ? `${greeting}\n\nUnfortunately your agency application was not approved. Reason: ${reason}\n\nYou can reapply once the issue is resolved.`
          : `${greeting}\n\nYour application needs a closer look from our human team. Reason: ${reason}\n\nSomeone will reach out shortly.`;
      await base44.integrations.Core.SendEmail({ to: agency.email, subject, body: msg });
    } catch (e) { /* email is best-effort */ }

    return ok({ ok: true, agency_id, decision, status: verRecordStatus, ai_decision: aiDecision });
}, { name: 'reviewTravelAgencyVerification', allowedRoles: ['admin', 'platform_admin'] }));
