import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { computePrevHash } from '../../shared/auditHashChain.ts';

// ── activatePartner ───────────────────────────────────────────────────────────
// The only way a companion, driver or security agency becomes bookable by a
// patient.
//
// WHY THIS EXISTS
// Doctors had activateVerifiedDoctor, which refuses to activate until licence,
// identity and background checks have all positively passed. Companions,
// drivers and security agencies had no equivalent — anything could set their
// status to 'active' and they became assignable.
//
// That is backwards. A doctor sees a patient in a clinic, with staff present
// and a paper trail. A companion is alone with a sedated patient in a hotel
// room at 2am; a driver is alone with them in a car in a country they do not
// know; a security escort is alone with them by definition. Those are the
// three roles where an unvetted person does the most harm, and they were the
// three with the weakest gate.
//
// WHAT IT WILL NOT DO
// It will not activate anyone whose background check has not been positively
// cleared by a human. `initiatePartnerVerification` used to stamp
// background_check_status='passed' off an AI document scan — that has been
// removed, because scanning a document for forgery says nothing about whether
// its holder has a criminal record. 'pending' is not 'passed', and this
// function treats the difference as the whole point.
//
// Deliberately admin-only. There is no auto-activation path here, unlike the
// doctor equivalent: no automated signal available today is strong enough to
// put an unvetted person next to a recovering patient without a human deciding.

const PARTNER_ENTITY: Record<string, string> = {
  companion: 'Companion',
  taxi_service: 'TaxiService',
  security_agency: 'SecurityAgency',
};

// A check counts as cleared only if it was positively verified, or an admin
// explicitly overrode it with documented reasoning. Anything else — including
// the 'pending' default and an unset field — is not cleared.
const PASSED = new Set(['passed', 'manual_override']);

function checksFailing(partner: Record<string, unknown>, partnerType: string): string[] {
  const failing: string[] = [];

  if (!PASSED.has(partner.identity_verification_status as string))
    failing.push(`identity (${partner.identity_verification_status ?? 'not set'})`);
  if (!PASSED.has(partner.background_check_status as string))
    failing.push(`background (${partner.background_check_status ?? 'not set'})`);
  if (!PASSED.has(partner.license_verification_status as string))
    failing.push(`license (${partner.license_verification_status ?? 'not set'})`);

  // A driver carries a patient in a vehicle. If the insurance lapses, the
  // patient has no recovery after a crash — so it is a condition of being
  // bookable, not a nice-to-have. Only checked where the field exists.
  if (partnerType === 'taxi_service' && partner.insurance_verified !== true)
    failing.push(`insurance (${partner.insurance_verified ?? 'not set'})`);

  return failing;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { partner_id, partner_type, override_reason } = await body();

  if (!partner_id || !partner_type) return err('partner_id and partner_type are required');

  const entityName = PARTNER_ENTITY[partner_type];
  if (!entityName) {
    return err(`Unsupported partner_type "${partner_type}". Expected one of: ${Object.keys(PARTNER_ENTITY).join(', ')}`);
  }

  const partner = await base44.asServiceRole.entities[entityName].get(partner_id);
  if (!partner) return err('Partner not found');

  const failing = checksFailing(partner, partner_type);
  if (failing.length > 0) {
    // 422, not 403: the caller is allowed to ask, the partner is not ready.
    // The failing checks are named so an admin knows exactly what to chase,
    // rather than being told "no" with no route forward.
    return new Response(JSON.stringify({
      error: `Cannot activate: the following checks have not been cleared: ${failing.join(', ')}. Each must be positively verified — or explicitly overridden with documented reasoning — before this partner can be assigned to a patient.`,
      failing_checks: failing,
      code: 'CHECKS_NOT_COMPLETE',
    }), { status: 422, headers: { 'Content-Type': 'application/json' } });
  }

  const now = new Date().toISOString();
  const hasOverride = failing.length === 0 && !!override_reason;

  await base44.asServiceRole.entities[entityName].update(partner_id, {
    status: 'active',
    verification_status: 'verified',
    verified_at: now,
    verified_by: user.email,
    verification_notes: hasOverride
      ? `Activated by ${user.email} on ${now}. Override reason: ${override_reason}`
      : `Activated by ${user.email} on ${now}. All checks cleared.`,
  });

  // Append-only, hash-chained. Who activated whom, and when, has to survive —
  // if a partner later harms a patient, this is the record of the decision
  // that let them near one.
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'partner_activated',
    resource_type: partner_type,
    resource_id: partner_id,
    actor_id: user.id,
    actor_name: user.full_name || user.email,
    details: {
      partner_type,
      partner_name: partner.name || partner.company_name || partner.full_name || '',
      identity_verification_status: partner.identity_verification_status ?? null,
      background_check_status: partner.background_check_status ?? null,
      license_verification_status: partner.license_verification_status ?? null,
      insurance_verified: partner.insurance_verified ?? null,
      override_reason: override_reason || null,
    },
    sensitive: true,
    timestamp: now,
    prev_hash: await computePrevHash(base44),
  }).catch(() => {});

  return ok({
    activated: true,
    partner_id,
    partner_type,
    activated_at: now,
  });
}, { name: 'activatePartner', requireAuth: true, allowedRoles: ['admin', 'platform_admin'] }));
