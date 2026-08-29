// getMyIdentityStatus — lets a user poll their own identity verification
// status after completing Persona's embedded flow. If the webhook hasn't
// landed yet, this optionally refreshes from Persona directly so the UI
// isn't stuck on 'in_progress'. Returns only the user-facing status and
// sanitized summary — never raw document data or fraud signals. Audits
// the access.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { retrieveInquiry, mapToUserFacingStatus, parseInquiryResult } from '../../shared/personaAdapter.ts';
import { logTrustScanEvent } from '../../shared/trustScanAudit.ts';

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const verificationId = String(body.verificationId || '');

    if (!verificationId) {
      // No id given — return the user's most recent verification.
      const recent = await base44.entities.IdentityVerification.filter({
        subject_email: user.email,
      }, '-created_date', 1);
      if (!recent || recent.length === 0) {
        return Response.json({ found: false, status: 'none', message: 'You have not started identity verification yet.' });
      }
      return Response.json({ found: true, verificationId: recent[0].id, status: recent[0].status, summary: recent[0].result_summary, sandbox: recent[0].sandbox });
    }

    const verification = await base44.entities.IdentityVerification.get(verificationId).catch(() => null);
    if (!verification || verification.subject_email !== user.email) {
      return Response.json({ error: 'Verification not found.' }, { status: 404 });
    }

    // If still in_progress and we have an inquiry id, try a live refresh
    // from Persona (webhook may not have landed yet). This keeps the UI
    // honest instead of spinning.
    let status = verification.status;
    let summary = verification.result_summary;
    if ((status === 'in_progress' || status === 'pending') && verification.persona_inquiry_id) {
      try {
        const result = retrieveInquiry ? await retrieveInquiry(verification.persona_inquiry_id) : null;
        if (result && (result.status === 'completed' || result.status === 'approved' || result.status === 'failed' || result.status === 'expired')) {
          const userFacing = mapToUserFacingStatus(result);
          // Only advance the record if Persona says the inquiry is done.
          if (userFacing !== status && result.status !== 'pending') {
            status = userFacing;
            await base44.entities.IdentityVerification.update(verificationId, {
              status: userFacing,
              persona_inquiry_status: result.status,
              confidence_score: result.confidenceScore,
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        // Persona lookup failed — leave the stored status as-is (the
        // webhook will update it). Do not fake a result.
        console.warn('[getMyIdentityStatus] persona refresh failed', err?.message || err);
      }
    }

    await logTrustScanEvent(base44.asServiceRole, {
      event_type: 'trustscan_evidence_accessed',
      actor_id: user.id,
      actor_email: user.email,
      resource_type: 'IdentityVerification',
      resource_id: verificationId,
      details: { status, self_poll: true },
      sensitive: false,
    });

    return Response.json({
      found: true,
      verificationId,
      status,
      summary,
      sandbox: verification.sandbox,
      documents_status: verification.document_checks?.expiry_date || null,
      reviewed: !!verification.verified_at,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

Deno.serve(handler);