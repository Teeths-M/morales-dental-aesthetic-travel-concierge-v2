import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin' && user.role !== 'platform_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider_id, provider_type } = await req.json();

    if (!provider_id || !provider_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await syncVerificationStateToProvider(base44, provider_id, provider_type);

    return Response.json({ success: true, message: 'Verification state synced' });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncVerificationStateToProvider(base44, provider_id, provider_type) {
  try {
    const allChecks = await base44.asServiceRole.entities.ProviderVerification.filter({
      provider_id,
      provider_type
    });

    const identityCheck = allChecks.find(c => c.verification_type === 'identity');
    const backgroundCheck = allChecks.find(c => c.verification_type === 'background_check');
    const licenseCheck = allChecks.find(c => c.verification_type === 'license');

    const identityStatus = identityCheck?.status || 'pending';
    const backgroundStatus = backgroundCheck?.status || 'pending';
    const licenseStatus = licenseCheck?.status || 'pending';

    const identityOverridden = identityCheck?.manual_override_status === 'approved_by_admin';
    const backgroundOverridden = backgroundCheck?.manual_override_status === 'approved_by_admin';
    const licenseOverridden = licenseCheck?.manual_override_status === 'approved_by_admin';

    const allPassed = 
      (identityStatus === 'passed' || identityOverridden) &&
      (backgroundStatus === 'passed' || backgroundOverridden) &&
      (licenseStatus === 'passed' || licenseOverridden);

    const entityMap = {
      doctor: 'Doctor',
      travel_agency: 'TravelAgency',
      taxi_service: 'TaxiService'
    };

    const entityName = entityMap[provider_type];
    if (!entityName) {
      throw new Error(`Unknown provider type: ${provider_type}`);
    }

    await base44.asServiceRole.entities[entityName].update(provider_id, {
      identity_verification_status: identityStatus,
      background_check_status: backgroundStatus,
      license_verification_status: licenseStatus,
      verification_status: allPassed ? 'verified' : (allChecks.length > 0 ? 'verifying' : 'pending_verification'),
      verification_can_be_activated: allPassed
    });

    console.log(`✓ Synced verification state for ${provider_type}:${provider_id}`);

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}