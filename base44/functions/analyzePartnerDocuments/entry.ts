import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: this triggers billed LLM vision analysis and overwrites
    // PartnerVerification.documents_uploaded — must not be callable anonymously.
    // Matches the auth level of its only legitimate caller, initiatePartnerVerification.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { verification_id, documents, partner_type, country } = await req.json();

    if (!verification_id || !documents || documents.length === 0) {
      return Response.json({ error: 'verification_id and documents required' }, { status: 400 });
    }

    // Context line for the analysis prompt below. Without this, every
    // document from every country was scored against the same generic
    // notion of "normal" formatting — a real fairness risk: a legitimate
    // document from a country with less standardized document production
    // (script, paper quality, layout conventions that simply look
    // different from what the model has seen most) could score as
    // "suspicious" purely for being unfamiliar, not for being fraudulent.
    // This doesn't solve that — no vision model can know every country's
    // exact document-issuance conventions — but it materially reduces the
    // risk of penalizing an applicant for something that isn't fraud.
    const contextLine = (partner_type || country)
      ? `\n\nContext: this document was submitted by a ${partner_type ? partner_type.replace(/_/g, ' ') : 'partner'} applicant${country ? ` based in ${country}` : ''}. Evaluate authenticity signals appropriate to what an official document from that country and role would realistically look like. Do NOT flag or penalize the applicant merely because the script, formatting, paper quality, or production style is simply typical of official documents from that country rather than an actual sign of tampering or forgery.`
      : '';

    let totalFraudScore = 0;
    let allIndicators = [];
    const analyzedDocs = [];

    // Analyze each document
    for (const doc of documents) {
      if (!doc.file_uri) continue;

      // Get signed URL for analysis
      const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300
      });

      // Use InvokeLLM with vision to analyze document for tampering/forgery
      const analysisPrompt = `Analyze this document image for signs of fraud, tampering, or forgery. Look for:
1. Digital manipulation artifacts
2. Inconsistent fonts or formatting
3. Signs of AI-generated content
4. Watermark inconsistencies
5. Edge artifacts or splicing
6. Metadata anomalies

Return a JSON response with:
- tampering_detected: boolean
- forgery_indicators: array of strings (specific issues found)
- ai_generated_probability: number 0-100
- confidence_score: number 0-100 (how confident is the analysis)
- fraud_score: number 0-100 (overall fraud risk)${contextLine}`;

      const analysisResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [signed_url],
        response_json_schema: {
          type: 'object',
          properties: {
            tampering_detected: { type: 'boolean' },
            forgery_indicators: { type: 'array', items: { type: 'string' } },
            ai_generated_probability: { type: 'number' },
            confidence_score: { type: 'number' },
            fraud_score: { type: 'number' }
          },
          required: ['tampering_detected', 'forgery_indicators', 'ai_generated_probability', 'confidence_score', 'fraud_score']
        },
        model: 'gemini_3_flash' // Using Gemini for vision analysis
      });

      // SDK returns data directly — never wrapped in .data
      const docAnalysis = analysisResult?.data ?? analysisResult ?? {};
      
      analyzedDocs.push({
        ...doc,
        ai_analysis_result: docAnalysis
      });

      totalFraudScore += docAnalysis.fraud_score || 0;
      if (docAnalysis.forgery_indicators) {
        allIndicators.push(...docAnalysis.forgery_indicators);
      }
    }

    // Calculate average fraud score
    const avgFraudScore = documents.length > 0 ? Math.round(totalFraudScore / documents.length) : 0;

    // Remove duplicates from indicators
    const uniqueIndicators = [...new Set(allIndicators)];

    // Update verification record with analyzed documents
    if (verification_id) {
      await base44.asServiceRole.entities.PartnerVerification.update(verification_id, {
        documents_uploaded: analyzedDocs
      });
    }

    return Response.json({
      success: true,
      fraud_score: avgFraudScore,
      fraud_indicators: uniqueIndicators,
      documents_analyzed: documents.length,
      analysis_details: analyzedDocs
    });

  } catch (error) {
    // BUG-R16-03 FIX: SEC-10
    console.error('[analyzePartnerDocuments]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'analyzePartnerDocuments', requireAuth: false }));
