import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, case_id, source_language, target_language, audio_url, session_token } = await req.json();

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

      return Response.json({ session_token: sessionToken, session_id: session.id, session_type });
    }

    // TRANSLATE AUDIO (Transcribe + Translate + TTS)
    if (action === 'translate_audio') {
      if (!audio_url || !source_language || !target_language || !session_token) {
        return Response.json({ error: 'audio_url, source_language, target_language, session_token required' }, { status: 400 });
      }

      // Step 1: Transcribe audio to text
      const transcription = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url });
      const originalText = transcription.data || '';

      if (!originalText) {
        return Response.json({ error: 'No speech detected in audio' }, { status: 400 });
      }

      // Step 2: Translate text using LLM
      const translationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Translate the following text from ${source_language} to ${target_language}. Return ONLY the translation, nothing else: "${originalText}"`,
        add_context_from_internet: false
      });
      const translatedText = typeof translationResult === 'string' ? translationResult : originalText;

      // Step 3: Generate speech (TTS) for translated text
      const speechResult = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text: translatedText,
        language_code: target_language
      });
      const audioUrl = speechResult.url;

      // Update session metrics
      const session = await base44.asServiceRole.entities.WalkieTalkieSession.filter(
        { session_token: session_token, status: 'active' },
        '-created_date',
        1
      );

      if (session[0]) {
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
  } catch (error) {
    console.error('[walkieTalkieTranslate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});