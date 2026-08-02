import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';

Deno.serve(createHandler(async ({ req }) => {
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

    // Sanitize the free-text query before it enters the prompt (injection guard).
    // The raw query is still stored verbatim on ProcedureSearch for the audit trail.
    const safeQuery = sanitizePromptInput(patient_query, 500).text;

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

    // Call LLM using governed AI framework with platform persona
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gpt_5_mini",
      prompt: `You are an expert clinical concierge assistant for a premium, ultra-high-touch medical tourism platform. Your role is to facilitate seamless patient-to-procedure matching while maintaining clinical accuracy and zero hallucinations.

PERSONA & TONE:
- For patients: Empathetic, jargon-free, conversational, warm
- For doctors: Precise, data-dense, clinical terminology
- Always maintain a premium, trustworthy, professional demeanor

OPERATIONAL CONSTRAINTS (NON-NEGOTIABLE):
- ONLY suggest procedures from these categories: Dental, Aesthetic, Wellness, Hair Restoration, Bariatric, Orthopedics, Fertility
- NEVER invent procedures, doctors, or clinical options that don't exist in the database
- ALWAYS validate against live database entities before responding
- If uncertain or query is gibberish → route to "General Specialist Consultation"

FALLBACK RULE:
- If input is ambiguous, slang, or unmappable → gracefully return "General Specialist Consultation" with 50% confidence
- Never error out, break UI, or show blank states
- Keep user momentum at 100% by always providing a next step

ADDITIONAL PROCEDURE MATCHING RULES:
- Analyze underlying patient intent (e.g., "fix overlapping teeth" → Alignment/Veneers; "belly tuck" → Gastric Sleeve or Plastic Surgery)
- Be generous with matching — patients use non-technical language, synonyms, and layman terms
- Consider body locations, quantities implied, and common colloquialisms
- Match to closest procedure names from the database, even if terminology differs

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

Patient query: "${safeQuery}"
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

    const matches = Array.isArray(llmResponse?.matches) ? llmResponse.matches : [];

    // Persist search context to database for audit trail and downstream propagation
    try {
      const user = await base44.auth.me();
      await base44.asServiceRole.entities.ProcedureSearch.create({
        user_id: user.id,
        raw_query_text: patient_query,
        result_count: matches.length,
        is_matched: matches.length > 0,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to persist search context:', e);
      // Non-blocking - don't break user flow
    }

    // If patient selected a procedure, save the complete record
    if (selected_procedure_id) {
      const fallbackRecord = await base44.asServiceRole.entities.AiFallbackMatch.create({
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
    
    // Persist fallback context to database (non-blocking)
    try {
      const user = await base44.auth.me();
      await base44.asServiceRole.entities.ProcedureSearch.create({
        user_id: user.id,
        raw_query_text: patient_query,
        result_count: 0,
        is_matched: false,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to persist fallback context:', e);
    }
    
    return Response.json({ 
      success: true,
      matched_procedures: fallbackMatches,
      is_fallback: true
    });
  }
}, { name: 'aiProcedureFallback', requireAuth: false }));
