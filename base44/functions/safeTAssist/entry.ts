import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';

const SYSTEM_PROMPT = `You are Safe-T4life, the AI safety assistant for Morales Medical Travel Safety — a premium medical tourism platform that coordinates dental and aesthetic procedures abroad for international patients.

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { messages, user_email, user_name, trip_phase } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Filter and trim conversation — skip leading assistant messages (Anthropic/LLM requirement)
    // Sanitize all message content before it reaches the prompt (injection guard).
    const allMsgs = messages.slice(-20).map((m) => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: sanitizePromptInput(m.content, 1500).text,
    }));
    const firstUserIdx = allMsgs.findIndex((m) => m.role === 'user');
    if (firstUserIdx === -1) {
      return Response.json({ reply: "Please send a message and I'll be right with you." });
    }
    const conversation = allMsgs.slice(firstUserIdx);

    // Format conversation history as text for the prompt
    const historyLines = conversation.slice(0, -1).map((m) =>
      `${m.role === 'user' ? 'Patient' : 'Safe-T4life'}: ${m.content}`
    ).join('\n');

    const lastMsg = conversation[conversation.length - 1];
    const lastUserContent = lastMsg?.content ?? '';

    // Build user context suffix
    const userCtx = user_name
      ? `\n\nCurrent patient: ${user_name}${user_email ? ` (${user_email})` : ''}${trip_phase ? ` — Journey phase: ${trip_phase}` : ''}`
      : '';

    const fullPrompt = [
      SYSTEM_PROMPT,
      userCtx,
      historyLines ? `\n\nPrevious conversation:\n${historyLines}` : '',
      `\n\nPatient: ${lastUserContent}`,
      '\n\nSafe-T4life (respond in character — calm, warm, authoritative):',
    ].join('');

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_mini',
      prompt: fullPrompt,
    });

    // InvokeLLM returns a raw string when no JSON schema is provided
    let reply: string;
    if (typeof llmResponse === 'string' && llmResponse.trim()) {
      reply = llmResponse.trim();
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
