import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      consultation_id,
      workflow_id,
      case_record_id,
      signature_data,
      signature_timestamp,
      accepted_arbitration_clause,
      risk_flags,
      risk_summary,
    } = body;

    if (!consultation_id || !signature_data) {
      return Response.json({ error: 'consultation_id and signature_data are required' }, { status: 400 });
    }

    // Verify the consultation belongs to this user
    const consultation = await base44.entities.Consultation.get(consultation_id);
    if (!consultation || consultation.email !== user.email) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Archive the signature and consent on the consultation
    await base44.asServiceRole.entities.Consultation.update(consultation_id, {
      status: 'in_progress',
      notes: [
        consultation.notes || '',
        `[SAFE-T OVERRIDE — ${now}] Patient signed liability waiver and accepted arbitration clause. Risk flags: ${(risk_flags || []).join(', ') || 'none'}.`,
      ].filter(Boolean).join('\n\n'),
    });

    // Archive on the CaseRecord if provided
    if (case_record_id) {
      // SECURITY: Bind case_record_id to the verified consultation — prevent cross-patient SAFE-T override.
      // The CaseRecord's consultation_id must match the consultation we already verified belongs to this user.
      const caseToUpdate = await base44.asServiceRole.entities.CaseRecord.get(case_record_id);
      if (!caseToUpdate || caseToUpdate.consultation_id !== consultation.id) {
        return Response.json({
          error: 'case_record_id does not belong to your consultation. SAFE-T override denied.',
        }, { status: 403 });
      }

      // M PRINCIPLE — CRITICAL/RED is a hard block, always. No bypass, no exception.
      // safeT4LifeScan sets safe_t_result: 'BLOCKED' for CRITICAL-tier cases and refuses
      // to let that case re-scan or sign a waiver. This endpoint must honor the same lock —
      // a liability waiver signature must never be able to override a hard-locked case.
      if (caseToUpdate.safe_t_result === 'BLOCKED') {
        return Response.json({
          error: 'This case has been hard-locked by SAFE-T 4LIFE™ critical risk screening. No signature or waiver can override this. Please contact our medical coordination team.',
        }, { status: 403 });
      }

      await base44.asServiceRole.entities.CaseRecord.update(case_record_id, {
        signature_data,
        signature_timestamp: signature_timestamp || now,
        accepted_arbitration_clause: true,
        safe_t_result: 'PASSED',
        admin_notes: `SAFE-T override signed by patient on ${now}. Risk flags: ${(risk_flags || []).join(', ') || 'none'}.`,
      });
    }

    // Send confirmation email to the patient
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Your SAFE-T Override Consent Has Been Recorded — Morales Concierge',
        body: `
Dear ${user.full_name || 'Patient'},

This email confirms that your signed liability waiver and informed consent for SAFE-T risk override has been successfully recorded on ${now}.

Risk factors acknowledged:
${(risk_flags || []).map(f => `• ${f}`).join('\n') || '• None specified'}

Your case is now proceeding to doctor review. Our team will be in touch shortly.

This document has been archived in our secure compliance system.

— Morales Medical Travel Safety
        `.trim(),
      });
    } catch (emailErr) {
      // Non-fatal — log but don't fail the override
      console.error('Override confirmation email failed:', emailErr.message);
    }

    return Response.json({ success: true, recorded_at: now });
  } catch (error) {
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'safeTProceedWithOverride', requireAuth: false }));
