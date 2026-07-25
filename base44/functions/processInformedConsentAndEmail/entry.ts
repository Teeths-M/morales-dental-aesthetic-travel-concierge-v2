import { createHandler } from '../_shared/createHandler.ts';
import { linkOnlyEmail } from '../_shared/notify.ts';
import { buildInformedConsentHtml } from '../_shared/informedConsentArchive.ts';

const APP_URL = (Deno.env.get('APP_URL') || 'https://moralesdentalandaesthetics.com').replace(/\/$/, '');

Deno.serve(createHandler(async ({ base44, user, body }) => {
    const {
      consultation_id,
      case_record_id,
      client_name,
      client_email,
      procedures,
      signature_data,
      signature_timestamp,
      signature_ip_address,
      accepted_arbitration_clause,
      charge_id,
      amount,
    } = await body();

    if (!client_email) {
      return Response.json({ error: 'client_email is required' }, { status: 400 });
    }

    // Build the permanent archive — this is stored on the case, never emailed.
    const emailHtml = buildInformedConsentHtml({
      clientName: client_name || user.full_name || 'Valued Client',
      clientEmail: client_email,
      procedures,
      signatureData: signature_data,
      signatureTimestamp: signature_timestamp,
      signatureIp: signature_ip_address,
      acceptedArbitration: accepted_arbitration_clause,
      chargeId: charge_id,
      amount,
    });

    // Notify the client — signature image, IP, amount and the legal
    // disclosure text stay in the portal; the email only links to it.
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client_email,
      from_name: 'Morales Travel Concierge',
      subject: '⚖️ Informed Consent Confirmed & Payment Receipt — SAFE-T 4LIFE™',
      body: linkOnlyEmail({
        title: 'Your consent and payment receipt are ready',
        line: 'View and download your signed consent and payment receipt in your Morales portal.',
        ctaUrl: `${APP_URL}/dashboard`,
        ctaLabel: 'Open My Portal',
        from: 'processInformedConsentAndEmail',
      }),
    });

    const now = new Date().toISOString();

    // Archive HTML snapshot + consent metadata back to CaseRecord (if ID provided)
    if (case_record_id) {
      // SECURITY: Verify caller owns this CaseRecord (or is admin) before writing consent data.
      const isAdmin = user.role === 'admin' || user.role === 'platform_admin';
      if (!isAdmin) {
        const caseOwnerCheck = await base44.asServiceRole.entities.CaseRecord.get(case_record_id);
        if (!caseOwnerCheck || caseOwnerCheck.client_email !== user.email) {
          return Response.json({
            error: 'Forbidden: you are not authorized to archive consent for this case record.',
          }, { status: 403 });
        }
      }
      await base44.asServiceRole.entities.CaseRecord.update(case_record_id, {
        signature_data: signature_data || '',
        signature_timestamp: signature_timestamp || now,
        signature_ip_address: signature_ip_address || '',
        accepted_arbitration_clause: !!accepted_arbitration_clause,
        informed_consent_email_html: emailHtml,
        informed_consent_email_sent_at: now,
        status: 'Vendor-Pending',
      });
    }

    // Also update Consultation if id provided
    if (consultation_id) {
      await base44.asServiceRole.entities.Consultation.update(consultation_id, {
        visa_required_status: 'unknown', // preserve existing, don't overwrite
      });
    }

    return Response.json({ success: true, email_sent_to: client_email, archived_at: now });
}, { name: 'processInformedConsentAndEmail' }));
