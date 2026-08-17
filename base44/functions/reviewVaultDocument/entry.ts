import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields, z } from '../../shared/validate.ts';

// reviewVaultDocument — the one gated action a human reviewer takes on a
// document sitting in the review queue (VaultDocument.review_status ===
// 'pending_review'), mirroring DoctorVerificationAdmin.jsx's existing
// Approve/Reject/Request-New-Scan pattern exactly.
//
// Approve here is a real, meaningful verification event — a human directly
// confirming an identity/credential document is legitimate is exactly the
// case 'requires_human_review' exists for, so it moves verification_status
// to 'verified' with an honest, human-attributed source. It is never the
// AI's own call — this function is admin/platform_admin only.

const bodySchema = strictObject({
  vault_document_id: Fields.shortText(100),
  action: z.enum(['approve', 'reject', 'request_new_scan']),
  notes: Fields.optionalText(1000),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { vault_document_id, action, notes } = await body();

  if (action === 'reject' && !notes.trim()) {
    return err('A reason is required to reject a document.');
  }

  const doc = await base44.asServiceRole.entities.VaultDocument.get(vault_document_id).catch(() => null);
  if (!doc) return err('Document not found.', 404);

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    review_notes: notes || '',
    reviewed_by: user!.email,
    reviewed_at: now,
  };

  if (action === 'approve') {
    updates.review_status = 'approved';
    updates.verification_status = 'verified';
    updates.verification_source = 'Manual admin review';
    updates.verification_timestamp = now;
  } else if (action === 'reject') {
    updates.review_status = 'rejected';
    updates.verification_status = 'verification_failed';
  } else {
    updates.review_status = 'requires_new_scan';
  }

  await base44.asServiceRole.entities.VaultDocument.update(vault_document_id, updates);

  try {
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'vault_document_reviewed',
      resource_type: 'VaultDocument',
      resource_id: vault_document_id,
      resource_name: `${doc.document_type} review`,
      details: { action, owner_email: doc.owner_email },
    });
  } catch (_) { /* non-fatal */ }

  return ok({ success: true, vault_document_id, action });
}, { name: 'reviewVaultDocument', requireAuth: true, allowedRoles: ['admin', 'platform_admin'], bodySchema }));
