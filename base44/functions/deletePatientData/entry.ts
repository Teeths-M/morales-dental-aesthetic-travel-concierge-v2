import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins can delete patient data
    const user = await base44.auth.me();
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { patient_email, reason = 'GDPR Article 17 - Right to Erasure' } = body;

    if (!patient_email || typeof patient_email !== 'string') {
      return Response.json({ error: 'patient_email is required' }, { status: 400 });
    }

    const normalizedEmail = patient_email.toLowerCase().trim();
    const redactedEmail = `GDPR_DELETED_${Date.now()}@deleted.invalid`;
    const deletedAt = new Date().toISOString();
    const results = { deleted: [], anonymized: [], errors: [] };

    // 1. Find all consultations for this patient
    const consultations = await base44.asServiceRole.entities.Consultation.filter(
      { client_email: normalizedEmail }, '-created_date', 100
    ).catch(() => []);

    // 2. Find all cases for this patient
    const cases = await base44.asServiceRole.entities.CaseRecord.filter(
      { client_email: normalizedEmail }, '-created_date', 100
    ).catch(() => []);

    // 3. Delete passport vault entries
    const vaults = await base44.asServiceRole.entities.PassportVault.filter(
      { owner_email: normalizedEmail }, '-created_date', 50
    ).catch(() => []);

    for (const vault of (vaults || [])) {
      try {
        await base44.asServiceRole.entities.PassportVault.update(vault.id, {
          encrypted_data: null,
          file_name: 'DELETED',
          owner_email: redactedEmail,
          is_deleted: true,
          deleted_at: deletedAt,
        });
        results.deleted.push(`PassportVault:${vault.id}`);
      } catch (e) {
        results.errors.push(`PassportVault:${vault.id}: ${e?.message}`);
      }
    }

    // 4. Delete passport access grants
    const grants = await base44.asServiceRole.entities.PassportAccessGrant.filter(
      { patient_email: normalizedEmail }, '-created_date', 50
    ).catch(() => []);

    for (const grant of (grants || [])) {
      try {
        await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, {
          patient_email: redactedEmail,
          is_active: false,
          revoked_at: deletedAt,
          revoked_reason: 'GDPR deletion request',
        });
        results.anonymized.push(`PassportAccessGrant:${grant.id}`);
      } catch (e) {
        results.errors.push(`PassportAccessGrant:${grant.id}: ${e?.message}`);
      }
    }

    // 5. Anonymize case records (keep for financial audit, redact PII)
    for (const c of (cases || [])) {
      try {
        await base44.asServiceRole.entities.CaseRecord.update(c.id, {
          client_email: redactedEmail,
          client_name: 'DELETED',
          client_phone: null,
          emergency_contact: null,
          emergency_contact_number: null,
          gdpr_deleted_at: deletedAt,
          gdpr_deletion_reason: reason,
        });
        results.anonymized.push(`CaseRecord:${c.id}`);
      } catch (e) {
        results.errors.push(`CaseRecord:${c.id}: ${e?.message}`);
      }
    }

    // 6. Anonymize consultation records
    for (const con of (consultations || [])) {
      try {
        await base44.asServiceRole.entities.Consultation.update(con.id, {
          client_email: redactedEmail,
          client_name: 'DELETED',
          client_phone: null,
          gdpr_deleted_at: deletedAt,
        });
        results.anonymized.push(`Consultation:${con.id}`);
      } catch (e) {
        results.errors.push(`Consultation:${con.id}: ${e?.message}`);
      }
    }

    // 7. Delete solo check-in records
    const soloCheckIns = await base44.asServiceRole.entities.SoloCheckIn.filter(
      { user_email: normalizedEmail }, '-created_date', 200
    ).catch(() => []);

    for (const ci of (soloCheckIns || [])) {
      try {
        await base44.asServiceRole.entities.SoloCheckIn.update(ci.id, {
          user_email: redactedEmail,
          user_phone: null,
          location_label: null,
        });
        results.anonymized.push(`SoloCheckIn:${ci.id}`);
      } catch (e) {
        results.errors.push(`SoloCheckIn:${ci.id}: ${e?.message}`);
      }
    }

    // 8. Log the deletion to audit trail (immutable record of the deletion itself)
    try {
      await base44.functions.invoke('logAuditEvent', {
        event_type: 'gdpr_deletion',
        performed_by: user.email,
        target_email: normalizedEmail,
        reason,
        records_deleted: results.deleted.length,
        records_anonymized: results.anonymized.length,
        timestamp: deletedAt,
      }).catch(() => {});
    } catch (_) {}

    // 9. Log to GDPRDeletionLog if entity exists
    try {
      await base44.asServiceRole.entities.GDPRDeletionLog.create({
        patient_email: normalizedEmail,
        redacted_to: redactedEmail,
        requested_by: user.email,
        reason,
        records_deleted: results.deleted.length,
        records_anonymized: results.anonymized.length,
        errors_count: results.errors.length,
        completed_at: deletedAt,
      });
    } catch (_) {
      // GDPRDeletionLog entity may not exist yet — non-blocking
    }

    console.log(`[deletePatientData] Completed GDPR deletion for ${normalizedEmail}: ${results.deleted.length} deleted, ${results.anonymized.length} anonymized, ${results.errors.length} errors`);

    return Response.json({
      success: true,
      patient_email: normalizedEmail,
      redacted_to: redactedEmail,
      completed_at: deletedAt,
      summary: {
        deleted: results.deleted.length,
        anonymized: results.anonymized.length,
        errors: results.errors.length,
      },
      errors: results.errors.slice(0, 5), // Return first 5 errors if any
    });

  } catch (err) {
    console.error('[deletePatientData] Unhandled error:', err?.message);
    return Response.json({ error: 'Deletion failed. Contact support.' }, { status: 500 });
  }
});
