import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { partner_id, partner_type, documents } = await req.json();

    if (!partner_id || !partner_type) {
      return Response.json({ error: 'partner_id and partner_type required' }, { status: 400 });
    }

    // BUG-R16-04 FIX: filter({ id: partner_id }) ALWAYS RETURNS [] — SDK cannot query
    // the built-in `id` field via filter(). Every partner lookup fails with 404.
    // Also: use asServiceRole — partner records are owned by the partner user, not the
    // admin triggering verification, so user-scoped entities returns nothing.
    // Fix: use .get() with asServiceRole for direct primary-key lookup.
    let partner;
    if (partner_type === 'doctor') {
      partner = await base44.asServiceRole.entities.Doctor.get(partner_id);
    } else if (partner_type === 'travel_agency') {
      partner = await base44.asServiceRole.entities.TravelAgency.get(partner_id);
    } else if (partner_type === 'taxi_service') {
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
    } else if (partner_type === 'companion') {
      partner = await base44.asServiceRole.entities.Companion.get(partner_id);
    }

    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // BUG-R16-05 FIX: use asServiceRole — PartnerVerification is system-owned,
    // not user-owned; user-scoped create can fail on cross-user partner data.
    const verification = await base44.asServiceRole.entities.PartnerVerification.create({
      partner_id,
      partner_type,
      partner_name: partner.full_name || partner.agency_name || partner.driver_name || partner.name,
      partner_email: partner.email,
      verification_status: 'documents_received',
      documents_uploaded: documents || [],
      created_at: now,
      updated_at: now
    });

    // Trigger AI analysis
    const analysisResult = await base44.functions.invoke('analyzePartnerDocuments', {
      verification_id: verification.id,
      documents: documents || []
    });

    // Update with AI results
    const { fraud_score, fraud_indicators } = analysisResult.data;
    
    let newStatus = 'ai_analysis_complete';
    let autoVerified = false;
    let verifiedBy = 'ai_auto';
    let verifiedAt = null;

    // Auto-decision based on fraud score.
    // SECURITY: Doctors are NEVER auto-activated regardless of fraud score —
    // patient safety requires explicit human approval via activateVerifiedDoctor.
    // For non-doctor partners the AI decision is retained.
    if (partner_type === 'doctor') {
      // Doctors always go to manual review, even if AI scores them clean.
      // Low fraud score is a positive signal that is surfaced to the admin,
      // but it is not a substitute for a human reviewing medical credentials.
      newStatus = fraud_score > 70 ? 'denied' : 'manual_review';
      autoVerified = false;
    } else {
      // Never auto-activate — all partners require manual admin review
      newStatus = 'pending_manual_review';
      autoVerified = false;
      // partnerUpdate.status stays as 'pending' — admin must approve
    }

    // BUG-R16-05 FIX: use asServiceRole for update
    await base44.asServiceRole.entities.PartnerVerification.update(verification.id, {
      verification_status: newStatus,
      ai_fraud_score: fraud_score,
      ai_fraud_indicators: fraud_indicators,
      ai_analysis_completed_at: now,
      auto_verified: autoVerified,
      verified_by: verifiedBy,
      verified_at: verifiedAt,
      updated_at: now
    });

    // Update partner verification status — doctors never get status='active' here
    const partnerUpdate: Record<string, unknown> = {
      verification_status: newStatus,
      verification_confidence: 100 - fraud_score,
      verification_notes: partner_type === 'doctor'
        ? `AI pre-screen: ${fraud_indicators.length} indicators detected (score ${fraud_score}/100). Routed to manual review — doctor activation requires admin approval.`
        : `AI Analysis: ${fraud_indicators.length} indicators detected. Score: ${fraud_score}/100`,
      updated_at: now
    };

    // No partner type is ever auto-activated — all require manual admin approval

    // BUG-R16-05 FIX: use asServiceRole for all partner updates
    if (partner_type === 'doctor') {
      await base44.asServiceRole.entities.Doctor.update(partner_id, partnerUpdate);
    } else if (partner_type === 'travel_agency') {
      await base44.asServiceRole.entities.TravelAgency.update(partner_id, partnerUpdate);
    } else if (partner_type === 'taxi_service') {
      await base44.asServiceRole.entities.TaxiService.update(partner_id, partnerUpdate);
    } else if (partner_type === 'companion') {
      await base44.asServiceRole.entities.Companion.update(partner_id, partnerUpdate);
    }

    // Log to AuditLog
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'partner_notified',
      actor_id: user.id,
      actor_role: user.role || 'system',
      actor_name: user.full_name || 'System',
      resource_type: 'PartnerVerification',
      resource_id: verification.id,
      resource_name: `${partner_type} verification - ${partner.partner_name}`,
      details: {
        action: 'verification_initiated',
        partner_id,
        partner_type,
        fraud_score,
        auto_verified: autoVerified,
        status: newStatus,
      },
      sensitive: true,
    });

    // Send notification to partner
    if (newStatus === 'pending_manual_review' || newStatus === 'manual_review') {
      await base44.integrations.Core.SendEmail({
        to: partner.email,
        subject: 'Verification Pending Manual Review',
        body: `<p>Your verification documents have been received and are pending manual review by our team.</p>
               <p>This typically takes 24-48 hours. We'll notify you once complete.</p>
               <p>Verification ID: ${verification.id}</p>`
      });
    } else if (newStatus === 'denied') {
      await base44.integrations.Core.SendEmail({
        to: partner.email,
        subject: 'Verification Decision',
        body: `<p>Unfortunately, your verification could not be completed at this time.</p>
               <p>Please contact support for more information.</p>`
      });
    }

    return Response.json({
      success: true,
      verification_id: verification.id,
      status: newStatus,
      fraud_score,
      auto_verified: autoVerified
    });

  } catch (error) {
    // BUG-R16-06 FIX: SEC-10
    console.error('[initiatePartnerVerification]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});