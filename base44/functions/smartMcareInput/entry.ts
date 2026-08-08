// smartMcareInput — lightweight AI assist for the M-Safe chat input.
// Two modes:
//   mode 'predict' → returns 3 tappable completion suggestions for partial text
//   mode 'correct' → returns spelling/vocabulary-corrected text + a flag if changed
// Uses gpt_5_mini (fast, low-cost) since this fires on debounced keystrokes.
// requireAuth: false so anonymous visitors (who can chat with M-Care) get the
// same spelling help — the input itself contains no PII until sent. Uses
// createHandler (mandatory for every function in this repo) rather than a
// raw handler — a raw, ungated endpoint here would let anyone drive
// unlimited InvokeLLM calls at no cost to them; createHandler's default rate
// limit closes that.
import { createHandler } from '../../shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, body }) => {
  const raw = await body<{ text?: string; mode?: string }>();
  const text = (raw?.text || '').trim();
  const mode = raw?.mode === 'correct' ? 'correct' : 'predict';

  // Don't waste a call on empty or single-char input
  if (!text || text.length < 2) {
    return Response.json({ mode, predictions: [], corrected: text, changed: false });
  }

  try {
    if (mode === 'predict') {
      // Only predict if the text looks incomplete (no terminal punctuation, < 120 chars)
      const looksComplete = /[.!?]$/.test(text) || text.length > 140;
      if (looksComplete) {
        return Response.json({ mode, predictions: [] });
      }
      const llmRes = await base44.integrations.Core.InvokeLLM({
        model: 'gpt_5_mini',
        prompt: `You are an autocomplete engine for a medical-travel safety assistant called M-Safe. The user is typing a message. Given their partial text, predict 3 SHORT, natural completions they might send next. Each completion should be a realistic short phrase that finishes their thought (append to their text, do NOT repeat it). Keep each under 12 words. Return ONLY a JSON object: {"predictions": ["completion1", "completion2", "completion3"]}. No markdown, no explanation.

User's partial text: "${text}"`,
        response_json_schema: {
          type: 'object',
          properties: {
            predictions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });
      const predictions = Array.isArray((llmRes as any)?.predictions)
        ? (llmRes as any).predictions.filter((p: any) => typeof p === 'string' && p.trim()).slice(0, 3)
        : [];
      return Response.json({ mode, predictions });
    }

    // mode === 'correct'
    const llmRes = await base44.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: `You are a spelling and vocabulary corrector for a medical-travel safety chat. Fix spelling mistakes, typos, and poor grammar in the user's message. Preserve their exact meaning and intent. Do NOT change medical terms, procedure names, dosages, or place names that are already correct. Do NOT add information or rephrase for style — only fix errors. Keep the same language (if they wrote Spanish, return Spanish). If the text is already correct, return it unchanged. Return ONLY a JSON object: {"corrected": "the corrected text", "changed": true_or_false}.

User's text: "${text}"`,
      response_json_schema: {
        type: 'object',
        properties: {
          corrected: { type: 'string' },
          changed: { type: 'boolean' },
        },
      },
    });
    const corrected = typeof (llmRes as any)?.corrected === 'string' ? (llmRes as any).corrected.trim() : text;
    const changed = !!((llmRes as any)?.changed) && corrected.toLowerCase() !== text.toLowerCase();
    return Response.json({ mode, corrected: corrected || text, changed });
  } catch (error) {
    return Response.json({ mode: 'predict', predictions: [], corrected: '', changed: false, error: (error as any)?.message || 'unknown' });
  }
}, { name: 'smartMcareInput', requireAuth: false }));
