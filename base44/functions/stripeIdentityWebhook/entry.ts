import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyStripeSignature } from '../../shared/verifyStripeSignature.ts';

Deno.serve(async (req) => {
  try {
    // SECURITY: this webhook feeds identity_verification_status directly into the
    // 3-gate doctor/partner activation check — an unverified request here lets an
    // attacker forge "verified" identity for any provider_id. Signature check is mandatory.
    const { event, errorResponse } = await verifyStripeSignature(req, {
      secretEnvVars: ['STRIPE_IDENTITY_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET'],
    });
    if (errorResponse) return errorResponse;

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
        const adminEmail = Deno.env.get('ADMIN_EMAIL');
        if (adminEmail) {
          await base44.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `⚠️ Auto-Trigger Failed: Background Check for ${provider_email}`,
            body: `The automatic background check initiation failed. Manual intervention needed.\n\nError: ${error.message}`
          });
        } else {
          console.error('[stripeIdentityWebhook] ADMIN_EMAIL not set -- background-check auto-trigger failure alert not sent');
        }
      }
    } else {
      // Identity failed - alert admin
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (adminEmail) {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `⚠️ Identity Verification Failed: ${provider_email}`,
          body: `Provider ${provider_type} (${provider_email}) failed Stripe Identity verification.\n\nVerification ID: ${verificationSession.id}`
        });
      } else {
        console.error('[stripeIdentityWebhook] ADMIN_EMAIL not set -- identity-verification-failed alert not sent');
      }
    }

    return Response.json({ received: true, processed: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
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
    const licenseStatus = licenseCheck?.status || 'pending';

    // Check if any are manually overridden
    const identityOverridden = identityCheck?.manual_override_status === 'approved_by_admin';
    const backgroundOverridden = backgroundCheck?.manual_override_status === 'approved_by_admin';
    const licenseOverridden = licenseCheck?.manual_override_status === 'approved_by_admin';

    // SAFETY: nothing automated may ever mark a background check "passed" --
    // only an explicit human review (manual_override_status:'approved_by_admin')
    // may. Today this is inert (initiateCheckrScreening is an admitted stub --
    // see its own comment -- so a real ProviderVerification row can never
    // actually carry status:'passed' from a genuine automated source), but this
    // sync function has no business trusting an upstream status verbatim
    // regardless of how it got there. If a real Checkr integration is ever
    // wired up, a webhook writing 'passed' must still require this same human
    // click before it's ever written here -- an untrusted automated "passed"
    // is downgraded to 'pending' (a valid, honest enum value: no trustworthy
    // answer yet), never silently accepted.
    const rawBackgroundStatus = backgroundCheck?.status || 'pending';
    const backgroundStatus = (rawBackgroundStatus === 'passed' && !backgroundOverridden)
      ? 'pending'
      : rawBackgroundStatus;

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