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

    // Get partner details
    let partner;
    if (partner_type === 'doctor') {
      const partners = await base44.entities.Doctor.filter({ id: partner_id });
      partner = partners[0];
    } else if (partner_type === 'travel_agency') {
      const partners = await base44.entities.TravelAgency.filter({ id: partner_id });
      partner = partners[0];
    } else if (partner_type === 'taxi_service') {
      const partners = await base44.entities.TaxiService.filter({ id: partner_id });
      partner = partners[0];
    } else if (partner_type === 'companion') {
      const partners = await base44.entities.Companion.filter({ id: partner_id });
      partner = partners[0];
    }

    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Create verification record
    const verification = await base44.entities.PartnerVerification.create({
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

    // Auto-decision based on fraud score
    if (fraud_score < 30) {
      newStatus = 'verified';
      autoVerified = true;
      verifiedAt = now;
    } else if (fraud_score >= 30 && fraud_score <= 70) {
      newStatus = 'manual_review';
    } else if (fraud_score > 70) {
      newStatus = 'denied';
    }

    await base44.entities.PartnerVerification.update(verification.id, {
      verification_status: newStatus,
      ai_fraud_score: fraud_score,
      ai_fraud_indicators: fraud_indicators,
      ai_analysis_completed_at: now,
      auto_verified: autoVerified,
      verified_by: verifiedBy,
      verified_at: verifiedAt,
      updated_at: now
    });

    // Update partner verification status
    const partnerUpdate = {
      verification_status: newStatus,
      verification_confidence: 100 - fraud_score,
      verification_notes: `AI Analysis: ${fraud_indicators.length} indicators detected. Score: ${fraud_score}/100`,
      updated_at: now
    };

    if (newStatus === 'verified') {
      partnerUpdate.verification_can_be_activated = true;
      partnerUpdate.status = 'active';
    }

    if (partner_type === 'doctor') {
      await base44.entities.Doctor.update(partner_id, partnerUpdate);
    } else if (partner_type === 'travel_agency') {
      await base44.entities.TravelAgency.update(partner_id, partnerUpdate);
    } else if (partner_type === 'taxi_service') {
      await base44.entities.TaxiService.update(partner_id, partnerUpdate);
    } else if (partner_type === 'companion') {
      await base44.entities.Companion.update(partner_id, partnerUpdate);
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
    if (newStatus === 'verified') {
      await base44.integrations.Core.SendEmail({
        to: partner.email,
        subject: '✅ Verification Complete - You Are Now Verified!',
        body: `<p>Congratulations! Your verification has been completed successfully.</p>
               <p>You now have the "Verified by Morales" badge on your profile.</p>
               <p>Verification ID: ${verification.id}</p>`
      });
    } else if (newStatus === 'manual_review') {
      await base44.integrations.Core.SendEmail({
        to: partner.email,
        subject: 'Verification Under Review',
        body: `<p>Your verification is being reviewed by our team.</p>
               <p>This typically takes 24-48 hours. We'll notify you once complete.</p>`
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});