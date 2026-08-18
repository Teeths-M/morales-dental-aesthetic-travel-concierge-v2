import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

// ── downloadCaseVaultDocument ───────────────────────────────────────────────
// The ONLY place a signed download URL for a patient's VaultDocument is ever
// minted for a doctor. The doctor is not the record owner, so this function
// re-verifies server-side that the caller is the doctor actually assigned to a
// case whose patient owns this document (or an admin) before signing anything.
// A doctor with no relationship to the patient cannot download — full stop.
//
// VaultDocuments are scanner-processed (server-side OCR/classification), so
// unlike PassportVault there is no client-side password layer here: the signed
// URL is the access boundary, short-lived (120s), and every download is
// recorded in the tamper-evident AuditLog chain (vault_document_accessed).

const BodySchema = strictObject({
  vault_document_id: Fields.shortText(100),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { vault_document_id } = await body<{ vault_document_id?: string }>();
  if (!vault_document_id) return err('vault_document_id is required');

  const doc = await base44.asServiceRole.entities.VaultDocument.get(vault_document_id).catch(() => null);
  if (!doc) return err('Document not found', 404);
  if (doc.deleted_at) return err('This document has been archived', 410);

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  const ownerEmail = doc.owner_email;

  // Verify the caller is the assigned doctor on a case whose patient owns this document.
  let authorized = isAdmin;
  if (!authorized && ownerEmail && user?.email) {
    const cases = await base44.asServiceRole.entities.CaseRecord
      .filter({ client_email: ownerEmail, doctor_email: user.email }, '-created_date', 1)
      .catch(() => []);
    if (cases && cases.length > 0) authorized = true;
  }
  if (!authorized) return err('You are not authorized to download this document', 403);

  // Best available file: combined PDF (multi-page) > processed single page > first original.
  const fileUri = doc.combined_pdf_url || doc.processed_file_url || (doc.original_file_urls || [])[0];
  if (!fileUri) return err('No downloadable file is available for this document', 404);

  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 120,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'vault_document_accessed',
    actor_id: user?.id || '', actor_role: user?.role || 'doctor', actor_name: user?.email || '',
    actor_email: user?.email || '',
    resource_type: 'VaultDocument', resource_id: doc.id, resource_name: `${doc.document_type}`,
    details: { action: 'doctor_download', owner_email: ownerEmail },
    sensitive: true, timestamp: new Date().toISOString(),
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    signed_url,
    document_type: doc.document_type,
    page_count: (doc.original_file_urls || []).length,
  });
}, { name: 'downloadCaseVaultDocument', requireAuth: true, bodySchema: BodySchema }));