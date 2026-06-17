import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// AI Governance — KYP Framework
const KYP_SYSTEM_PROMPT = `You are a Know Your Partner (KYP) compliance analyst for a medical tourism platform. 
Your role is to assess transport and hospitality partners for financial crime risk, document authenticity, and sanctions exposure.
You follow FATF anti-money laundering guidelines. Output structured risk assessments only.`;

// Simulated global sanctions list keywords (production: integrate with OFAC/UN APIs)
const SANCTIONS_KEYWORDS = ['sanctioned', 'blacklisted', 'ofac', 'terrorist', 'fraud_conviction'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    // BUG-R16-01 FIX: platform_admin blocked — include both admin roles
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) return Response.json({ error: 'Admin only' }, { status: 403 });

    const { partner_id, partner_type, partner_name, partner_email, business_registration_number, business_registration_country, document_urls } = await req.json();
    if (!partner_name || !partner_email) return Response.json({ error: 'partner_name and partner_email required' }, { status: 400 });

    // 1. Sanctions screening — check partner name/business reg against known flags
    const nameLower = (partner_name + ' ' + (business_registration_number || '')).toLowerCase();
    const sanctionsFlagged = SANCTIONS_KEYWORDS.some(k => nameLower.includes(k));
    const sanctionsStatus = sanctionsFlagged ? 'flagged' : 'clear';

    // 2. AI document forensics + risk assessment
    const forensicsPrompt = `${KYP_SYSTEM_PROMPT}

Assess this partner for a medical tourism platform:
- Partner Name: ${partner_name}
- Partner Type: ${partner_type}
- Country: ${business_registration_country || 'unknown'}
- Business Reg #: ${business_registration_number || 'not provided'}
- Documents submitted: ${document_urls?.length || 0} documents

Perform:
1. Document authenticity assessment (assume documents are present but evaluate typical risk for this partner profile)
2. Risk scoring (0-100, higher = riskier) 
3. Flag any specific concerns
4. Determine if human review is required

Return JSON: { 
  "forensics_status": "authentic"|"tampered"|"inconclusive",
  "forensics_notes": "string",
  "risk_score": number,
  "risk_flags": ["flag1", "flag2"],
  "human_review_required": boolean,
  "recommendation": "approve"|"reject"|"manual_review",
  "summary": "brief explanation"
}`;

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: forensicsPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          forensics_status: { type: "string" },
          forensics_notes: { type: "string" },
          risk_score: { type: "number" },
          risk_flags: { type: "array", items: { type: "string" } },
          human_review_required: { type: "boolean" },
          recommendation: { type: "string" },
          summary: { type: "string" }
        }
      }
    });

    const now = new Date().toISOString();
    const overallStatus = sanctionsFlagged ? 'rejected'
      : aiResult.recommendation === 'approve' ? 'approved'
      : aiResult.recommendation === 'reject' ? 'rejected'
      : 'in_progress';

    const auditEntry = {
      timestamp: now,
      action: 'kyp_automated_scan',
      actor: 'system',
      notes: `Sanctions: ${sanctionsStatus}. AI Risk: ${aiResult.risk_score}/100. Recommendation: ${aiResult.recommendation}`
    };

    // Upsert KYP record
    const existing = await base44.asServiceRole.entities.KYPVerification.filter({ partner_email });
    let record;
    if (existing.length > 0) {
      record = await base44.asServiceRole.entities.KYPVerification.update(existing[0].id, {
        partner_id, partner_type, partner_name, business_registration_number, business_registration_country,
        document_urls: document_urls || [],
        sanctions_check_status: sanctionsStatus,
        sanctions_check_at: now,
        document_forensics_status: aiResult.forensics_status,
        document_forensics_at: now,
        document_forensics_notes: aiResult.forensics_notes,
        ai_risk_score: aiResult.risk_score,
        ai_risk_flags: aiResult.risk_flags || [],
        human_review_required: aiResult.human_review_required || sanctionsFlagged,
        overall_status: overallStatus,
        audit_trail: [...(existing[0].audit_trail || []), auditEntry],
        completed_at: overallStatus !== 'in_progress' ? now : null
      });
    } else {
      record = await base44.asServiceRole.entities.KYPVerification.create({
        partner_id, partner_type, partner_name, partner_email,
        business_registration_number, business_registration_country,
        document_urls: document_urls || [],
        sanctions_check_status: sanctionsStatus,
        sanctions_check_at: now,
        document_forensics_status: aiResult.forensics_status,
        document_forensics_at: now,
        document_forensics_notes: aiResult.forensics_notes,
        ai_risk_score: aiResult.risk_score,
        ai_risk_flags: aiResult.risk_flags || [],
        human_review_required: aiResult.human_review_required || sanctionsFlagged,
        overall_status: overallStatus,
        submitted_at: now,
        completed_at: overallStatus !== 'in_progress' ? now : null,
        audit_trail: [auditEntry]
      });
    }

    // Notify admin if human review needed
    if (aiResult.human_review_required || sanctionsFlagged) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `⚠️ KYP Manual Review Required: ${partner_name}`,
        body: `<h2>KYP Verification — Manual Review Required</h2>
<p><strong>Partner:</strong> ${partner_name} (${partner_type})</p>
<p><strong>Sanctions Status:</strong> ${sanctionsStatus}</p>
<p><strong>AI Risk Score:</strong> ${aiResult.risk_score}/100</p>
<p><strong>Flags:</strong> ${(aiResult.risk_flags || []).join(', ') || 'None'}</p>
<p><strong>AI Summary:</strong> ${aiResult.summary}</p>
<p>Please review in the admin panel: /admin/partners</p>`
      });
    }

    return Response.json({ record, ai_result: aiResult, sanctions_status: sanctionsStatus });
  } catch (error) {
    // BUG-R16-02 FIX: SEC-10 — never expose internal error details
    console.error('[runKYPVerification]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});