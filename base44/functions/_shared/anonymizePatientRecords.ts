/**
 * anonymizePatientRecords — the shared core of every "erase this patient's
 * data" flow (admin-triggered GDPR erasure via deletePatientData, and
 * self-service deletion via deleteMyAccount). Anonymizes PII across every
 * entity keyed to the given email; never hard-deletes CaseRecord/Consultation
 * (financial/medical audit trail is retained, only identity fields are
 * scrubbed).
 *
 * Every field name below was verified against the real entity schemas, not
 * assumed — the previous version of this logic (inline in deletePatientData)
 * silently no-op'd on PassportVault (it used a made-up owner/blob field pair
 * that doesn't exist on the entity — see PassportVault.jsonc for the real
 * ones used here), never revoked a live PassportAccessGrant (it wrote a
 * made-up active-flag field instead of the real `status` gate that
 * downloadFromVault/getPassportAccess actually check), and never matched a
 * single Consultation row (it filtered/wrote CaseRecord-style field names
 * that Consultation.jsonc doesn't have — see that schema for the real ones).
 */
export interface AnonymizeResult {
  deleted: string[];
  anonymized: string[];
  errors: string[];
  redactedEmail: string;
  deletedAt: string;
}

export async function anonymizePatientRecords(
  base44: any,
  email: string,
  reason: string,
): Promise<AnonymizeResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const redactedEmail = `GDPR_DELETED_${Date.now()}@deleted.invalid`;
  const deletedAt = new Date().toISOString();
  const results: { deleted: string[]; anonymized: string[]; errors: string[] } = { deleted: [], anonymized: [], errors: [] };

  // ── PassportVault — the most sensitive category (passports, national IDs) ──
  // Fields verified against PassportVault.jsonc: owner is user_email, the
  // encrypted blob is encrypted_file_uri. Nulling encryption_salt_b64 is what
  // actually blocks downloadFromVault (it 422s before generating a signed URL
  // when salt is missing) — status alone is not checked there.
  const vaults = await base44.asServiceRole.entities.PassportVault.filter(
    { user_email: normalizedEmail }, '-created_date', 50
  ).catch(() => []);
  for (const vault of (vaults || [])) {
    try {
      await base44.asServiceRole.entities.PassportVault.update(vault.id, {
        user_email: redactedEmail,
        encrypted_file_uri: null,
        encryption_iv_b64: null,
        encryption_salt_b64: null,
        integrity_hash: null,
        file_name: 'DELETED',
        status: 'revoked',
      });
      results.anonymized.push(`PassportVault:${vault.id}`);
    } catch (e) {
      results.errors.push(`PassportVault:${vault.id}: ${e?.message}`);
    }
  }

  // ── PassportAccessGrant — the actual gate getPassportAccess checks is the
  // `status` field below, not the made-up active-flag field used previously
  // (which isn't real on this entity). ──
  const grants = await base44.asServiceRole.entities.PassportAccessGrant.filter(
    { patient_email: normalizedEmail }, '-created_date', 50
  ).catch(() => []);
  for (const grant of (grants || [])) {
    try {
      await base44.asServiceRole.entities.PassportAccessGrant.update(grant.id, {
        patient_email: redactedEmail,
        status: 'revoked',
        revoked_at: deletedAt,
        revoked_reason: reason,
      });
      results.anonymized.push(`PassportAccessGrant:${grant.id}`);
    } catch (e) {
      results.errors.push(`PassportAccessGrant:${grant.id}: ${e?.message}`);
    }
  }

  // ── CaseRecord — keep the row (financial/medical audit trail), redact PII ──
  const cases = await base44.asServiceRole.entities.CaseRecord.filter(
    { client_email: normalizedEmail }, '-created_date', 100
  ).catch(() => []);
  for (const c of (cases || [])) {
    try {
      await base44.asServiceRole.entities.CaseRecord.update(c.id, {
        client_email: redactedEmail,
        client_name: 'DELETED',
        client_phone: null,
        emergency_contact: null,
        gdpr_deleted_at: deletedAt,
        gdpr_deletion_reason: reason,
      });
      results.anonymized.push(`CaseRecord:${c.id}`);
    } catch (e) {
      results.errors.push(`CaseRecord:${c.id}: ${e?.message}`);
    }
  }

  // ── Consultation — real fields are email/patient_name/phone, not the
  // client_* names CaseRecord uses. ──
  const consultations = await base44.asServiceRole.entities.Consultation.filter(
    { email: normalizedEmail }, '-created_date', 100
  ).catch(() => []);
  for (const con of (consultations || [])) {
    try {
      await base44.asServiceRole.entities.Consultation.update(con.id, {
        email: redactedEmail,
        patient_name: 'DELETED',
        phone: null,
        gdpr_deleted_at: deletedAt,
      });
      results.anonymized.push(`Consultation:${con.id}`);
    } catch (e) {
      results.errors.push(`Consultation:${con.id}: ${e?.message}`);
    }
  }

  // ── SoloCheckIn ──
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

  // ── User — best-effort, non-blocking. Only trips the AuthContext deletion
  // gate; never touches the built-in login email or any RLS. ──
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail }, '-created_date', 1).catch(() => []);
    const u = users?.[0];
    if (u) {
      await base44.asServiceRole.entities.User.update(u.id, { account_deletion_requested_at: deletedAt });
      results.anonymized.push(`User:${u.id}`);
    }
  } catch (e) {
    results.errors.push(`User: ${e?.message}`);
  }

  return { ...results, redactedEmail, deletedAt };
}
