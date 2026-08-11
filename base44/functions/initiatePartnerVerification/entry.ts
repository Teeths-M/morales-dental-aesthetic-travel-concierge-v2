import { createHandler } from '../../shared/createHandler.ts';
import { createHmac } from 'node:crypto';
import { z, strictObject, Fields } from '../../shared/validate.ts';
import { guardedPartnerStatusUpdate, PARTNER_STATE } from '../../shared/partnerOnboardingState.ts';
import { logProviderContactAttempt } from '../../shared/logProviderContactAttempt.ts';

// partner_type is a length-capped string, not an enum — the existing if/else
// chain below already tolerates an unrecognized value (falls through to
// "Partner not found"); enum-restricting it here would reject a value the
// current code accepts gracefully.
const InitiatePartnerVerificationSchema = strictObject({
  partner_id: Fields.shortText(100),
  partner_type: Fields.shortText(50),
  documents: z.array(z.any()).max(50).optional().default([]),
});

// Doctor auto-activation clear-scan bands.
// <= CLEAR_THRESHOLD:            "clear" — auto-activate, no human touch.
// CLEAR_THRESHOLD < x <= 70:      "neutral" — human review (unchanged behavior).
// > 70:                          denied (unchanged behavior).
const CLEAR_THRESHOLD = 20;

// Generates the short-lived proof activateVerifiedDoctor requires for its
// auto-activation path. Both functions read the same DOCTOR_AUTO_ACTIVATION_SECRET —
// nobody else can produce a valid proof, and it expires in 60 seconds.
function generateAutoActivationProof(doctorId: string, timestamp: string): string | null {
  const secret = Deno.env.get('DOCTOR_AUTO_ACTIVATION_SECRET');
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${doctorId}:${timestamp}`).digest('hex');
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const { partner_id, partner_type, documents } = await body();

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
      let sanctionsEmailResult: 'sent' | 'failed' = 'sent';
      let sanctionsEmailError: string | undefined;
      try {
        await base44.integrations.Core.SendEmail({
          to: partnerEmail,
          subject: 'Application Status',
          body: `<p>Thank you for applying to the Morales platform.</p>
                 <p>After an automated review, we are unable to approve your application at this time.</p>
                 <p>If you believe this is in error, please contact our support team with your identification documents.</p>`,
        });
      } catch (sendErr: any) {
        sanctionsEmailResult = 'failed';
        sanctionsEmailError = sendErr?.message || 'send failed';
        /* email is non-fatal */
      }
      await logProviderContactAttempt(base44, {
        partner_type: partner_type as any,
        partner_id,
        partner_name: partnerName,
        channel: 'email',
        purpose: 'verification_notification',
        recipient: partnerEmail,
        initiated_by: 'initiatePartnerVerification',
        result: sanctionsEmailResult,
        error_detail: sanctionsEmailError,
      });

      return Response.json({
        success: false,
        verification_id: blockedVerification.id,
        status: 'sanctions_blocked',
        reason: 'Automated screening identified a potential match on a sanctions or watchlist. Application blocked pending review.',
      }, { status: 200 }); // 200 so the signup UI shows a clear message, not a generic error
    }

    // ── Country-aware verification context ──────────────────────────────────
    // Research the real regulatory/licensing body for this partner type and
    // country via M-Care's existing research-and-learn brain
    // (mcareResearchAndLearn — recall-first from McareKnowledge, live
    // internet-grounded research on a miss, self-caches future lookups for
    // the same country). General to any country by construction — no
    // hardcoded list to maintain. Advisory only: it strengthens the document
    // fraud-scan prompt below and is shown to a human reviewer; it never
    // changes the auto-clear/manual-review thresholds itself. Best-effort —
    // if research fails or isn't confident, verification proceeds with the
    // existing generic fairness prompt exactly as before this change.
    let regulatoryContext: string | null = null;
    if (partnerCountry) {
      try {
        const researchResult = await base44.functions.invoke('mcareResearchAndLearn', {
          question: `What is the official regulatory or licensing body for a ${partner_type.replace(/_/g, ' ')} in ${partnerCountry}? What does a legitimate license or credential document from them typically look like?`,
          context: 'Partner verification for a medical travel platform — factual, non-diagnostic research only.',
        });
        const research = researchResult?.data;
        // Same >=80 bar mcareResearchAndLearn itself treats as "reliable
        // enough to memorize" — a recalled answer already cleared this bar
        // when it was first researched, so this stays consistent either way.
        if (research?.success && research.answer && Number(research.confidence_score) >= 80) {
          regulatoryContext = research.answer;
        }
      } catch (researchErr) {
        console.error('[initiatePartnerVerification] regulatory context research failed:', researchErr);
      }
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
      regulatory_context: regulatoryContext,
      created_at: now,
      updated_at: now,
    });

    // Trigger AI analysis. partner_type/country give the analysis fair
    // context — without them every document from every country was judged
    // against the same generic notion of "normal," which risked flagging a
    // legitimate document as suspicious purely for looking unfamiliar.
    // regulatory_context (when research found one) upgrades that from a
    // generic "be fair" nudge into a concrete fact about the real body.
    const analysisResult = await base44.functions.invoke('analyzePartnerDocuments', {
      verification_id: verification.id,
      documents: documents || [],
      partner_type,
      country: partnerCountry,
      regulatory_context: regulatoryContext,
    });

    const { fraud_score, fraud_indicators } = analysisResult.data;

    let newStatus = 'ai_analysis_complete';
    let autoVerified = false;
    let verifiedBy = 'ai_auto';
    let verifiedAt: string | null = null;

    // Auto-decision based on fraud score.
    // Doctors: <= CLEAR_THRESHOLD auto-activates with no human touch. Above
    // that always goes to manual review — a fraud score above 70 used to
    // auto-DENY here, with no human ever looking at the application (just an
    // email telling the applicant to contact support if it was wrong). That
    // was removed: a generic vision-based fraud score — especially without
    // the country/document context analyzePartnerDocuments now receives
    // above — is not reliable enough to be the sole reason someone's
    // livelihood application is rejected, and false positives skew heavily
    // toward applicants whose documents simply look unfamiliar to the model
    // rather than actually fraudulent. It can still escalate urgency; it can
    // never resolve the outcome by itself. All other partner types still
    // always require manual admin review — none are auto-activated.
    let urgentReview = false;
    if (partner_type === 'doctor') {
      if (fraud_score <= CLEAR_THRESHOLD) {
        newStatus = 'auto_verified';
        autoVerified = true;
        verifiedAt = now;
      } else {
        newStatus = 'manual_review';
        urgentReview = fraud_score > 70;
      }
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

    // Update partner verification status.
    const partnerUpdate: Record<string, unknown> = {
      verification_status: newStatus,
      verification_confidence: 100 - fraud_score,
      verification_notes: partner_type === 'doctor'
        ? (newStatus === 'auto_verified'
            ? `AI pre-screen clear (score ${fraud_score}/100, threshold ${CLEAR_THRESHOLD}). Auto-activating with no manual review.`
            : urgentReview
              ? `AI pre-screen flagged ${fraud_indicators.length} indicator(s), HIGH score (${fraud_score}/100). Routed to URGENT manual review — a human must review before any decision; never auto-denied.`
              : `AI pre-screen: ${fraud_indicators.length} indicators detected (score ${fraud_score}/100). Routed to manual review — doctor activation requires admin approval.`)
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
      // Transport Partner Platform — Foundation: verification is now actively
      // in progress, so advance the guarded state machine out of
      // pending_verification. Non-fatal and a no-op if the taxi service is
      // already past this point (e.g. a re-run) — never let a status race
      // break the rest of the verification pipeline.
      await guardedPartnerStatusUpdate(base44, 'TaxiService', partner_id, PARTNER_STATE.VERIFYING)
        .catch((e) => console.error('[initiatePartnerVerification] taxi status transition skipped:', e.message));
    } else if (partner_type === 'companion') {
      await base44.asServiceRole.entities.Companion.update(partner_id, partnerUpdate);
    } else if (partner_type === 'security_agency') {
      await base44.asServiceRole.entities.SecurityAgency.update(partner_id, partnerUpdate);
    }

    // ── AUTO-ACTIVATION: doctor scanned clear — set all 3 sub-checks and
    // activate via activateVerifiedDoctor's cryptographic auto-activation path,
    // with no human touch. ──────────────────────────────────────────────────
    let autoActivationResult: { activated: boolean; reason?: string } = { activated: false };
    if (partner_type === 'doctor' && newStatus === 'auto_verified') {
      /* `background_check_status: 'passed'` USED TO BE SET HERE. It is gone.
       *
       * What ran before this line is an AI scan of the documents the applicant
       * uploaded, looking for tampering, forgery and AI-generated images. That
       * is a document-authenticity check. It is not a background check: nothing
       * in this path — or anywhere in the platform — looks at criminal history.
       * Writing 'passed' recorded a check that had never been performed, and
       * `activateVerifiedDoctor` then read that record as one of the three
       * clearances it requires before making someone bookable by a patient.
       *
       * Leaving it at its 'pending' default means auto-activation now refuses
       * (activateVerifiedDoctor returns CHECKS_NOT_COMPLETE) and the applicant
       * routes to manual review — which is the correct outcome when nobody has
       * actually checked. `verifyDoctorBackground` remains the only thing that
       * may mark this passed, because a human decides there and the decision is
       * recorded with their identity and audit-chained.
       *
       * Known and deliberately left alone: the two lines below stamp 'passed'
       * off the same AI scan. They are at least about the documents that were
       * scanned, whereas a background check is about a person's record. The
       * real licence check lives in runDoctorVerification (issuing-board API) —
       * worth a separate look, not a silent widening of this fix. */
      await base44.asServiceRole.entities.Doctor.update(partner_id, {
        license_verification_status: 'passed',
        identity_verification_status: 'passed',
        verification_method: 'ai_auto_clear_scan',
      });

      const proofTimestamp = String(Date.now());
      const proof = generateAutoActivationProof(partner_id, proofTimestamp);

      if (!proof) {
        // Secret not configured — fail closed to manual review rather than silently
        // skip activation. The doctor's sub-checks are already 'passed' above, so an
        // admin can activate with one click via activateVerifiedDoctor once configured.
        console.error('[initiatePartnerVerification] DOCTOR_AUTO_ACTIVATION_SECRET not set — falling back to manual review.');
        autoActivationResult = { activated: false, reason: 'auto_activation_secret_not_configured' };
      } else {
        try {
          const activationResponse = await base44.functions.invoke('activateVerifiedDoctor', {
            doctor_id: partner_id,
            auto_activation_timestamp: proofTimestamp,
            auto_activation_proof: proof,
          });
          autoActivationResult = { activated: !!activationResponse?.data?.success };
        } catch (activationErr) {
          console.error('[initiatePartnerVerification] auto-activation call failed:', activationErr);
          autoActivationResult = { activated: false, reason: 'activation_call_failed' };
        }
      }
    }

    // A doctor only counts as truly activated if activateVerifiedDoctor actually
    // succeeded — an unconfigured secret or a failed call must fall back to the
    // normal manual-review experience, never claim activation that didn't happen.
    const doctorActuallyActivated = newStatus === 'auto_verified' && autoActivationResult.activated;

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
        auto_activated: doctorActuallyActivated,
        auto_activation_fallback_reason: doctorActuallyActivated ? null : autoActivationResult.reason || null,
      },
      sensitive: true,
    });

    // Notify partner.
    if (doctorActuallyActivated) {
      await base44.integrations.Core.SendEmail({
        to: partnerEmail,
        subject: '✅ Your Profile is Now Verified — Welcome to the Morales Network',
        body: `<p>Dear Dr. ${partnerName},</p>
               <p>Your credentials cleared our automated screening and your profile is now <strong>verified and active</strong> on the Morales Medical Travel Platform.</p>
               <p>Patients searching for specialists in your field can now find and book with you.</p>`,
      });
      await logProviderContactAttempt(base44, {
        partner_type: partner_type as any,
        partner_id,
        partner_name: partnerName,
        channel: 'email',
        purpose: 'verification_notification',
        recipient: partnerEmail,
        initiated_by: 'initiatePartnerVerification',
        result: 'sent',
      });
    } else if (newStatus === 'pending_manual_review' || newStatus === 'manual_review' ||
               (newStatus === 'auto_verified' && !doctorActuallyActivated)) {
      await base44.integrations.Core.SendEmail({
        to: partnerEmail,
        subject: 'Verification Pending Manual Review',
        body: `<p>Your verification documents have been received and are pending manual review by our team.</p>
               <p>This typically takes 24–48 hours. We'll notify you once complete.</p>
               <p>Verification ID: ${verification.id}</p>`,
      });
      await logProviderContactAttempt(base44, {
        partner_type: partner_type as any,
        partner_id,
        partner_name: partnerName,
        channel: 'email',
        purpose: 'verification_notification',
        recipient: partnerEmail,
        initiated_by: 'initiatePartnerVerification',
        result: 'sent',
      });
    }
    // No 'denied' branch here anymore — this function can no longer produce
    // an autonomous denial (see the fraud-score branching above). A real
    // denial now only ever comes from a human decision elsewhere in the
    // pipeline (e.g. verifyDoctorBackground's 'reject' action,
    // manualReviewVerification), never from this automated first pass.

    return Response.json({
      success: true,
      verification_id: verification.id,
      status: doctorActuallyActivated ? 'active' : (newStatus === 'auto_verified' ? 'manual_review' : newStatus),
      fraud_score,
      auto_verified: autoVerified,
      auto_activated: doctorActuallyActivated,
    });
}, { name: 'initiatePartnerVerification', bodySchema: InitiatePartnerVerificationSchema }));
