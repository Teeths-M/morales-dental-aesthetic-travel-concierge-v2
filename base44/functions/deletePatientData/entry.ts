import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { anonymizePatientRecords } from '../_shared/anonymizePatientRecords.ts';

/**
 * deletePatientData — admin-triggered GDPR/CCPA erasure for a patient's data.
 * Anonymizes (never hard-deletes) records across every entity keyed to the
 * given email — see _shared/anonymizePatientRecords.ts for exactly what that
 * covers and why each field name there was independently re-verified.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { patient_email, reason = 'GDPR Article 17 - Right to Erasure' } = await body<{
    patient_email?: string; reason?: string;
  }>();

  if (!patient_email || typeof patient_email !== 'string') {
    return err('patient_email is required');
  }

  const normalizedEmail = patient_email.toLowerCase().trim();
  const results = await anonymizePatientRecords(base44, normalizedEmail, reason);

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'gdpr_deletion',
    performed_by: user!.email,
    target_email: normalizedEmail,
    reason,
    records_deleted: results.deleted.length,
    records_anonymized: results.anonymized.length,
    timestamp: results.deletedAt,
  }).catch(() => {});

  // GDPRDeletionLog entity doesn't exist yet — best-effort, non-blocking (unchanged from before).
  await base44.asServiceRole.entities.GDPRDeletionLog.create({
    patient_email: normalizedEmail,
    redacted_to: results.redactedEmail,
    requested_by: user!.email,
    reason,
    records_deleted: results.deleted.length,
    records_anonymized: results.anonymized.length,
    errors_count: results.errors.length,
    completed_at: results.deletedAt,
  }).catch(() => {});

  console.log(`[deletePatientData] Completed GDPR deletion for ${normalizedEmail}: ${results.deleted.length} deleted, ${results.anonymized.length} anonymized, ${results.errors.length} errors`);

  return ok({
    success: true,
    patient_email: normalizedEmail,
    redacted_to: results.redactedEmail,
    completed_at: results.deletedAt,
    summary: {
      deleted: results.deleted.length,
      anonymized: results.anonymized.length,
      errors: results.errors.length,
    },
    errors: results.errors.slice(0, 5),
  });
}, { name: 'deletePatientData', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
