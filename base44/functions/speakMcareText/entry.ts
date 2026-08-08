import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── speakMcareText ────────────────────────────────────────────────────────
// Voice OUTPUT for M-Care — the reply half of Phase 2B's voice input. A thin
// sibling of transcribeVoiceInput/entry.ts: same proven Core primitive
// pattern as walkieTalkieTranslate/entry.ts (which already uses
// Core.GenerateSpeech in production), stripped down to just text-in,
// audio-out — no session/translation machinery, since M-Care already has
// the text; it just needs it spoken.
//
// requireAuth stays false — voice output should work for a logged-out
// visitor exactly like the text chat and voice input already do;
// createHandler's default public rate limit applies automatically.
//
// Opt-in only: the frontend calls this per-message when the user taps
// "Listen," never automatically on every reply — unsolicited audio in a
// public/quiet setting would be the opposite of frictionless.

const BodySchema = strictObject({
  text: Fields.shortText(3000),
  language: Fields.shortText(10).optional(),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { text, language } = await body<{ text?: string; language?: string }>();
  if (!text?.trim()) return err('text is required');

  try {
    const speech = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: text.trim(),
      language_code: language || 'en',
    });
    const audioUrl = speech?.url || speech?.data?.url;
    if (!audioUrl) return err('Speech generation returned no audio', 502);
    return ok({ audio_url: audioUrl });
  } catch (e) {
    return err('Speech generation failed — ' + (e?.message || 'unknown error'));
  }
}, { name: 'speakMcareText', requireAuth: false, bodySchema: BodySchema }));
