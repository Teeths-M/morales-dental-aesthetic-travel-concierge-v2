import { createHandler } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const body = await body();
    const { action, case_id, waiver_type, signature_data, declined_reason, declined_by, declined_relationship, ip_address, age_threshold } = body;

    if (!case_id) {
      return Response.json({ error: 'case_id required' }, { status: 400 });
    }

    // BUG-R7-02 FIX: filter({ id: case_id }) always returns [] — the SDK cannot query the
    // built-in `id` field via filter(). Use .get() for primary key lookup.
    const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id);
    if (!caseRecord) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }
    const isAdmin = ['admin', 'platform_admin', 'coordinator'].includes(user.role);
    const isPatient = caseRecord.client_email === user.email;

    if (!isAdmin && !isPatient) {
      return Response.json({ error: 'Forbidden: insufficient access' }, { status: 403 });
    }

    // ── SIGN ──────────────────────────────────────────────────────────────────
    if (action === 'sign') {
      const waiverType = waiver_type || 'companion_refusal';
      const existing = await base44.asServiceRole.entities.WaiverRequest.filter({ case_id, waiver_type: waiverType });
      if (!existing.length) {
        return Response.json({ error: 'No waiver request found for this case' }, { status: 404 });
      }

      await base44.asServiceRole.entities.WaiverRequest.update(existing[0].id, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signature_data || 'digital_accepted',
        ip_address: ip_address || ''
      });

      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        waiver_status: 'signed',
        companion_requirement_status: 'companion_declined_with_waiver',
        status: 'Submitted'
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'waiver_signed',
        actor_id: user.id, actor_role: user.role, actor_name: user.full_name, actor_email: user.email,
        resource_type: 'waiver_request', resource_id: existing[0].id, case_id,
        details: { waiver_type: waiverType }, sensitive: true,
        timestamp: new Date().toISOString(),
        prev_hash: await computePrevHash(base44)
      });

      return Response.json({ success: true, status: 'signed' });
    }

    // ── REFUSE ────────────────────────────────────────────────────────────────
    if (action === 'refuse') {
      const existing = await base44.asServiceRole.entities.WaiverRequest.filter({ case_id });
      const refusalData = {
        status: 'refused',
        refused_at: new Date().toISOString(),
        declined_by: declined_by || user.full_name,
        declined_relationship: declined_relationship || 'self',
        declined_reason: declined_reason || '',
        ip_address: ip_address || ''
      };

      let waiverId;
      if (existing.length > 0) {
        await base44.asServiceRole.entities.WaiverRequest.update(existing[0].id, refusalData);
        waiverId = existing[0].id;
      } else {
        const created = await base44.asServiceRole.entities.WaiverRequest.create({
          case_id,
          patient_id: caseRecord.created_by_id || '',
          waiver_type: waiver_type || 'companion_refusal',
          waiver_version: '1.0',
          issued_at: new Date().toISOString(),
          ...refusalData
        });
        waiverId = created.id;
      }

      // STOP coordination — set case status to waiver_refused
      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        waiver_status: 'refused',
        status: 'waiver_refused',
        companion_requirement_status: 'companion_required_pending'
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'waiver_refused',
        actor_id: user.id, actor_role: user.role, actor_name: user.full_name, actor_email: user.email,
        resource_type: 'waiver_request', resource_id: waiverId, case_id,
        details: { waiver_type, declined_reason }, sensitive: true,
        timestamp: new Date().toISOString(),
        prev_hash: await computePrevHash(base44)
      });

      // Notify admins
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins.slice(0, 3)) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `⚠️ Waiver Refused — Case ${case_id}`,
            body: `A patient has declined a required waiver.\n\nCase ID: ${case_id}\nPatient: ${caseRecord.client_name}\nReason: ${declined_reason || 'Not provided'}\n\nCase coordination has been paused. Please follow up manually.`
          });
        }
      } catch (_) { /* non-fatal */ }

      return Response.json({
        success: true,
        status: 'refused',
        message: 'Your acknowledgement has been noted. Your care journey is currently on hold until our team follows up with you.'
      });
    }

    // ── REISSUE (admin only) ──────────────────────────────────────────────────
    if (action === 'reissue') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden: only admin can reissue a waiver' }, { status: 403 });
      }

      const existing = await base44.asServiceRole.entities.WaiverRequest.filter({ case_id });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.WaiverRequest.update(existing[0].id, {
          status: 'admin_reissued',
          reissued_at: new Date().toISOString(),
          reissued_by: user.id
        });
      }

      await base44.asServiceRole.entities.CaseRecord.update(case_id, {
        waiver_status: 'admin_reissued',
        status: 'Submitted'
      });

      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'waiver_requested',
        actor_id: user.id, actor_role: user.role, actor_name: user.full_name, actor_email: user.email,
        resource_type: 'waiver_request', resource_id: existing[0]?.id || '', case_id,
        details: { action: 'admin_reissued_by', admin_id: user.id }, sensitive: false,
        timestamp: new Date().toISOString(),
        prev_hash: await computePrevHash(base44)
      });

      return Response.json({ success: true, status: 'admin_reissued' });
    }

    // ── CHECK COMPANION REQUIREMENT ───────────────────────────────────────────
    if (action === 'check_companion_requirement') {
      const threshold = age_threshold || 65;
      const dob = caseRecord.date_of_birth;
      const age = calcAge(dob);
      let requiresCompanion = false;
      let reason = null;

      if (age !== null && age >= threshold) {
        requiresCompanion = true;
        reason = 'age_threshold';
      }

      if (!requiresCompanion && (caseRecord.safe_t_result === 'BLOCKED' || caseRecord.risk_score === 'High')) {
        requiresCompanion = true;
        reason = 'safe_t_flag';
      }

      if (requiresCompanion && !caseRecord.requires_companion) {
        await base44.asServiceRole.entities.CaseRecord.update(case_id, {
          requires_companion: true,
          companion_requirement_reason: reason,
          companion_requirement_status: 'pending',
          waiver_status: 'required'
        });

        // Create waiver request
        const existing = await base44.asServiceRole.entities.WaiverRequest.filter({ case_id, waiver_type: 'companion_refusal' });
        if (!existing.length) {
          await base44.asServiceRole.entities.WaiverRequest.create({
            case_id,
            patient_id: caseRecord.created_by_id || '',
            waiver_type: 'companion_refusal',
            status: 'required',
            issued_at: new Date().toISOString(),
            waiver_version: '1.0',
            acknowledgement_text: 'I understand that a travel companion is recommended for my care journey. I acknowledge that this is my personal choice, and I accept responsibility for travel and recovery without a dedicated companion.'
          });
        }

        await base44.asServiceRole.entities.AuditLog.create({
          event_type: 'companion_required_flagged',
          actor_id: 'system', actor_role: 'system', actor_name: 'System', actor_email: '',
          resource_type: 'case_record', resource_id: case_id, case_id,
          details: { reason, age, threshold }, sensitive: false,
          timestamp: new Date().toISOString(),
          prev_hash: await computePrevHash(base44)
        });
      }

      return Response.json({ success: true, requires_companion: requiresCompanion, reason, age });
    }

    return Response.json({ error: 'Invalid action. Use: sign | refuse | reissue | check_companion_requirement' }, { status: 400 });
}, { name: 'handleWaiverRequest' }));
