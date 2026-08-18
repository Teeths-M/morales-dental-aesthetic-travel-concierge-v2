import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── listCaseVaultDocuments ─────────────────────────────────────────────────
// The Care Room's "shared documents" list for the assigned doctor. The doctor
// is NOT the owner of the patient's VaultDocuments (the patient is), so the
// VaultDocument RLS blocks a direct SDK read — this function is the only path
// through. It verifies the caller is the doctor actually assigned to a case
// whose patient owns these documents (or an admin), then returns a minimal,
// non-PHI metadata list (type, date, page count, verification state) so the
// doctor can see what's been shared and request a download. The file content
// itself never comes back here — downloadCaseVaultDocument is the only place
// a signed URL is ever minted for a doctor download.

const BodySchema = strictObject({
  case_id: Fields.shortText(100),
});

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { case_id } = await body<{ case_id?: string }>();
  if (!case_id) return err('case_id is required');

  const caseRecord = await base44.asServiceRole.entities.CaseRecord.get(case_id).catch(() => null);
  if (!caseRecord) return err('Case not found', 404);

  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';
  const isAssignedDoctor = !!caseRecord.doctor_email && user?.email === caseRecord.doctor_email;
  if (!isAdmin && !isAssignedDoctor) {
    return err('Only the doctor assigned to this case can view these documents', 403);
  }

  const clientEmail = caseRecord.client_email;
  if (!clientEmail) return ok({ documents: [] });

  const docs = await base44.asServiceRole.entities.VaultDocument
    .filter({ owner_email: clientEmail }, '-created_date', 50)
    .catch(() => []);

  const documents = (docs || [])
    .filter((d: any) => !d.deleted_at)
    .map((d: any) => ({
      id: d.id,
      document_type: d.document_type,
      created_date: d.created_date,
      verification_status: d.verification_status,
      review_status: d.review_status,
      page_count: (d.original_file_urls || []).length,
      has_pdf: !!d.combined_pdf_url,
    }));

  return ok({ documents });
}, { name: 'listCaseVaultDocuments', requireAuth: true, bodySchema: BodySchema }));