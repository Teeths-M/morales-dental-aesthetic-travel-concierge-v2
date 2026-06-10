import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validate authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      patient_query, 
      patient_custom_note = '', 
      selected_procedure_id, 
      selected_procedure_name,
      case_id 
    } = body;
    
    if (!patient_query) {
      return Response.json({ 
        error: 'Missing required field: patient_query' 
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

    // Prepare procedures list for LLM - handle both entity wrapper and raw data formats
    const proceduresList = procedures.map(p => {
      const proc = p.data || p;
      return {
        procedure_id: proc.procedure_id,
        en_name: proc.en_name,
        es_name: proc.es_name,
        fr_name: proc.fr_name,
        category: proc.category
      };
    });

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
4. rationale (1-2 sentences explaining WHY this matches the patient's description in friendly, non-technical language)

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

    // If patient selected a procedure, save the complete record
    if (selected_procedure_id) {
      const fallbackRecord = await base44.entities.AiFallbackMatch.create({
        case_id: case_id || null,
        patient_id: user.id,
        patient_email: user.email,
        original_query: patient_query,
        matched_procedures: matches,
        selected_procedure_id,
        selected_procedure_name,
        patient_custom_note,
        doctor_notified: false,
        created_at: new Date().toISOString()
      });

      console.log('AI Fallback Match saved:', fallbackRecord.id);

      return Response.json({ 
        success: true,
        fallback_match_id: fallbackRecord.id,
        matched_procedures: matches,
        selected_procedure: {
          id: selected_procedure_id,
          name: selected_procedure_name
        },
        patient_note_saved: !!patient_custom_note
      });
    }

    // Just returning matches (no selection yet)
    return Response.json({ 
      success: true,
      matched_procedures: matches.slice(0, 3)
    });

  } catch (error) {
    console.error('AI Fallback Error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});