# AI Agentic Governance Standard

## Overview

This document establishes the platform-wide AI governance framework that all LLM integrations must adhere to. Every existing and future AI feature (Voice Mode, Procedure Search, Consultation Summaries, Doctor Reports, Chat Messaging) inherits these architectural guardrails.

---

## 1. GLOBAL SYSTEM PROMPT LAYER (The Platform Persona)

All LLM connections must be wrapped with a foundational system middleware layer that enforces:

### Core Persona
**Expert clinical concierge assistant** for a premium, ultra-high-touch medical tourism platform.

### Tone Adaptation
- **For patients**: Empathetic, jargon-free, conversational, warm
- **For doctors**: Precise, data-dense, clinical terminology
- **Always**: Premium, trustworthy, professional demeanor

### Non-Negotiable Constraints
1. ONLY suggest procedures from these categories:
   - Dental
   - Aesthetic
   - Wellness
   - Hair Restoration
   - Bariatric
   - Orthopedics
   - Fertility

2. NEVER invent procedures, doctors, or clinical options that don't exist in the database

3. ALWAYS validate against live database entities before responding

4. If uncertain or query is gibberish → route to "General Specialist Consultation"

### Fallback Rule
If input is ambiguous, slang, or unmappable → gracefully return "General Specialist Consultation" with 50% confidence. Never error out, break UI, or show blank states. Keep user momentum at 100% by always providing a next step.

---

## 2. MANDATORY "ZERO-FRICTION" FALLBACK PATTERN

Apply our smart-fallback architecture globally across all user-facing AI tools:

### Standard Behavioral Rule
If a user provides ambiguous data, slang, or completely unmappable inputs (via text, voice, or chat), the AI must:
- ✅ NEVER return an error state
- ✅ NEVER break the UI
- ✅ NEVER display a blank screen
- ✅ Gracefully route to a generic, high-touch alternative (e.g., "General Specialist Consultation" or "Live Coordinator Hand-off")
- ✅ Keep user's text/voice intent saved in the database context
- ✅ Maintain booking momentum at 100%

### Implementation Pattern
```javascript
// Fallback option template
const fallbackOption = {
  procedure_id: "general_consultation",
  procedure_name: "General Specialist Consultation",
  match_confidence: 50,
  rationale: "A specialist will personally review your case and recommend the best procedure for your goals."
};

// ALWAYS return this in catch blocks, never throw errors
return Response.json({ 
  success: true,
  matched_procedures: [fallbackOption],
  is_fallback: true
});
```

---

## 3. PERFORMANCE & LATENCY STANDARD

### Customer-Facing Paths
All non-analytical customer paths must use:
- **Model**: `gpt_5_mini` (lightweight, fast response)
- **Timeout**: 1500ms max
- **UI**: Always display premium Tailwind animated pulse/skeleton loader

### Analytical Paths
Complex analytical tasks may use higher-quality models:
- **Model**: `claude_sonnet_4_6` or equivalent
- **Timeout**: 3000ms max
- **UI**: Still display loader

### Premium Loader Standard
Every asynchronous AI state must show our signature animated pulse loader:

```jsx
<div className="flex items-center justify-center gap-1.5">
  <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]"></span>
  <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]"></span>
  <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.4s]"></span>
</div>
```

---

## 4. DATA UNIFICATION & PERSISTENCE

### Context Flow Pipeline
```
Voice Input (VoiceMode)
    ↓
AI Extraction (with governance rules)
    ↓
Save to ProcedureSearch entity (transcript + intent)
    ↓
Save to AiFallbackMatch if AI matching occurred
    ↓
Propagate through Consultation → CaseRecord → Doctor Portal
    ↓
Audit trail complete
```

### Required Entity Logging
Every AI interaction must log to:

1. **ProcedureSearch** entity:
   - `user_id`
   - `raw_query_text`
   - `result_count`
   - `is_matched`
   - `timestamp`

2. **AiFallbackMatch** entity (if AI matching):
   - `patient_id`
   - `patient_email`
   - `original_query`
   - `matched_procedures`
   - `selected_procedure_id`
   - `patient_custom_note`
   - `doctor_notified`
   - `created_at`

### Downstream Propagation
All contextual notes, raw user voice transcripts, and AI matching justifications must automatically pass along the database chain:
- From search → consultation table
- From consultation → doctor portal
- From doctor portal → final report

---

## 5. IMPLEMENTATION CHECKLIST

### For New AI Features
- [ ] Inherit global system prompt from `lib/AIGovernanceLayer.js`
- [ ] Use `gpt_5_mini` model for customer paths
- [ ] Implement graceful fallback handler (never throw errors)
- [ ] Add premium Tailwind pulse loader to UI
- [ ] Log to ProcedureSearch entity
- [ ] Log to AiFallbackMatch if applicable
- [ ] Ensure data flows through entire booking journey

### For Existing AI Features
- [ ] Voice Mode → ✅ Updated (governance applied)
- [ ] Procedure Search (SmartFallback) → ✅ Updated (governance applied)
- [ ] generateClientProposal → ⏳ Needs review
- [ ] generateCulturalCarePackage → ⏳ Needs review
- [ ] iq200Pipeline → ⏳ Needs review

---

## 6. REFERENCE IMPLEMENTATION

### Backend Function Template
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use governed AI call with platform persona
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gpt_5_mini",
      prompt: `You are an expert clinical concierge assistant for a premium, ultra-high-touch medical tourism platform...
      
      [Full system prompt from governance standard]`,
      response_json_schema: { ... }
    });

    // Persist context to database
    await base44.entities.ProcedureSearch.create({
      user_id: user.id,
      raw_query_text: input,
      result_count: result.matches.length,
      is_matched: result.matches.length > 0,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, data: result });

  } catch (error) {
    // Graceful fallback - NEVER break UI
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
```

### Frontend Component Template
```jsx
import { AIGovernance } from '@/lib/AIGovernanceLayer';

// In your component:
const handleAIRequest = async () => {
  setIsLoading(true);
  
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      model: AIGovernance.Performance.customerPath.model,
      prompt: `${AIGovernance.SystemPrompt.base}\n\n[Your specific prompt]`,
      response_json_schema: { ... }
    });
    
    // Persist context
    await AIGovernance.Context.persistSearchContext(base44, {
      raw_query: userInput,
      result_count: result.matches.length,
      is_matched: result.matches.length > 0
    });
    
  } catch (error) {
    // Governance fallback - keep momentum
    console.error('AI error, using fallback:', error);
  } finally {
    setIsLoading(false);
  }
};

// Render premium loader
{isLoading && (
  <div className="flex items-center justify-center gap-1.5">
    <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]"></span>
    <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]"></span>
    <span className="w-1 h-4 bg-emerald-600 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.4s]"></span>
  </div>
)}
```

---

## 7. GOVERNANCE FILES

- `lib/AIGovernanceLayer.js` — Central governance utilities (frontend use only)
- `AI_GOVERNANCE_STANDARD.md` — This document
- `functions/aiProcedureFallback` — Reference implementation
- `components/procedures/VoiceMode` — Reference implementation
- `components/procedures/SmartFallback` — Reference UI implementation

---

**Last Updated**: 2026-06-10  
**Version**: 1.0  
**Status**: ✅ Active & Enforced