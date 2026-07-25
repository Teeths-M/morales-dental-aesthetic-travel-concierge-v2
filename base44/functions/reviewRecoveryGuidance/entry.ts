import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { computePrevHash } from '../_shared/auditHashChain.ts';

/**
 * reviewRecoveryGuidance — the only function that can make Recovery Wellness
 * Guidance patient-visible. Mirrors verifyClinicStatus/attestClinicStatus: the AI
 * (draftRecoveryGuidance) can only ever produce a draft; only a named human action
 * here can commit content a patient will see.
 *
 * Hard gate: approval is refused server-side unless interaction_attestation is
 * exactly true — the reviewer must explicitly confirm they checked this patient's
 * disclosed medications/allergies/conditions themselves (Phase 1 has no automated
 * interaction dataset; see the design report). A disabled UI checkbox is not
 * enough — this function re-checks it regardless of what the client sends.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const {
    draft_id, case_id, action, final_text, interaction_attestation, reviewer_credential, rejection_reason,
  } = await body<{
    draft_id?: string; case_id?: string; action?: 'approve' | 'reject';
    final_text?: string; interaction_attestation?: boolean; reviewer_credential?: string; rejection_reason?: string;
  }>();

  if (!draft_id) return err('draft_id is required');
  if (!case_id) return err('case_id is required');
  if (action !== 'approve' && action !== 'reject') return err('action must be "approve" or "reject"');

  const draft = await base44.asServiceRole.entities.RecoveryGuidanceDraft.get(draft_id).catch(() => null);
  if (!draft) return err('Draft not found', 404);
  if (draft.guidance_status !== 'draft_ready') {
    return err('This draft was never eligible for approval (insufficient_information) — nothing to review', 409);
  }

  if (action === 'reject') {
    const approval = await base44.asServiceRole.entities.RecoveryGuidanceApproval.create({
      draft_id, case_id,
      status: 'rejected',
      reviewer_id: user!.id,
      reviewer_name: user!.full_name || user!.email || '',
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejection_reason || '',
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'recovery_guidance_rejected',
      actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
      resource_type: 'RecoveryGuidanceApproval', resource_id: approval?.id || '', case_id,
      details: { rejection_reason: rejection_reason || '' },
      sensitive: false, timestamp: new Date().toISOString(),
      prev_hash: await computePrevHash(base44),
    }).catch(() => {});

    return ok({ status: 'rejected', approval_id: approval?.id || '' });
  }

  // ── action === 'approve' ─────────────────────────────────────────────────
  // Fail closed: no attestation, no approval — never silently waved through.
  if (interaction_attestation !== true) {
    return err('Approval requires interaction_attestation to be explicitly confirmed by the reviewer before this recommendation can reach a patient.', 422);
  }
  const text = String(final_text || '').trim();
  if (!text) return err('final_text is required to approve');

  const nowISO = new Date().toISOString();
  const reviewerName = user!.full_name || user!.email || '';
  const reviewerCredential = String(reviewer_credential || '').trim();

  const approval = await base44.asServiceRole.entities.RecoveryGuidanceApproval.create({
    draft_id, case_id,
    status: 'approved',
    reviewer_id: user!.id,
    reviewer_name: reviewerName,
    reviewer_credential: reviewerCredential,
    reviewed_at: nowISO,
    interaction_attestation: true,
    final_text: text,
  });

  // Only this branch, only after a real human approval, ever writes patient-visible
  // fields onto the CaseRecord — draftRecoveryGuidance never touches these.
  await base44.asServiceRole.entities.CaseRecord.update(case_id, {
    recovery_guidance_text: text,
    recovery_guidance_reviewer_name: reviewerName,
    recovery_guidance_reviewer_credential: reviewerCredential,
    recovery_guidance_approved_at: nowISO,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'recovery_guidance_approved',
    actor_id: user!.id, actor_role: user!.role || 'user', actor_name: user!.full_name || '', actor_email: user!.email || '',
    resource_type: 'RecoveryGuidanceApproval', resource_id: approval?.id || '', case_id,
    details: { reviewer_credential: reviewerCredential },
    sensitive: false, timestamp: new Date().toISOString(),
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({ status: 'approved', approval_id: approval?.id || '' });
}, { name: 'reviewRecoveryGuidance', requireAuth: true, allowedRoles: ['clinical_reviewer', 'admin', 'platform_admin'] }));
