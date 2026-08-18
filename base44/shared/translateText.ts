// ── translateText ─────────────────────────────────────────────────────────
// Plain text-to-text translation, extracted from walkieTalkieTranslate's
// own step 2 (transcribe -> TRANSLATE -> speak) so a caller that only needs
// the middle step — no audio in, no TTS out — doesn't have to go through
// the audio pipeline to get it. This is the 3rd real use of the same
// "InvokeLLM with a translate prompt" pattern in this codebase
// (translateEmergencySOS, triggerSOS both duplicate it inline) — centralized
// here rather than a 4th copy.
//
// Best-effort by design: on any failure this returns the original text
// unchanged rather than throwing, matching every existing caller's own
// "continue with the original text if translation fails" behavior.

import { sanitizePromptInput } from './sanitizePromptInput.ts';

export async function translateText(
  base44: any,
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) return text;

  const safeText = sanitizePromptInput(text, 3000).text;

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translation, nothing else: "${safeText}"`,
      add_context_from_internet: false,
    });
    const translated = typeof result === 'string' ? result : (result?.data ?? result?.text);
    return typeof translated === 'string' && translated.trim() ? translated : text;
  } catch (_) {
    return text;
  }
}
