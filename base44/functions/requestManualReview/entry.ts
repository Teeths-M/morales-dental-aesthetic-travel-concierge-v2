// requestManualReview — a user who received 'needs_review' or
// 'unable_to_verify', or who cannot complete facial verification
// (accessibility, false match), requests a human review. Creates a
// VerificationReview task with the sanitized evidence summary and the
// user's appeal note. M-Care never auto-denies or accuses — a human
// decides. Also used by M-Care's autonomous monitoring when it flags a
// mismatch (in which case the agent calls this via asServiceRole).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { logTrustScanEvent } from '../../shared/trustScanAudit.ts';

const VALID_REVIEW_TYPES = new Set(['manual_review', 'appeal', 'accessibility', 'false_match', 'expired_document', 'mismatch_flagged']);

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const verificationId = String(body.verificationId || '');
    const reviewType = String(body.reviewType || 'manual_review');
    const userNote = String(body.userNote || '').slice(0, 2000);

    if (!verificationId) {
      return Response.json({ error: 'verificationId is required.' }, { status: 400 });
    }
    if (!VALID_REVIEW_TYPES.has(reviewType)) {
      return Response.json({ error: 'Invalid review type.' }, { status: 400 });
    }

    // The user must own the verification they're asking to be reviewed.
    const verification = await base44.entities.IdentityVerification.get(verificationId).catch(() => null);
    if (!verification || verification.subject_email !== user.email) {
      return Response.json({ error: 'Verification not found.' }, { status: 404 });
    }

    const now = new Date();
    const review = await base44.entities.VerificationReview.create({
      verification_id: verificationId,
      verification_kind: verification.verification_kind || 'identity',
      subject_email: user.email,
      subject_name: verification.subject_name || user.full_name,
      review_type: reviewType,
      reason: body.reason || `User requested manual review (${reviewType}).`,
      user_note: userNote,
      status: 'open',
      priority: reviewType === 'accessibility' ? 'high' : 'medium',
      evidence_summary: {
        status: verification.status,
        confidence: verification.confidence_score,
        document_checks: verification.document_checks,
        selfie_liveness: verification.selfie_liveness,
        inquiry_id: verification.persona_inquiry_id,
      },
      sla_due_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_manual_review_requested',
      actor_id: user.id,
      actor_email: user.email,
      resource_type: 'VerificationReview',
      resource_id: review.id,
      details: { review_type: reviewType, verification_id: verificationId },
      sensitive: false,
    });

    return Response.json({
      reviewId: review.id,
      status: 'open',
      message: 'Your request is with a human reviewer. You have not been denied — a person will look at your case and explain the next step.',
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

Deno.serve(handler);