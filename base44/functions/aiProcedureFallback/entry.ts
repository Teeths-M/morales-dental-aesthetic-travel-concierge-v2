import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request
    const { patient_query, patient_email, case_id } = await req.json();
    
    if (!patient_query || !patient_email) {
      return Response.json({ 
        error: 'Missing required fields: patient_query, patient_email' 
      }, { status: 400 });
    }

    // Fetch all active procedures from MasterProcedure entity
    const procedures = await base44.asServiceRole.entities.MasterProcedure.filter({
      is_active: true
    });

    if (!procedures || procedures.length === 0) {
      return Response.json({ 
        error: 'No procedures found in database' 
      }, { status: 404 });
    }

    // Prepare procedures list for LLM
    const proceduresList = procedures.map(p => ({
      procedure_id: p.data.procedure_id,
      en_name: p.data.en_name,
      es_name: p.data.es_name,
      fr_name: p.data.fr_name,
      category: p.data.category
    }));

    // Call LLM to find top 3 matches
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a medical procedure matching assistant. A patient has described what they want in their own words: "${patient_query}"

Your task is to analyze their intent and match it to the closest procedures from our database.

Available procedures:
${JSON.stringify(proceduresList, null, 2)}

Return the TOP 3 closest matching procedures with:
1. procedure_id (exact match from database)
2. procedure_name (English name)
3. match_confidence (percentage 0-100, how well it matches)
4. rationale (1-2 sentences explaining WHY this matches the patient's description)

IMPORTANT: 
- Be generous with matching - patients use non-technical language
- Consider synonyms, layman terms, and related procedures
- Return ONLY valid JSON in this exact format:
{
  "matches": [
    {
      "procedure_id": "string",
      "procedure_name": "string",
      "match_confidence": number,
      "rationale": "string"
    }
  ]
}

Patient query: "${patient_query}"
Language hint: Detect from query and match procedure names accordingly.`,
      response_json_schema: {
        type: "object",
        properties: {
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                procedure_id: { type: "string" },
                procedure_name: { type: "string" },
                match_confidence: { type: "number" },
                rationale: { type: "string" }
              },
              required: ["procedure_id", "procedure_name", "match_confidence", "rationale"]
            }
          }
        },
        required: ["matches"]
      }
    });

    const matches = llmResponse.matches || [];

    // Save to AiFallbackMatch entity if case_id provided
    if (case_id) {
      await base44.asServiceRole.entities.AiFallbackMatch.create({
        case_id: case_id,
        patient_email: patient_email,
        original_query: patient_query,
        matched_procedures: matches,
        doctor_notified: false,
        created_at: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true,
      matched_procedures: matches.slice(0, 3) // Return top 3
    });

  } catch (error) {
    console.error('AI Fallback Error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});