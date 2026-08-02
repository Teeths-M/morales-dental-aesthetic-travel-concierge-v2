import { createHandler } from '../../shared/createHandler.ts';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { z, strictObject, validate, Fields } from '../../shared/validate.ts';

// Action-multiplexed body — z.discriminatedUnion instead of createHandler's
// bodySchema hook, since each action has a different required shape.
const WalkieSchema = z.discriminatedUnion('action', [
  strictObject({
    action: z.literal('create_session'),
    case_id: z.string().trim().max(100).optional(),
    source_language: Fields.shortText(50),
    target_language: Fields.shortText(50),
  }),
  strictObject({
    action: z.literal('translate_audio'),
    audio_url: Fields.shortText(2000),
    source_language: Fields.shortText(50),
    target_language: Fields.shortText(50),
    session_token: Fields.shortText(100),
  }),
  strictObject({
    action: z.literal('end_session'),
    session_token: Fields.shortText(100),
  }),
  strictObject({
    action: z.literal('get_session'),
    session_token: Fields.shortText(100),
  }),
]);

async function checkRateLimit(base44, key, windowSeconds, maxRequests) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket.filter({ bucket_key: key });
  const bucket = buckets[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({ bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { window_start: now.toISOString(), count: 1, updated_at: now.toISOString() });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, { count: bucket.count + 1, updated_at: now.toISOString() });
  return true;
}

Deno.serve(createHandler(async ({ base44, user, body }) => {
    
    // Verify authenticated
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const rawBody = await body();
    const validated = validate(WalkieSchema, rawBody);
    if (!validated.ok) return Response.json({ error: validated.message }, { status: 400 });
    const { action, case_id, source_language, target_language, audio_url, session_token } = validated.data as any;

    // CREATE SESSION
    if (action === 'create_session') {
      if (!source_language || !target_language) {
        return Response.json({ error: 'source_language and target_language required' }, { status: 400 });
      }

      // Check if user has medical package (free) or needs to pay
      let sessionType = 'travel';
      if (case_id) {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter(
          { client_email: user.email, id: case_id },
          '-created_date',
          1
        );
        if (cases[0]) {
          sessionType = 'medical'; // Medical package users get it free
        }
      }

      const sessionToken = 'WALKIE_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      
      // Use service role with explicit permission check
      const session = await base44.asServiceRole.entities.WalkieTalkieSession.create({
        session_token: sessionToken,
        case_id: case_id || null,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        user_role: user.role || 'client',
        session_type: sessionType,
        source_language,
        target_language,
        status: 'active',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      return Response.json({ session_token: sessionToken, session_id: session.id, session_type: sessionType });
    }

    // TRANSLATE AUDIO (Transcribe + Translate + TTS)
    if (action === 'translate_audio') {
      // RATE LIMIT: 30 translations per user per hour (LLM + TTS are expensive)
      const allowed = await checkRateLimit(base44, `${user.id}:walkieTalkieTranslate`, 3600, 30);
      if (!allowed) return Response.json({ error: 'Translation rate limit exceeded. Maximum 30 translations per hour.' }, { status: 429 });

      console.log('[walkieTalkieTranslate] translate_audio called with:', { audio_url, source_language, target_language, session_token });
      
      if (!audio_url || !source_language || !target_language || !session_token) {
        console.error('[walkieTalkieTranslate] Missing required params');
        return Response.json({ error: 'audio_url, source_language, target_language, session_token required' }, { status: 400 });
      }

      // Step 1: Transcribe audio to text
      console.log('[walkieTalkieTranslate] Transcribing audio...');
      let originalText = '';
      
      try {
        const transcription = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
        // SDK may return text directly or wrapped in .data
        originalText = (typeof transcription === 'string' ? transcription : transcription?.data || transcription?.text) || '';
        console.log('[walkieTalkieTranslate] Transcription result:', originalText);
      } catch (e) {
        console.error('[walkieTalkieTranslate] Transcription failed:', e.message);
        return Response.json({ 
          error: 'Transcription failed: ' + (e.message || 'Unknown error'),
          original_text: '',
          translated_text: '',
          audio_url: null
        }, { status: 500 });
      }

      if (!originalText || originalText.trim() === '') {
        return Response.json({ 
          error: 'No speech detected in audio',
          original_text: '',
          translated_text: '',
          audio_url: null
        }, { status: 400 });
      }

      // Step 2: Translate text using LLM
      console.log('[walkieTalkieTranslate] Translating text...');
      let translatedText = originalText;

      // SEC-11: sanitize transcribed speech before LLM interpolation — a
      // caller controls this text indirectly via the audio they upload.
      // Never blocks the translation on a flag; only defuses the text.
      const safeOriginalText = sanitizePromptInput(originalText, 3000).text;

      try {
        const translationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Translate the following text from ${source_language} to ${target_language}. Return ONLY the translation, nothing else: "${safeOriginalText}"`,
          add_context_from_internet: false
        });
        translatedText = typeof translationResult === 'string' ? translationResult : originalText;
        console.log('[walkieTalkieTranslate] Translation result:', translatedText);
      } catch (e) {
        console.error('[walkieTalkieTranslate] Translation failed:', e.message);
        // Continue with original text if translation fails
      }

      // Step 3: Generate speech (TTS) for translated text
      console.log('[walkieTalkieTranslate] Generating speech...');
      let audioUrl = null;
      
      try {
        const speechResult = await base44.asServiceRole.integrations.Core.GenerateSpeech({
          text: translatedText,
          language_code: target_language
        });
        audioUrl = speechResult.url;
        console.log('[walkieTalkieTranslate] Speech URL:', audioUrl);
      } catch (e) {
        console.error('[walkieTalkieTranslate] TTS failed:', e.message);
        // Continue without audio if TTS fails
      }

      // Update session metrics
      const session = await base44.asServiceRole.entities.WalkieTalkieSession.filter(
        { session_token: session_token, status: 'active' },
        '-created_date',
        1
      );

      if (session && session[0]) {
        await base44.asServiceRole.entities.WalkieTalkieSession.update(session[0].id, {
          message_count: (session[0].message_count || 0) + 1
        });
      }

      return Response.json({
        original_text: originalText,
        translated_text: translatedText,
        audio_url: audioUrl,
        source_language,
        target_language
      });
    }

    // END SESSION
    if (action === 'end_session') {
      if (!session_token) {
        return Response.json({ error: 'session_token required' }, { status: 400 });
      }

      const session = await base44.asServiceRole.entities.WalkieTalkieSession.filter(
        { session_token: session_token, status: 'active' },
        '-created_date',
        1
      );

      if (!session[0]) {
        return Response.json({ error: 'Session not found or already ended' }, { status: 404 });
      }

      const startedAt = new Date(session[0].started_at);
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      await base44.asServiceRole.entities.WalkieTalkieSession.update(session[0].id, {
        status: 'ended',
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds
      });

      // Log audit event
      await base44.asServiceRole.functions.invoke('logAuditEvent', {
        event_type: 'walkie_talkie_session_ended',
        resource_type: 'WalkieTalkieSession',
        resource_id: session[0].id,
        details: { duration_seconds: durationSeconds, message_count: session[0].message_count }
      });

      return Response.json({ success: true, duration_seconds: durationSeconds });
    }

    // GET SESSION STATUS
    if (action === 'get_session') {
      if (!session_token) {
        return Response.json({ error: 'session_token required' }, { status: 400 });
      }

      const sessions = await base44.asServiceRole.entities.WalkieTalkieSession.filter(
        { session_token: session_token },
        '-created_date',
        1
      );

      if (!sessions[0]) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      return Response.json({ session: sessions[0] });
    }

    return Response.json({ error: 'Invalid action. Use: create_session, translate_audio, end_session, get_session' }, { status: 400 });
}, { name: 'walkieTalkieTranslate' }));
