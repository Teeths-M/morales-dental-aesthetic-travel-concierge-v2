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

    // Call LLM to find top 3 matches with clinical triage prompt
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gpt_5_mini",
      prompt: `You are an expert clinical triage routing assistant for a premium medical tourism platform. Your job is to take raw, casual, or jargon-free patient search queries and map them accurately to our existing procedure database.

CORE RULES:
- Analyze the underlying patient intent (e.g., "fix overlapping teeth" means Alignment/Veneers; "belly tuck" means Gastric Sleeve or Plastic Surgery).
- You can ONLY suggest procedures that exist in our system categories: Dental, Aesthetic, Wellness, Hair Restoration, Bariatric, Orthopedics, Fertility.
- NEVER invent procedures not in the database — use ONLY the procedure_id and procedure_name from the provided list.
- Be generous with matching — patients use non-technical language, synonyms, and layman terms.
- If the query is absolute gibberish or cannot possibly map to any medical procedure, return "General Specialist Consultation" as match #1 with 50% confidence.

Available procedures:
${JSON.stringify(proceduresList, null, 2)}

Return the TOP 3 closest matching procedures with:
1. procedure_id (exact match from database)
2. procedure_name (English name)
3. match_confidence (percentage 0-100, how well it matches)
4. rationale (1 SHORT sentence explaining WHY this matches in patient-friendly, non-technical language)

Output ONLY valid JSON in this exact format:
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
    // Graceful fallback: return General Consultation option to keep booking momentum
    const fallbackMatches = [{
      procedure_id: "general_consultation",
      procedure_name: "General Specialist Consultation",
      match_confidence: 50,
      rationale: "A specialist will review your case and recommend the best procedure for your goals."
    }];
    
    return Response.json({ 
      success: true,
      matched_procedures: fallbackMatches,
      is_fallback: true
    });
  }
});