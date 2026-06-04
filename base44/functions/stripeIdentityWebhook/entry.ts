import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    // In production, verify Stripe signature here
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    // const event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    
    const event = JSON.parse(body);

    if (event.type !== 'identity.verification_session.completed') {
      return Response.json({ received: true, skipped: true });
    }

    const base44 = createClientFromRequest(req);
    const verificationSession = event.data.object;
    
    // Extract provider reference from metadata
    const { provider_id, provider_type, provider_email, provider_name } = verificationSession.metadata;
    
    if (!provider_id || !provider_type) {
      return Response.json({ error: 'Missing provider metadata' }, { status: 400 });
    }

    // FIX 1: Idempotency check - skip if already processed
    const existing = await base44.asServiceRole.entities.ProviderVerification.filter({
      external_verification_id: verificationSession.id
    });

    if (existing.length > 0) {
      console.log(`Verification ${verificationSession.id} already processed (idempotent)`);
      return Response.json({ received: true, status: 'already_processed' });
    }

    // Determine verification outcome
    const passed = verificationSession.status === 'verified';
    const riskLevel = passed ? 'low' : 'high';

    // Create ProviderVerification record
    await base44.asServiceRole.entities.ProviderVerification.create({
      provider_id,
      provider_type,
      provider_email,
      provider_name: provider_name || '',
      verification_type: 'identity',
      status: passed ? 'passed' : 'failed',
      external_verification_id: verificationSession.id,
      verification_response: verificationSession,
      result_summary: {
        passed,
        risk_level: riskLevel,
        flags: verificationSession.status === 'failed' 
          ? ['document_verification_failed'] 
          : [],
        expiry_date: null
      },
      initiated_at: new Date(verificationSession.created * 1000).toISOString(),
      completed_at: new Date().toISOString()
    });

    console.log(`✓ Identity verification recorded for ${provider_email}: ${passed ? 'PASSED' : 'FAILED'}`);

    // FIX 3: Sync state to parent provider table
    await syncVerificationStateToProvider(base44, provider_id, provider_type);

    // FIX 2: If identity PASSED, automatically trigger background check
    if (passed) {
      try {
        const checkrResult = await base44.functions.invoke('initiateCheckrScreening', {
          provider_id,
          provider_type,
          provider_email,
          provider_name
        });

        console.log(`✓ Background check initiated for ${provider_email}:`, checkrResult);

        // Log the auto-trigger
        await base44.asServiceRole.entities.ProviderVerification.create({
          provider_id,
          provider_type,
          provider_email,
          provider_name: provider_name || '',
          verification_type: 'background_check',
          status: 'initiated',
          external_verification_id: checkrResult.candidate_id || `bg_${provider_id}_${Date.now()}`,
          initiated_at: new Date().toISOString()
        });

      } catch (error) {
        console.error(`✗ Failed to auto-trigger background check for ${provider_email}:`, error);
        
        // Alert admin
        await base44.integrations.Core.SendEmail({
          to: 'admin@morales.com',
          subject: `⚠️ Auto-Trigger Failed: Background Check for ${provider_email}`,
          body: `The automatic background check initiation failed. Manual intervention needed.\n\nError: ${error.message}`
        });
      }
    } else {
      // Identity failed - alert admin
      await base44.integrations.Core.SendEmail({
        to: 'admin@morales.com',
        subject: `⚠️ Identity Verification Failed: ${provider_email}`,
        body: `Provider ${provider_type} (${provider_email}) failed Stripe Identity verification.\n\nVerification ID: ${verificationSession.id}`
      });
    }

    return Response.json({ received: true, processed: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function syncVerificationStateToProvider(base44, provider_id, provider_type) {
  try {
    // Get all verification checks for this provider
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

    // Check if any are manually overridden
    const identityOverridden = identityCheck?.manual_override_status === 'approved_by_admin';
    const backgroundOverridden = backgroundCheck?.manual_override_status === 'approved_by_admin';
    const licenseOverridden = licenseCheck?.manual_override_status === 'approved_by_admin';

    // All passed (or manually overridden)
    const allPassed = 
      (identityStatus === 'passed' || identityOverridden) &&
      (backgroundStatus === 'passed' || backgroundOverridden) &&
      (licenseStatus === 'passed' || licenseOverridden);

    // Map provider type to entity name
    const entityMap = {
      doctor: 'Doctor',
      travel_agency: 'TravelAgency',
      taxi_service: 'TaxiService'
    };

    const entityName = entityMap[provider_type];
    if (!entityName) {
      throw new Error(`Unknown provider type: ${provider_type}`);
    }

    // Update the parent provider entity
    await base44.asServiceRole.entities[entityName].update(provider_id, {
      identity_verification_status: identityStatus,
      background_check_status: backgroundStatus,
      license_verification_status: licenseStatus,
      verification_status: allPassed ? 'verified' : (allChecks.length > 0 ? 'verifying' : 'pending_verification'),
      verification_can_be_activated: allPassed
    });

    console.log(`✓ Synced verification state for ${provider_type}:${provider_id} - can_activate: ${allPassed}`);

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}