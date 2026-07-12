import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

// Immigration/medical-travel compliance checklist for a passport → destination
// pair. ComplianceChecklistPanel (VisaAssist) has invoked this since it was
// written, but the function never existed — the panel silently failed.
//
// Advisory only: visa rules change and the LLM must say 'unknown' rather than
// guess. This never gates a booking — it prepares the patient.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { passport_country, destination_country, medical_purpose } = await body();
  if (!passport_country || !destination_country) {
    return err('passport_country and destination_country are required');
  }

  // Sanitize free-text before it enters the prompt (injection guard).
  const pc = sanitizePromptInput(passport_country, 80).text;
  const dc = sanitizePromptInput(destination_country, 80).text;
  const mp = sanitizePromptInput(medical_purpose || 'a medical procedure', 200).text;

  const prompt = `You are a medical-travel compliance assistant. A patient holding a ${pc} passport is traveling to ${dc} for ${mp}.

Produce:
1. "policy": visa_status must be exactly one of: visa_free, evisa, embassy_required, unknown. If you are not certain of the current rule, use "unknown" — never guess. visa_summary is 1-2 plain sentences. evisa_url only if an official government eVisa portal exists and you are confident of its domain, otherwise omit. medical_notes: anything specific to entering with medical purpose (medication import rules, doctor letters), or omit.
2. "checklist": 5-10 concrete preparation tasks. Each task: label (short imperative), description (one sentence), category (one of: Documents, Health, Travel, Money), required (boolean), deadline_days_before (number of days before travel it should be done, omit if flexible), link (official source URL only if confident, otherwise omit).

Be conservative. No invented fees, processing times, or URLs.`;

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          policy: {
            type: 'object',
            properties: {
              visa_status: { type: 'string', enum: ['visa_free', 'evisa', 'embassy_required', 'unknown'] },
              visa_summary: { type: 'string' },
              evisa_url: { type: 'string' },
              medical_notes: { type: 'string' },
            },
            required: ['visa_status', 'visa_summary'],
          },
          checklist: {
            type: 'object',
            properties: {
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    required: { type: 'boolean' },
                    deadline_days_before: { type: 'number' },
                    link: { type: 'string' },
                  },
                  required: ['label', 'category'],
                },
              },
            },
            required: ['tasks'],
          },
        },
        required: ['policy', 'checklist'],
      },
    });

    const policy = result?.policy || { visa_status: 'unknown', visa_summary: 'Please verify entry requirements with the embassy.' };
    const checklist = result?.checklist?.tasks?.length ? result.checklist : { tasks: [] };
    return ok({ policy, checklist });
  } catch (e) {
    console.error('[generateComplianceChecklist] LLM failed:', e);
    // Honest degradation — never a dead-end, never invented rules.
    return ok({
      policy: {
        visa_status: 'unknown',
        visa_summary: 'We could not check the current entry rules automatically. Your coordinator will confirm the requirements with you directly.',
      },
      checklist: { tasks: [] },
    });
  }
}, { name: 'generateComplianceChecklist' }));
