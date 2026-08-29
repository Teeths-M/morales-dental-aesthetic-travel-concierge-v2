import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyStripeSignature } from '../../shared/verifyStripeSignature.ts';
import { syncVerificationStateToProvider } from '../../shared/providerVerificationSync.ts';

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