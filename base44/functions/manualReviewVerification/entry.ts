import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { verification_id, decision, notes } = await req.json();

    if (!verification_id || !decision) {
      return Response.json({ error: 'verification_id and decision required' }, { status: 400 });
    }

    if (!['approve', 'deny'].includes(decision)) {
      return Response.json({ error: 'Decision must be "approve" or "deny"' }, { status: 400 });
    }

    // SDK filter({ id }) always returns [] — use .get() for primary-key lookups
    const verification = await base44.asServiceRole.entities.PartnerVerification.get(verification_id);
    if (!verification) {
      return Response.json({ error: 'Verification not found' }, { status: 404 });
    }
    const now = new Date().toISOString();

    let newStatus;
    let denialReason = null;

    if (decision === 'approve') {
      newStatus = 'verified';
    } else {
      newStatus = 'denied';
      denialReason = notes || 'Failed manual review';
    }

    // Update verification record
    await base44.asServiceRole.entities.PartnerVerification.update(verification_id, {
      verification_status: newStatus,
      manual_review_notes: notes || null,
      manual_reviewer_id: user.id,
      manual_reviewer_name: user.full_name,
      manual_review_completed_at: now,
      verified_at: decision === 'approve' ? now : null,
      verified_by: 'manual_review',
      denied_at: decision === 'deny' ? now : null,
      denied_by: decision === 'deny' ? user.id : null,
      denial_reason: denialReason,
      updated_at: now
    });

    // Update partner status
    const partnerUpdate = {
      verification_status: newStatus,
      updated_at: now
    };

    if (newStatus === 'verified') {
      partnerUpdate.verification_can_be_activated = true;
      partnerUpdate.status = 'active';
    } else if (newStatus === 'denied') {
      partnerUpdate.status = 'inactive';
      partnerUpdate.verification_can_be_activated = false;
    }

    if (verification.partner_type === 'doctor') {
      await base44.asServiceRole.entities.Doctor.update(verification.partner_id, partnerUpdate);
    } else if (verification.partner_type === 'travel_agency') {
      await base44.asServiceRole.entities.TravelAgency.update(verification.partner_id, partnerUpdate);
    } else if (verification.partner_type === 'taxi_service') {
      await base44.asServiceRole.entities.TaxiService.update(verification.partner_id, partnerUpdate);
    } else if (verification.partner_type === 'companion') {
      await base44.asServiceRole.entities.Companion.update(verification.partner_id, partnerUpdate);
    } else if (verification.partner_type === 'security_agency') {
      await base44.asServiceRole.entities.SecurityAgency.update(verification.partner_id, partnerUpdate);
    }

    // Send notification to partner
    const partner = await base44.asServiceRole.entities.User.filter({ email: verification.partner_email });
    
    if (newStatus === 'verified') {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: verification.partner_email,
        subject: '✅ Verification Approved - You Are Now Verified!',
        body: `<p>Great news! Your verification has been approved by our review team.</p>
               <p>You now have the "Verified by Morales" badge on your profile.</p>
               <p>Reviewer: ${user.full_name}</p>
               ${notes ? `<p>Notes: ${notes}</p>` : ''}`
      });
    } else {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: verification.partner_email,
        subject: 'Verification Decision',
        body: `<p>After manual review, we are unable to approve your verification at this time.</p>
               ${notes ? `<p>Reason: ${notes}</p>` : ''}
               <p>Please contact support if you have questions.</p>`
      });
    }

    // Log to AuditLog — computes a real hash-chain link, matching logAuditEvent's pattern.
    let prevHash = 'GENESIS';
    try {
      const lastEntries = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1);
      if (lastEntries?.length > 0) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(lastEntries[0])));
        prevHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {
      prevHash = 'GENESIS_FALLBACK';
    }

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'partner_notified',
      actor_id: user.id,
      actor_role: 'admin',
      actor_name: user.full_name,
      resource_type: 'PartnerVerification',
      resource_id: verification_id,
      resource_name: `${verification.partner_type} - ${verification.partner_name}`,
      details: {
        action: 'manual_review_completed',
        decision,
        notes,
        previous_status: verification.verification_status,
        new_status: newStatus,
      },
      sensitive: true,
      timestamp: now,
      prev_hash: prevHash
    });

    return Response.json({
      success: true,
      verification_id,
      new_status: newStatus,
      reviewer: user.full_name
    });

  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'manualReviewVerification', requireAuth: false }));
