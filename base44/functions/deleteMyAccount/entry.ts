import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { anonymizePatientRecords } from '../../shared/anonymizePatientRecords.ts';

/**
 * deleteMyAccount — self-service account deletion (Google Play compliance:
 * apps with login must offer in-app deletion). Instant, no grace period —
 * matches the existing admin GDPR-erasure precedent exactly.
 *
 * SECURITY: the target is always the caller's own session email
 * (`user.email`), never a client-supplied field — this is what stops any
 * logged-in user from deleting someone else's account. Do not add an
 * email/target_email/patient_email body parameter to this function.
 */
Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { confirm, confirm_email } = await body<{ confirm?: boolean; confirm_email?: string }>();

  if (confirm !== true) {
    return err('confirm must be true');
  }
  const targetEmail = user!.email.toLowerCase().trim();
  if (typeof confirm_email !== 'string' || confirm_email.toLowerCase().trim() !== targetEmail) {
    return err('The email you entered does not match your account.');
  }

  const results = await anonymizePatientRecords(base44, targetEmail, 'Self-service account deletion');

  await base44.functions.invoke('logAuditEvent', {
    event_type: 'account_deletion_completed',
    target_email: targetEmail,
    records_deleted: results.deleted.length,
    records_anonymized: results.anonymized.length,
  }).catch(() => {});

  return ok({ success: true, completed_at: results.deletedAt });
}, { name: 'deleteMyAccount', requireAuth: true }));
