import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { verification_id, documents } = await req.json();

    if (!verification_id || !documents || documents.length === 0) {
      return Response.json({ error: 'verification_id and documents required' }, { status: 400 });
    }

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
- fraud_score: number 0-100 (overall fraud risk)`;

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

      const docAnalysis = analysisResult.data;
      
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});