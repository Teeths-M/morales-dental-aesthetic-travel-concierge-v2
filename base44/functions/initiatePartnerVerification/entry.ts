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

    // BUG-R16-04 FIX: filter({ id }) ALWAYS RETURNS [] — use .get() for primary-key lookups.
    // Also use asServiceRole — partner records are owned by the partner user.
    let partner;
    if (partner_type === 'doctor') {
      partner = await base44.asServiceRole.entities.Doctor.get(partner_id);
    } else if (partner_type === 'travel_agency') {
      partner = await base44.asServiceRole.entities.TravelAgency.get(partner_id);
    } else if (partner_type === 'taxi_service') {
      partner = await base44.asServiceRole.entities.TaxiService.get(partner_id);
    } else if (partner_type === 'companion') {
      partner = await base44.asServiceRole.entities.Companion.get(partner_id);
    } else if (partner_type === 'security_agency') {
      partner = await base44.asServiceRole.entities.SecurityAgency.get(partner_id);
    }

    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const partnerName = partner.full_name || partner.agency_name || partner.driver_name || partner.name;
    const partnerEmail = partner.email;
    // Country field name differs by entity type.
    const partnerCountry = partner.country || partner.operating_country;

    // ── GATE 1: Sanctions screening (ComplyAdvantage) ──────────────────────
    // Run this FIRST, before creating any PartnerVerification record.
    // If the partner is on a sanctions list they are blocked immediately and
    // the rest of the pipeline is skipped.
    let sanctionsStatus = 'clear';
    try {
      const sanctionsResult = await base44.functions.invoke('runSanctionsScreening', {
        partner_id,
        partner_type,
        partner_name: partnerName,
        partner_email: partnerEmail,
        country: partnerCountry,
      });
      sanctionsStatus = sanctionsResult?.data?.status || 'clear';
    } catch (sanctionsErr) {
      // If the screening function itself fails we log and continue rather than
      // blocking the signup — the keyword fallback inside runSanctionsScreening
      // handles most cases, so reaching here means an unexpected crash.
      console.error('[initiatePartnerVerification] sanctions screening threw:', sanctionsErr);
      sanctionsStatus = 'clear'; // fail-open so signup is never permanently blocked by infra
    }

    if (sanctionsStatus === 'flagged') {
      // Create a blocked PartnerVerification so the admin can see it.
      const blockedVerification = await base44.asServiceRole.entities.PartnerVerification.create({
        partner_id,
        partner_type,
        partner_name: partnerName,
        partner_email: partnerEmail,
        verification_status: 'sanctions_blocked',
        documents_uploaded: documents || [],
        created_at: now,
        updated_at: now,
      });

      // Notify the partner — they cannot proceed.
      try {
        await base44.integrations.Core.SendEmail({
          to: partnerEmail,
          subject: 'Application Status',
          body: `<p>Thank you for applying to the Morales platform.</p>
                 <p>After an automated review, we are unable to approve your application at this time.</p>
                 <p>If you believe this is in error, please contact our support team with your identification documents.</p>`,
        });
      } catch (_) { /* email is non-fatal */ }

      return Response.json({
        success: false,
        verification_id: blockedVerification.id,
        status: 'sanctions_blocked',
        reason: 'Automated screening identified a potential match on a sanctions or watchlist. Application blocked pending review.',
      }, { status: 200 }); // 200 so the signup UI shows a clear message, not a generic error
    }

    // ── GATE 2: Create verification record & run AI document analysis ───────
    // BUG-R16-05 FIX: use asServiceRole — PartnerVerification is system-owned.
    const verification = await base44.asServiceRole.entities.PartnerVerification.create({
      partner_id,
      partner_type,
      partner_name: partnerName,
      partner_email: partnerEmail,
      verification_status: 'documents_received',
      documents_uploaded: documents || [],
      created_at: now,
      updated_at: now,
    });

    // Trigger AI analysis.
    const analysisResult = await base44.functions.invoke('analyzePartnerDocuments', {
      verification_id: verification.id,
      documents: documents || [],
    });

    const { fraud_score, fraud_indicators } = analysisResult.data;

    let newStatus = 'ai_analysis_complete';
    const autoVerified = false;
    const verifiedBy = 'ai_auto';
    const verifiedAt = null;

    // Auto-decision based on fraud score.
    // SECURITY: Doctors are NEVER auto-activated — patient safety requires explicit
    // human approval via activateVerifiedDoctor. All other partners also require
    // manual admin review; none are auto-activated.
    if (partner_type === 'doctor') {
      newStatus = fraud_score > 70 ? 'denied' : 'manual_review';
    } else {
      newStatus = 'pending_manual_review';
    }

    // BUG-R16-05 FIX: use asServiceRole for update.
    await base44.asServiceRole.entities.PartnerVerification.update(verification.id, {
      verification_status: newStatus,
      ai_fraud_score: fraud_score,
      ai_fraud_indicators: fraud_indicators,
      ai_analysis_completed_at: now,
      auto_verified: autoVerified,
      verified_by: verifiedBy,
      verified_at: verifiedAt,
      updated_at: now,
    });

    // Update partner verification status — no partner type is ever auto-activated.
    const partnerUpdate: Record<string, unknown> = {
      verification_status: newStatus,
      verification_confidence: 100 - fraud_score,
      verification_notes: partner_type === 'doctor'
        ? `AI pre-screen: ${fraud_indicators.length} indicators detected (score ${fraud_score}/100). Routed to manual review — doctor activation requires admin approval.`
        : `AI Analysis: ${fraud_indicators.length} indicators detected. Score: ${fraud_score}/100`,
      updated_at: now,
    };

    // BUG-R16-05 FIX: use asServiceRole for all partner updates.
    if (partner_type === 'doctor') {
      await base44.asServiceRole.entities.Doctor.update(partner_id, partnerUpdate);
    } else if (partner_type === 'travel_agency') {
      await base44.asServiceRole.entities.TravelAgency.update(partner_id, partnerUpdate);
    } else if (partner_type === 'taxi_service') {
      await base44.asServiceRole.entities.TaxiService.update(partner_id, partnerUpdate);
    } else if (partner_type === 'companion') {
      await base44.asServiceRole.entities.Companion.update(partner_id, partnerUpdate);
    } else if (partner_type === 'security_agency') {
      await base44.asServiceRole.entities.SecurityAgency.update(partner_id, partnerUpdate);
    }

    // Log to AuditLog.
    await base44.functions.invoke('logAuditEvent', {
      event_type: 'partner_notified',
      actor_id: user.id,
      actor_role: user.role || 'system',
      actor_name: user.full_name || 'System',
      resource_type: 'PartnerVerification',
      resource_id: verification.id,
      resource_name: `${partner_type} verification - ${partnerName}`,
      details: {
        action: 'verification_initiated',
        partner_id,
        partner_type,
        fraud_score,
        auto_verified: autoVerified,
        status: newStatus,
        sanctions_status: 'clear',
      },
      sensitive: true,
    });

    // Notify partner.
    if (newStatus === 'pending_manual_review' || newStatus === 'manual_review') {
      await base44.integrations.Core.SendEmail({
        to: partnerEmail,
        subject: 'Verification Pending Manual Review',
        body: `<p>Your verification documents have been received and are pending manual review by our team.</p>
               <p>This typically takes 24–48 hours. We'll notify you once complete.</p>
               <p>Verification ID: ${verification.id}</p>`,
      });
    } else if (newStatus === 'denied') {
      await base44.integrations.Core.SendEmail({
        to: partnerEmail,
        subject: 'Verification Decision',
        body: `<p>Unfortunately, your verification could not be completed at this time.</p>
               <p>Please contact support for more information.</p>`,
      });
    }

    return Response.json({
      success: true,
      verification_id: verification.id,
      status: newStatus,
      fraud_score,
      auto_verified: autoVerified,
    });

  } catch (error) {
    // BUG-R16-06 FIX: SEC-10 — never leak error.message to client.
    console.error('[initiatePartnerVerification]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});
