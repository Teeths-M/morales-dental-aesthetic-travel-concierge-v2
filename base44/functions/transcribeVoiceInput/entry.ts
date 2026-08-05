import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { strictObject, Fields } from '../../shared/validate.ts';

// ── transcribeVoiceInput ─────────────────────────────────────────────────────
// Voice as a first-class input for M-Care (Phase 2B). A thin transcribe-only
// sibling of walkieTalkieTranslate/entry.ts — reuses the same
// Core.TranscribeAudio primitive that function already proved out in
// production, but drops the translation/TTS/session machinery that feature
// needs and this one doesn't: M-Care just needs spoken words turned into the
// same typed text its existing chat/booking-intent/signup flows already
// handle. requireAuth stays false — voice input should work for a logged-out
// visitor exactly like typing does; createHandler's default public rate
// limit (see base44/shared/rateLimit.ts) applies automatically since this
// function doesn't opt out of it.
//
// Deliberately returns the RAW transcript, unsanitized — this function's
// only job is speech-to-text, not putting that text in front of an LLM. The
// caller displays it for the user to review/edit, and whichever downstream
// function the resulting text is actually sent to (parseBookingIntent,
// intakeConversationTurn, moralesAssist) already sanitizes it before that
// happens, same as if the user had typed it directly.

const BodySchema = strictObject({
  audio_url: Fields.shortText(2000),
});

Deno.serve(createHandler(async ({ base44, body }) => {
  const { audio_url } = await body<{ audio_url?: string }>();
  if (!audio_url) return err('audio_url is required');

  try {
    const transcription = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
    const text = (typeof transcription === 'string' ? transcription : transcription?.data || transcription?.text) || '';
    if (!text.trim()) return err('No speech detected in audio');
    return ok({ text: text.trim() });
  } catch (e) {
    return err('Transcription failed — ' + (e?.message || 'unknown error'));
  }
}, { name: 'transcribeVoiceInput', requireAuth: false, bodySchema: BodySchema }));
