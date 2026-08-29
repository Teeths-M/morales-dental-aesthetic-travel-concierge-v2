// ── providerVerificationSync ────────────────────────────────────────────────
// The one real implementation of "roll up a provider's ProviderVerification
// records onto their own entity record" — identity, background check, and
// license, all three.
//
// This used to be duplicated inline in two different files
// (stripeIdentityWebhook and syncProviderVerificationState), and the two
// copies drifted: only one of them carried the safety guard below. Extracted
// here so there is exactly one place this logic can live, and exactly one
// place a future change to it has to happen.
//
// SAFETY: nothing automated may ever mark a background check "passed" --
// only an explicit human review (manual_override_status:'approved_by_admin')
// may. Today this is inert (initiateCheckrScreening is an admitted stub --
// see its own comment -- so a real ProviderVerification row can never
// actually carry status:'passed' from a genuine automated source), but this
// sync function has no business trusting an upstream status verbatim
// regardless of how it got there. If a real Checkr integration is ever wired
// up, a webhook writing 'passed' must still require this same human click
// before it's ever written here -- an untrusted automated "passed" is
// downgraded to 'pending' (a valid, honest enum value: no trustworthy answer
// yet), never silently accepted.

const ENTITY_MAP: Record<string, string> = {
  doctor: 'Doctor',
  travel_agency: 'TravelAgency',
  taxi_service: 'TaxiService',
};

export async function syncVerificationStateToProvider(
  base44: any,
  provider_id: string,
  provider_type: string,
): Promise<void> {
  const allChecks = await base44.asServiceRole.entities.ProviderVerification.filter({
    provider_id,
    provider_type,
  });

  const identityCheck = allChecks.find((c: any) => c.verification_type === 'identity');
  const backgroundCheck = allChecks.find((c: any) => c.verification_type === 'background_check');
  const licenseCheck = allChecks.find((c: any) => c.verification_type === 'license');

  const identityStatus = identityCheck?.status || 'pending';
  const licenseStatus = licenseCheck?.status || 'pending';

  const identityOverridden = identityCheck?.manual_override_status === 'approved_by_admin';
  const backgroundOverridden = backgroundCheck?.manual_override_status === 'approved_by_admin';
  const licenseOverridden = licenseCheck?.manual_override_status === 'approved_by_admin';

  const rawBackgroundStatus = backgroundCheck?.status || 'pending';
  const backgroundStatus = (rawBackgroundStatus === 'passed' && !backgroundOverridden)
    ? 'pending'
    : rawBackgroundStatus;

  const allPassed =
    (identityStatus === 'passed' || identityOverridden) &&
    (backgroundStatus === 'passed' || backgroundOverridden) &&
    (licenseStatus === 'passed' || licenseOverridden);

  const entityName = ENTITY_MAP[provider_type];
  if (!entityName) {
    throw new Error(`Unknown provider type: ${provider_type}`);
  }

  await base44.asServiceRole.entities[entityName].update(provider_id, {
    identity_verification_status: identityStatus,
    background_check_status: backgroundStatus,
    license_verification_status: licenseStatus,
    verification_status: allPassed ? 'verified' : (allChecks.length > 0 ? 'verifying' : 'pending_verification'),
    verification_can_be_activated: allPassed,
  });
}
