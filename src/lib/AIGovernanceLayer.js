/**
 * AI Agentic Governance Layer
 * 
 * Centralized constitutional AI guardrails for all LLM integrations.
 * Enforces platform persona, constraints, fallback patterns, and data persistence.
 */

/**
 * GLOBAL SYSTEM PROMPT - The Platform Persona
 * All LLM calls must inherit this foundational system middleware layer
 */
export const AISystemPrompt = {
  base: `You are an expert clinical concierge assistant for a premium, ultra-high-touch medical tourism platform. Your role is to facilitate seamless patient-to-procedure matching while maintaining clinical accuracy and zero hallucinations.

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
- Keep user momentum at 100% by always providing a next step`,

  // Specialized variants for different contexts
  procedureMatching: `
ADDITIONAL PROCEDURE MATCHING RULES:
- Analyze underlying patient intent (e.g., "fix overlapping teeth" → Alignment/Veneers; "belly tuck" → Gastric Sleeve or Plastic Surgery)
- Be generous with matching — patients use non-technical language, synonyms, and layman terms
- Consider body locations, quantities implied, and common colloquialisms
- Match to closest procedure names from the database, even if terminology differs`,

  voiceExtraction: `
ADDITIONAL VOICE EXTRACTION RULES:
- Extract ALL procedures mentioned from spoken text
- Handle run-on sentences, filler words, and casual speech patterns
- Include synonyms, body locations mentioned, and quantities implied
- Return comprehensive list — better to over-extract than under-extract`,

  doctorCommunication: `
ADDITIONAL DOCTOR COMMUNICATION RULES:
- Use precise clinical terminology
- Include relevant medical history, risk factors, and contraindications
- Present data in structured, scannable format
- Prioritize clinical safety and accuracy over brevity`
};

/**
 * CONSTRAINT ENGINE - Category Whitelist & Hallucination Guards
 */
export const AIConstraintEngine = {
  allowedCategories: [
    'Dental',
    'Aesthetic',
    'Wellness',
    'Hair Restoration',
    'Bariatric',
    'Orthopedics',
    'Fertility'
  ],

  // Validate procedure category before returning to user
  validateCategory(category) {
    const normalized = category?.trim().toLowerCase();
    return this.allowedCategories.some(cat => 
      normalized === cat.toLowerCase() || normalized.includes(cat.toLowerCase())
    );
  },

  // Fallback option when no match found or error occurs
  fallbackOption: {
    procedure_id: "general_consultation",
    procedure_name: "General Specialist Consultation",
    match_confidence: 50,
    rationale: "A specialist will personally review your case and recommend the best procedure for your goals."
  },

  // Graceful fallback handler - never break UI
  handleFallback(error, context = {}) {
    console.error('AI Governance Fallback Triggered:', error);
    
    return {
      success: true,
      is_fallback: true,
      matched_procedures: [this.fallbackOption],
      fallback_reason: error?.message || 'Unmappable input',
      context_saved: context
    };
  }
};

/**
 * PERFORMANCE PROFILE - Model Selection & Latency Rules
 */
export const AIPerformanceProfile = {
  // Default model for customer-facing paths (fast, lightweight)
  customerPath: {
    model: "gpt_5_mini",
    timeout: 1500, // ms
    showLoader: true
  },

  // Higher quality model for complex analytical tasks
  analyticalPath: {
    model: "claude_sonnet_4_6",
    timeout: 3000,
    showLoader: true
  },

  // Get profile based on use case
  getProfile(useCase = 'customer') {
    return useCase === 'analytical' ? this.analyticalPath : this.customerPath;
  }
};

/**
 * CONTEXT UNIFICATION - Data Persistence Pipeline
 */
export const AIContextUnification = {
  /**
   * Save search context to database for audit trail and downstream propagation
   * 
   * Flow: Search → ProcedureSearch entity → AiFallbackMatch (if needed) → Consultation → Doctor Portal
   */
  async persistSearchContext(base44, data) {
    try {
      const user = await base44.auth.me();
      
      // Always log to ProcedureSearch for analytics
      await base44.entities.ProcedureSearch.create({
        user_id: user.id,
        raw_query_text: data.raw_query,
        result_count: data.result_count || 0,
        is_matched: data.is_matched || false,
        timestamp: new Date().toISOString()
      });

      // If this is a fallback/AI match, save detailed context
      if (data.is_fallback || data.matched_procedures) {
        await base44.entities.AiFallbackMatch.create({
          patient_id: user.id,
          patient_email: user.email,
          original_query: data.raw_query,
          matched_procedures: data.matched_procedures || [],
          selected_procedure_id: data.selected_procedure_id || null,
          patient_custom_note: data.patient_custom_note || '',
          doctor_notified: false,
          created_at: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to persist AI context:', error);
      return false; // Non-blocking — don't break user flow
    }
  }
};

/**
 * WRAPPER FUNCTION - Unified AI Call with Governance
 */
export async function governedAICall(base44, options) {
  const {
    prompt,
    response_json_schema,
    useCase = 'customer',
    context = {}
  } = options;

  // Guard: respect System Pause — asServiceRole.integrations bypasses the Proxy
  try {
    const { isSystemPaused } = await import('@/lib/systemPause');
    if (isSystemPaused()) {
      console.warn('[SYSTEM PAUSED] Blocked governedAICall — returning fallback');
      return { success: false, data: null, is_fallback: true, reason: 'system_paused' };
    }
  } catch (_) {}

  const profile = AIPerformanceProfile.getProfile(useCase);

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: profile.model,
      prompt: `${AISystemPrompt.base}\n\n${prompt}`,
      response_json_schema
    });

    return {
      success: true,
      data: result,
      is_fallback: false
    };
  } catch (error) {
    // Use constraint engine fallback handler
    return AIConstraintEngine.handleFallback(error, context);
  }
}

// Export all governance utilities
export const AIGovernance = {
  SystemPrompt: AISystemPrompt,
  Constraints: AIConstraintEngine,
  Performance: AIPerformanceProfile,
  Context: AIContextUnification,
  call: governedAICall
};