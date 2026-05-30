import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DISCLOSURE_TEXT = `
1. Surgical Risk Acknowledgement: I understand that every medical, dental, and surgical procedure carries inherent biological risks and potential complications including, but not limited to, infection, adverse reactions, and unforeseen surgical events.

2. Variance of Outcomes: I acknowledge that healing processes and clinical outcomes vary by individual and cannot be universally guaranteed. Results depend on personal health factors, post-operative compliance, and biological response.

3. Platform Coordination Scope: I explicitly agree that this platform operates solely as a logistics and travel concierge coordinating transit, lodging, and scheduling. Morales Dental & Aesthetic Travel Concierge is not a medical provider and does not render clinical services.

4. Independent Medical Responsibility: I recognize that the selected licensed physician or dentist holds sole, absolute medical responsibility and clinical liability for my treatment. The platform bears no clinical liability whatsoever.

5. Cross-Border Jurisdiction Risk & Mandatory Arbitration Agreement: By signing below, I explicitly waive my right to initiate immediate litigation in any public court or foreign jurisdiction. I agree that any and all disputes shall be resolved exclusively through a mandatory four-tier dispute resolution process:
   Tier 1 — Internal Resolution (30-day exclusive window)
   Tier 2 — Non-binding Mediation (costs shared equally)
   Tier 3 — Binding Arbitration (seat: Port of Spain, Trinidad and Tobago)
   Tier 4 — Restricted Legal Escalation (exclusively in courts of Trinidad and Tobago)
`;

function buildEmailHtml({ clientName, clientEmail, procedures, signatureData, signatureTimestamp, signatureIp, acceptedArbitration, chargeId, amount }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informed Consent & Payment Receipt — Morales Concierge</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a3a2e 0%,#2d6a4f 100%);padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a8d5b5;letter-spacing:3px;text-transform:uppercase;">Morales Dental & Aesthetic Travel Concierge</p>
          <h1 style="margin:12px 0 4px;font-size:26px;color:#ffffff;font-weight:normal;letter-spacing:-0.5px;">Payment & Consent Confirmed</h1>
          <p style="margin:0;font-size:13px;color:#b7dfc4;">SAFE-T 4LIFE™ Informed Consent Archive</p>
        </td></tr>

        <!-- Client & Receipt Summary -->
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0 0 4px;font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Prepared for</p>
          <h2 style="margin:0 0 20px;font-size:20px;color:#1a3a2e;">${clientName}</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Client Email</td>
              <td style="padding:12px 16px;font-size:12px;color:#1a3a2e;font-weight:600;border-bottom:1px solid #e5e7eb;">${clientEmail}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Procedures</td>
              <td style="padding:12px 16px;font-size:12px;color:#1a3a2e;font-weight:600;border-bottom:1px solid #e5e7eb;">${procedures || 'Medical Consultation'}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Consultation Fee</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a3a2e;font-weight:700;border-bottom:1px solid #e5e7eb;">$${amount || 49} USD</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:12px;color:#6b7280;">Transaction Reference</td>
              <td style="padding:12px 16px;font-size:11px;color:#6b7280;font-family:monospace;">${chargeId || 'N/A'}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Disclosure Section -->
        <tr><td style="padding:32px 40px 0;">
          <div style="border-top:3px solid #c9a84c;padding-top:24px;">
            <p style="margin:0 0 6px;font-size:11px;color:#c9a84c;letter-spacing:3px;text-transform:uppercase;font-weight:700;">⚖ Permanently Archived Digital Agreement</p>
            <h3 style="margin:0 0 16px;font-size:17px;color:#1a3a2e;">Medical Risk & Liability Disclosure</h3>
            <div style="background:#f9fafb;border-left:4px solid #1a3a2e;border-radius:0 8px 8px 0;padding:20px;margin-bottom:20px;">
              <pre style="margin:0;font-size:11px;color:#374151;line-height:1.8;white-space:pre-wrap;font-family:'Georgia',serif;">${DISCLOSURE_TEXT.trim()}</pre>
            </div>
          </div>
        </td></tr>

        <!-- Signature Image -->
        <tr><td style="padding:24px 40px 0;">
          <p style="margin:0 0 10px;font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Captured Digital Signature</p>
          <div style="border:2px solid #1a3a2e;border-radius:12px;overflow:hidden;background:#f8faf9;padding:16px;text-align:center;">
            ${signatureData
              ? `<img src="${signatureData}" alt="Client Digital Signature" style="max-width:100%;max-height:120px;display:block;margin:0 auto;" />`
              : '<p style="color:#9ca3af;font-size:12px;font-style:italic;">Signature not captured</p>'
            }
          </div>
        </td></tr>

        <!-- Metadata -->
        <tr><td style="padding:20px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fbbf24;border-radius:12px;overflow:hidden;background:#fffbeb;">
            <tr><td colspan="2" style="padding:10px 16px;background:#fef3c7;font-size:11px;font-weight:700;color:#92400e;letter-spacing:2px;text-transform:uppercase;">Signature Metadata</td></tr>
            <tr>
              <td style="padding:10px 16px;font-size:11px;color:#6b7280;border-top:1px solid #fde68a;">Signed At</td>
              <td style="padding:10px 16px;font-size:11px;color:#1a3a2e;font-weight:600;border-top:1px solid #fde68a;">${signatureTimestamp || new Date().toISOString()}</td>
            </tr>
            <tr style="background:#fffef5;">
              <td style="padding:10px 16px;font-size:11px;color:#6b7280;border-top:1px solid #fde68a;">IP Address</td>
              <td style="padding:10px 16px;font-size:11px;color:#1a3a2e;font-weight:600;border-top:1px solid #fde68a;">${signatureIp || 'Not captured'}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:11px;color:#6b7280;border-top:1px solid #fde68a;">Arbitration Clause Accepted</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:700;border-top:1px solid #fde68a;color:${acceptedArbitration ? '#065f46' : '#991b1b'};">
                ${acceptedArbitration ? '✅ YES — Explicitly Accepted' : '❌ NOT ACCEPTED'}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 40px;text-align:center;border-top:1px solid #e5e7eb;margin-top:32px;">
          <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;">This is an immutable legal archive generated by the SAFE-T 4LIFE™ system.</p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Morales Dental & Aesthetic Travel Concierge. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    } = await req.json();

    if (!client_email) {
      return Response.json({ error: 'client_email is required' }, { status: 400 });
    }

    // Build email HTML
    const emailHtml = buildEmailHtml({
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

    // Send email to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client_email,
      from_name: 'Morales Travel Concierge',
      subject: '⚖️ Informed Consent Confirmed & Payment Receipt — SAFE-T 4LIFE™',
      body: emailHtml,
    });

    const now = new Date().toISOString();

    // Archive HTML snapshot + consent metadata back to CaseRecord (if ID provided)
    if (case_record_id) {
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

  } catch (error) {
    console.error('processInformedConsentAndEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});