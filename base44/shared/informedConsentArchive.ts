// ── Informed Consent Archive ──────────────────────────────────────────────
// Shared by iq200Pipeline's `create` action (the reliable, server-side path —
// every real case eventually passes through here) and
// processInformedConsentAndEmail (a legacy, best-effort client-invoked path
// kept working for its one remaining caller). One copy of the legal text and
// archive HTML, not two.

export const DISCLOSURE_TEXT = `
1. Surgical Risk Acknowledgement: I understand that every medical, dental, and surgical procedure carries inherent biological risks and potential complications including, but not limited to, infection, adverse reactions, and unforeseen surgical events.

2. Variance of Outcomes: I acknowledge that healing processes and clinical outcomes vary by individual and cannot be universally guaranteed. Results depend on personal health factors, post-operative compliance, and biological response.

3. Platform Coordination Scope: I explicitly agree that this platform operates solely as a logistics and travel concierge coordinating transit, lodging, and scheduling. Morales Medical Travel Safety is not a medical provider and does not render clinical services.

4. Independent Medical Responsibility: I recognize that the selected licensed physician or dentist holds sole, absolute medical responsibility and clinical liability for my treatment. The platform bears no clinical liability whatsoever.

5. Cross-Border Jurisdiction Risk & Mandatory Arbitration Agreement: By signing below, I explicitly waive my right to initiate immediate litigation in any public court or foreign jurisdiction. I agree that any and all disputes shall be resolved exclusively through a mandatory four-tier dispute resolution process:
   Tier 1 — Internal Resolution (30-day exclusive window)
   Tier 2 — Non-binding Mediation (costs shared equally)
   Tier 3 — Binding Arbitration (seat: Port of Spain, Trinidad and Tobago)
   Tier 4 — Restricted Legal Escalation (exclusively in courts of Trinidad and Tobago)
`;

// LEAK-SCAN-IGNORE-START — this builds the permanent consent+receipt ARCHIVE
// stored on CaseRecord.informed_consent_email_html (read in-portal, by the
// client and by their assigned doctor); it is never emailed directly to
// anyone — every outbound email is a generic linkOnlyEmail pointing here.
export function buildInformedConsentHtml({ clientName, clientEmail, procedures, signatureData, signatureTimestamp, signatureIp, acceptedArbitration, chargeId, amount }: {
  clientName: string;
  clientEmail: string;
  procedures?: string;
  signatureData?: string;
  signatureTimestamp?: string;
  signatureIp?: string;
  acceptedArbitration?: boolean;
  chargeId?: string;
  amount?: number;
}): string {
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
          <p style="margin:0;font-size:11px;color:#a8d5b5;letter-spacing:3px;text-transform:uppercase;">Morales Medical Travel Safety</p>
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
          <p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Morales Medical Travel Safety. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
// LEAK-SCAN-IGNORE-END
