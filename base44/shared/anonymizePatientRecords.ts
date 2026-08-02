/**
 * anonymizePatientRecords — the shared core of every "erase this patient's
 * data" flow (admin-triggered GDPR erasure via deletePatientData, and
 * self-service deletion via deleteMyAccount). Anonymizes PII across every
 * entity keyed to the given email; only UserPushSubscription is hard-deleted
 * (an anonymized-but-still-active push subscription would keep silently
 * notifying the deleted account's device — everything else retains its row
 * for financial/medical/safety audit trail, with only identity fields
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
 *
 * A later audit found this originally covered only 6 of the ~19 entities
 * that key PII to a patient's email — PaymentTransaction, LiveLocation,
 * LocationBreadcrumb, EmergencyPIN, SOSEvent, GuardianSession, QuoteMessage,
 * SafeTProfile, BehavioralProfile, PostOpCheckIn, UserPushSubscription,
 * DoctorQuoteRequest, and TravelRequest were added after that finding. Where
 * a row also carries a *different* person's email (GuardianSession's
 * guardian_email, QuoteMessage's/PostOpCheckIn's doctor_email), only the
 * patient-side field is touched.
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

  // ── PaymentTransaction — financial audit trail retained, identity scrubbed ──
  const payments = await base44.asServiceRole.entities.PaymentTransaction.filter(
    { client_email: normalizedEmail }, '-created_at', 200
  ).catch(() => []);
  for (const p of (payments || [])) {
    try {
      await base44.asServiceRole.entities.PaymentTransaction.update(p.id, { client_email: redactedEmail });
      results.anonymized.push(`PaymentTransaction:${p.id}`);
    } catch (e) {
      results.errors.push(`PaymentTransaction:${p.id}: ${e?.message}`);
    }
  }

  // ── LiveLocation — GPS trail; redact identity and stop surfacing as current ──
  const liveLocations = await base44.asServiceRole.entities.LiveLocation.filter(
    { user_email: normalizedEmail }, '-updated_at', 50
  ).catch(() => []);
  for (const loc of (liveLocations || [])) {
    try {
      await base44.asServiceRole.entities.LiveLocation.update(loc.id, {
        user_email: redactedEmail,
        is_active: false,
      });
      results.anonymized.push(`LiveLocation:${loc.id}`);
    } catch (e) {
      results.errors.push(`LiveLocation:${loc.id}: ${e?.message}`);
    }
  }

  // ── LocationBreadcrumb — GPS history trail ──
  const breadcrumbs = await base44.asServiceRole.entities.LocationBreadcrumb.filter(
    { patient_email: normalizedEmail }, '-logged_at', 500
  ).catch(() => []);
  for (const b of (breadcrumbs || [])) {
    try {
      await base44.asServiceRole.entities.LocationBreadcrumb.update(b.id, {
        patient_email: redactedEmail,
        patient_name: 'DELETED',
      });
      results.anonymized.push(`LocationBreadcrumb:${b.id}`);
    } catch (e) {
      results.errors.push(`LocationBreadcrumb:${b.id}: ${e?.message}`);
    }
  }

  // ── EmergencyPIN — deactivate along with redacting identity ──
  const pins = await base44.asServiceRole.entities.EmergencyPIN.filter(
    { user_email: normalizedEmail }, '-created_at', 5
  ).catch(() => []);
  for (const pin of (pins || [])) {
    try {
      await base44.asServiceRole.entities.EmergencyPIN.update(pin.id, {
        user_email: redactedEmail,
        is_active: false,
      });
      results.anonymized.push(`EmergencyPIN:${pin.id}`);
    } catch (e) {
      results.errors.push(`EmergencyPIN:${pin.id}: ${e?.message}`);
    }
  }

  // ── SOSEvent — safety audit trail retained, identity scrubbed ──
  const sosEvents = await base44.asServiceRole.entities.SOSEvent.filter(
    { patient_email: normalizedEmail }, '-triggered_at', 100
  ).catch(() => []);
  for (const sos of (sosEvents || [])) {
    try {
      await base44.asServiceRole.entities.SOSEvent.update(sos.id, {
        patient_email: redactedEmail,
        patient_name: 'DELETED',
        patient_phone: null,
      });
      results.anonymized.push(`SOSEvent:${sos.id}`);
    } catch (e) {
      results.errors.push(`SOSEvent:${sos.id}: ${e?.message}`);
    }
  }

  // ── GuardianSession — only the patient side is redacted; guardian_name/
  // guardian_email/guardian_phone belong to a different person, not touched ──
  const guardianSessions = await base44.asServiceRole.entities.GuardianSession.filter(
    { patient_email: normalizedEmail }, '-created_at', 50
  ).catch(() => []);
  for (const gs of (guardianSessions || [])) {
    try {
      await base44.asServiceRole.entities.GuardianSession.update(gs.id, {
        patient_email: redactedEmail,
        patient_name: 'DELETED',
        is_active: false,
        revoked_at: deletedAt,
      });
      results.anonymized.push(`GuardianSession:${gs.id}`);
    } catch (e) {
      results.errors.push(`GuardianSession:${gs.id}: ${e?.message}`);
    }
  }

  // ── QuoteMessage — only patient_email; doctor_email belongs to the other
  // party and message body stays (the doctor's side of the record) ──
  const quoteMessages = await base44.asServiceRole.entities.QuoteMessage.filter(
    { patient_email: normalizedEmail }, '-created_at', 500
  ).catch(() => []);
  for (const qm of (quoteMessages || [])) {
    try {
      await base44.asServiceRole.entities.QuoteMessage.update(qm.id, { patient_email: redactedEmail });
      results.anonymized.push(`QuoteMessage:${qm.id}`);
    } catch (e) {
      results.errors.push(`QuoteMessage:${qm.id}: ${e?.message}`);
    }
  }

  // ── SafeTProfile — clinical content retained (no longer linkable once
  // identity is scrubbed), identity fields redacted ──
  const safeTProfiles = await base44.asServiceRole.entities.SafeTProfile.filter(
    { patient_email: normalizedEmail }, '-created_at', 50
  ).catch(() => []);
  for (const sp of (safeTProfiles || [])) {
    try {
      await base44.asServiceRole.entities.SafeTProfile.update(sp.id, {
        patient_email: redactedEmail,
        patient_name: 'DELETED',
      });
      results.anonymized.push(`SafeTProfile:${sp.id}`);
    } catch (e) {
      results.errors.push(`SafeTProfile:${sp.id}: ${e?.message}`);
    }
  }

  // ── BehavioralProfile — MedGuard fingerprint, identity redacted ──
  const behavioralProfiles = await base44.asServiceRole.entities.BehavioralProfile.filter(
    { user_email: normalizedEmail }, '-last_signal_at', 20
  ).catch(() => []);
  for (const bp of (behavioralProfiles || [])) {
    try {
      await base44.asServiceRole.entities.BehavioralProfile.update(bp.id, { user_email: redactedEmail });
      results.anonymized.push(`BehavioralProfile:${bp.id}`);
    } catch (e) {
      results.errors.push(`BehavioralProfile:${bp.id}: ${e?.message}`);
    }
  }

  // ── PostOpCheckIn — only patient_email/patient_name; doctor_email belongs
  // to the other party ──
  const postOpCheckIns = await base44.asServiceRole.entities.PostOpCheckIn.filter(
    { patient_email: normalizedEmail }, '-scheduled_at', 20
  ).catch(() => []);
  for (const po of (postOpCheckIns || [])) {
    try {
      await base44.asServiceRole.entities.PostOpCheckIn.update(po.id, {
        patient_email: redactedEmail,
        patient_name: 'DELETED',
      });
      results.anonymized.push(`PostOpCheckIn:${po.id}`);
    } catch (e) {
      results.errors.push(`PostOpCheckIn:${po.id}: ${e?.message}`);
    }
  }

  // ── UserPushSubscription — hard-deleted, not anonymized: its only purpose
  // is ongoing notification delivery, so an "anonymized" row would keep
  // silently pushing notifications to the deleted account's device. ──
  const pushSubs = await base44.asServiceRole.entities.UserPushSubscription.filter(
    { user_email: normalizedEmail }, undefined, 20
  ).catch(() => []);
  for (const sub of (pushSubs || [])) {
    try {
      await base44.asServiceRole.entities.UserPushSubscription.delete(sub.id);
      results.deleted.push(`UserPushSubscription:${sub.id}`);
    } catch (e) {
      results.errors.push(`UserPushSubscription:${sub.id}: ${e?.message}`);
    }
  }

  // ── DoctorQuoteRequest — patient_first_name + email redacted; country is
  // not independently identifying and stays for the doctor-side record ──
  const doctorQuoteRequests = await base44.asServiceRole.entities.DoctorQuoteRequest.filter(
    { patient_email: normalizedEmail }, undefined, 50
  ).catch(() => []);
  for (const dq of (doctorQuoteRequests || [])) {
    try {
      await base44.asServiceRole.entities.DoctorQuoteRequest.update(dq.id, {
        patient_email: redactedEmail,
        patient_first_name: 'DELETED',
      });
      results.anonymized.push(`DoctorQuoteRequest:${dq.id}`);
    } catch (e) {
      results.errors.push(`DoctorQuoteRequest:${dq.id}: ${e?.message}`);
    }
  }

  // ── TravelRequest — travel/logistics record retained, identity redacted ──
  const travelRequests = await base44.asServiceRole.entities.TravelRequest.filter(
    { user_email: normalizedEmail }, '-created_at', 50
  ).catch(() => []);
  for (const tr of (travelRequests || [])) {
    try {
      await base44.asServiceRole.entities.TravelRequest.update(tr.id, {
        user_email: redactedEmail,
        user_name: 'DELETED',
        user_phone: null,
      });
      results.anonymized.push(`TravelRequest:${tr.id}`);
    } catch (e) {
      results.errors.push(`TravelRequest:${tr.id}: ${e?.message}`);
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
