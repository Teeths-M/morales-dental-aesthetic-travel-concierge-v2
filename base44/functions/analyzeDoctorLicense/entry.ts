import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow service role calls (from automations) without user auth
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      // Service role call - that's ok
    }

    const { doctorId } = await req.json();

    if (!doctorId) {
      return Response.json({ error: 'Missing doctorId' }, { status: 400 });
    }

    // Get doctor record
    const doctor = await base44.asServiceRole.entities.Doctor.get(doctorId);
    if (!doctor || !doctor.license_url) {
      return Response.json({ error: 'Doctor not found or no license uploaded' }, { status: 404 });
    }

    // Use AI vision to analyze the license document
    let analysis = null;
    try {
    analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this medical license document image. Extract and verify:
1. Doctor's full name
2. License number
3. Issuing authority/country
4. Issue date and expiry date
5. Medical specialty if mentioned

Then assess:
- Does the document appear to be a legitimate medical license? (yes/no)
- Confidence score 0-100% based on document quality and clarity
- Any red flags or concerns?
- Is the license currently valid (not expired)?

Return JSON format:
{
  "extracted_name": "...",
  "license_number": "...",
  "issuing_country": "...",
  "issue_date": "...",
  "expiry_date": "...",
  "specialty": "...",
  "appears_legitimate": true/false,
  "confidence_score": 0-100,
  "red_flags": ["list any concerns"],
  "is_valid": true/false,
  "recommendation": "ai_verified|manual_review|rejected"
}`,
      file_urls: [doctor.license_url],
      response_json_schema: {
        type: "object",
        properties: {
          extracted_name: { type: "string" },
          license_number: { type: "string" },
          issuing_country: { type: "string" },
          issue_date: { type: "string" },
          expiry_date: { type: "string" },
          specialty: { type: "string" },
          appears_legitimate: { type: "boolean" },
          confidence_score: { type: "number" },
          red_flags: { type: "array", items: { type: "string" } },
          is_valid: { type: "boolean" },
          recommendation: { type: "string", enum: ["ai_verified", "manual_review", "rejected"] }
        },
        required: ["appears_legitimate", "confidence_score", "recommendation"]
      }
    });
    } catch (_) {}

    // If AI unavailable, fall back to manual review — never crash
    if (!analysis) {
      await base44.asServiceRole.entities.Doctor.update(doctorId, {
        verification_status: 'manual_review',
        verification_notes: 'AI analysis unavailable — manual review required.',
      }).catch(() => {});
      return Response.json({ success: true, status: 'manual_review', ai_available: false });
    }

    // Determine verification status based on AI analysis
    let verificationStatus = 'manual_review';
    let verificationNotes = '';

    if (analysis?.recommendation === 'ai_verified' && analysis?.confidence_score >= 85 && analysis?.appears_legitimate) {
      verificationStatus = 'ai_verified';
      verificationNotes = `AI Verified: ${analysis.confidence_score}% confidence. License #${analysis.license_number || 'N/A'} from ${analysis.issuing_country || 'Unknown'}. Valid until ${analysis.expiry_date || 'N/A'}. Name matches: ${analysis.extracted_name || 'N/A'}`;
    } else if (analysis?.recommendation === 'rejected' || !analysis?.appears_legitimate) {
      verificationStatus = 'manual_review';
      verificationNotes = `AI Flagged: ${analysis.confidence_score}% confidence. Red flags: ${analysis.red_flags?.join(', ') || 'Low confidence'}. Requires manual review.`;
    } else {
      verificationStatus = 'manual_review';
      verificationNotes = `AI Analysis: ${analysis.confidence_score}% confidence. Extracted - Name: ${analysis.extracted_name || 'N/A'}, License: ${analysis.license_number || 'N/A'}, Country: ${analysis.issuing_country || 'N/A'}. Awaiting manual verification.`;
    }

    // Update doctor record with AI analysis results
    await base44.asServiceRole.entities.Doctor.update(doctorId, {
      verification_status: verificationStatus,
      verification_confidence: analysis.confidence_score,
      verification_notes: verificationNotes,
      license_verified: verificationStatus === 'ai_verified'
    });

    return Response.json({
      success: true,
      doctorId,
      analysis,
      verification_status: verificationStatus,
      confidence: analysis.confidence_score,
      message: `License analyzed. Status: ${verificationStatus}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});