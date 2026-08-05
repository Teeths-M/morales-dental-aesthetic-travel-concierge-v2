import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sanitizePromptInput } from '../../shared/sanitizePromptInput.ts';
import { scrubPHI } from '../../shared/scrubPHI.ts';

// "SAFE-T VISA ASSIST™" (src/components/visa/VisaAIChat.jsx) kept its own
// separate frontend identity/branding — Portia's explicit call — but used to
// call InvokeLLM directly from the client: no PHI scrubbing, and no real
// rate limit (its 20-message/3-second cooldown was just JS state, trivially
// bypassed). This function already had everything that was missing, just
// under a different persona (Safe-T4life). `topic` picks which system prompt
// to answer with while sharing one scrubbed, rate-limited backend.
const ASSISTANT_NAME: Record<string, string> = {
  default: 'Safe-T4life',
  visa: 'SAFE-T VISA ASSIST',
};

const VISA_SYSTEM_PROMPT = `You are SAFE-T VISA ASSIST, a friendly, warm, and reassuring AI travel visa advisor for Morales Medical Travel Safety.

Your role is to:
- Help international medical travelers understand visa requirements
- Explain documents needed in simple, non-intimidating language
- Guide patients planning medical travel to Venezuela, Colombia, Dominican Republic, Cuba, Thailand, Turkey, Mexico, Costa Rica, Brazil, and Panama
- Reduce travel anxiety with calm, clear explanations
- Always remind users to verify with official embassy sources

Your tone is:
- Warm, friendly, and reassuring — like a knowledgeable travel companion
- Simple language — no government jargon
- Empathetic to the anxiety of international travel
- Professional but approachable

Always end responses with a helpful next step or offer to answer follow-up questions.
Keep responses concise (2-4 short paragraphs max) and easy to read.
Use occasional emojis to keep the tone friendly and approachable.`;

const SAFETY_SYSTEM_PROMPT = `You are Safe-T4life, the AI safety assistant for Morales Medical Travel Safety — a premium medical tourism platform that coordinates dental and aesthetic procedures abroad for international patients.

Your Role: You are the patient's all-knowing, always-available companion throughout their medical journey.

The 9-Handshake Journey System:
- HS1: Driver pickup (Home → Airport)
- HS2: Airport drop-off (Origin)
- HS3: Airport pickup (Destination Arrivals)
- HS4: Hotel check-in
- HS5: Clinic appointment
- HS6: Companion meal delivery / recovery handoff
- HS7: Return transport (Hotel → Airport)
- HS8: Arrived at home airport
- HS9: Home drop-off (journey complete, Golden M awarded)
Each checkpoint must be confirmed sequentially. If a checkpoint is missed within 15 minutes, the system auto-reroutes the driver.

Emergency Protocols:
- Safe-T4life SOS escalation: 15min stale location → Guardian alert; 30min → security dispatch
- For IMMEDIATE danger: always direct user to the red "Secure Line" button
- Emergency PIN vault accessible offline via PIN for critical documents

Platform Services:
- Passport Vault: AES-256 encrypted document storage, offline accessible
- Guardian View: Family can track patient's real-time GPS location
- Solo Check-in: Automatic welfare checks with escalation if overdue
- Companion Package: Vetted companions for meals, comfort, translation
- Chauffeur Service: Private luxury transfers at every step

Recovery Intelligence:
- Post-procedure timelines vary by procedure type (dental, rhinoplasty, liposuction, etc.)
- Signs requiring immediate medical attention vs. normal healing responses
- Nutrition, hydration, and activity guidance during recovery

Tone: Calm, authoritative, warm — like a trusted doctor AND a caring friend.

Critical Rules:
1. NEVER diagnose medical conditions definitively — guide and escalate
2. For ANY immediate physical danger: end your response with "Tap Secure Line immediately for emergency access."
3. For medical emergencies: provide first-aid guidance AND advise calling local emergency services
4. You are NOT a substitute for emergency services in life-threatening situations`;

/** Sliding-window limiter, same shape as publicDoctorCheck's. */
async function checkRateLimit(base44: any, key: string, windowSeconds: number, maxRequests: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const buckets = await base44.asServiceRole.entities.RateLimitBucket
    .filter({ bucket_key: key }, '-created_date', 1).catch(() => []);
  const bucket = buckets[0];
  if (!bucket) {
    await base44.asServiceRole.entities.RateLimitBucket.create({
      bucket_key: key, window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
    }).catch(() => {});
    return true;
  }
  if (new Date(bucket.window_start) < windowStart) {
    await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
      window_start: now.toISOString(), count: 1, updated_at: now.toISOString(),
    }).catch(() => {});
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  await base44.asServiceRole.entities.RateLimitBucket.update(bucket.id, {
    count: bucket.count + 1, updated_at: now.toISOString(),
  }).catch(() => {});
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This endpoint stays unauthenticated on purpose — a frightened patient may
    // reach the assistant before signing in — but it forwards to a paid LLM, so
    // without a limiter anyone with the URL can drain the Anthropic budget and
    // take the assistant down for real patients. Limited by IP, not identity.
    const ip = (req.headers.get('CF-Connecting-IP')
      || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || 'unknown').trim();
    const minuteOk = await checkRateLimit(base44, `sta_ip_min_${ip}`, 60, 10);
    const hourOk = await checkRateLimit(base44, `sta_ip_hour_${ip}`, 3600, 120);
    if (!minuteOk || !hourOk) {
      return Response.json({
        error: 'You have sent a lot of messages very quickly. Please wait a moment and try again — if this is an emergency, use the SOS button or call your local emergency number.',
      }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { messages, user_email, user_name, trip_phase, topic } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    const assistantName = ASSISTANT_NAME[topic] || ASSISTANT_NAME.default;
    const systemPrompt  = topic === 'visa' ? VISA_SYSTEM_PROMPT : SAFETY_SYSTEM_PROMPT;

    // Filter and trim conversation — skip leading assistant messages (Anthropic/LLM requirement)
    // Sanitize (injection guard) + scrub PHI (subprocessor has no BAA) before the
    // content reaches the prompt.
    const allMsgs = messages.slice(-20).map((m) => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: scrubPHI(sanitizePromptInput(m.content, 1500).text),
    }));
    const firstUserIdx = allMsgs.findIndex((m) => m.role === 'user');
    if (firstUserIdx === -1) {
      return Response.json({ reply: "Please send a message and I'll be right with you." });
    }
    const conversation = allMsgs.slice(firstUserIdx);

    // Format conversation history as text for the prompt
    const historyLines = conversation.slice(0, -1).map((m) =>
      `${m.role === 'user' ? 'Patient' : assistantName}: ${m.content}`
    ).join('\n');

    const lastMsg = conversation[conversation.length - 1];
    const lastUserContent = lastMsg?.content ?? '';

    // Build user context suffix — first name only, no email (PHI minimization;
    // the LLM subprocessor has no BAA).
    const firstName = String(user_name || '').split(' ')[0];
    const userCtx = firstName
      ? `\n\nCurrent patient: ${firstName}${trip_phase ? ` — Journey phase: ${trip_phase}` : ''}`
      : '';

    const fullPrompt = [
      systemPrompt,
      userCtx,
      historyLines ? `\n\nPrevious conversation:\n${historyLines}` : '',
      `\n\nPatient: ${lastUserContent}`,
      `\n\n${assistantName} (respond in character):`,
    ].join('');

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: fullPrompt,
    });

    // InvokeLLM returns a raw string when no JSON schema is provided, but can
    // also come back shaped as { result } — same coercion as
    // SubmissionSuccess.jsx/VisaAIChat.jsx for this call shape.
    let reply: string;
    if (typeof llmResponse === 'string' && llmResponse.trim()) {
      reply = llmResponse.trim();
    } else if (llmResponse?.result) {
      reply = String(llmResponse.result);
    } else if (llmResponse?.reply) {
      reply = String(llmResponse.reply);
    } else if (llmResponse?.content) {
      reply = String(llmResponse.content);
    } else if (llmResponse?.text) {
      reply = String(llmResponse.text);
    } else {
      reply = "I'm here to help. Could you give me a bit more detail?";
    }

    return Response.json({ reply });

  } catch (error) {
    console.error('[safeTAssist] error:', error);
    return Response.json({
      reply: "I'm having a moment of difficulty. If this is urgent, please tap **Secure Line** or contact your Morales coordinator directly.",
    });
  }
});
