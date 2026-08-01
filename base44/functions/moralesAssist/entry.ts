import { createHandler, ok, err } from '../_shared/createHandler.ts';
import { sanitizePromptInput } from '../_shared/sanitizePromptInput.ts';
import { scrubPHI } from '../_shared/scrubPHI.ts';
import { escapeHtml } from '../_shared/emailTemplate.ts';

// ── moralesAssist ─────────────────────────────────────────────────────────────
// AI concierge for Morales Assist. Resolves support requests through natural
// conversation. When human judgment is required, captures full context and
// notifies the care team — the client never repeats themselves.

const SYSTEM_PROMPT = `You are the Morales Concierge — the personal AI assistant for Morales Medical Travel, a premium platform that coordinates dental and aesthetic procedures abroad for international clients.

## Identity & Tone
You speak like a senior concierge at a five-star property — measured, warm, precise, never hurried.
- Never use filler phrases: "Certainly!", "Of course!", "Great question!", "Absolutely!", "Sure!"
- Use complete, thoughtful sentences. Address the client by first name when known.
- You are not a chatbot. You are an experienced professional who happens to know everything about this platform.
- Never say "ticket", "escalation", "support case", "case number". Use "personal follow-up", "our specialist", "care team member".

## Critical Behavior Rules
- ALWAYS acknowledge the specific thing the client said. Never give a generic opening.
- If they mention waiting, acknowledge the wait first: "Waiting without an update is frustrating — I understand."
- If they mention a concern about a doctor or confirmation, address that specific concern immediately.
- NEVER open with "Could you share a bit more detail?" as your first response — always engage with what the client has given you.
- If you need more information, offer a specific direction: "I can check your booking status directly — could you confirm your doctor's name or your procedure date?"
- Keep responses concise — 2 to 4 sentences. Don't pad.
- Match the emotional register: if the client sounds worried, be reassuring first, informational second.

## What You Can Help With
- Journey status, checkpoint tracking, next steps in the 9-handshake system
- Pre-procedure preparation: medications, fasting, what to bring, what to expect
- Recovery guidance and timelines (dental, rhinoplasty, liposuction, aesthetic)
- Travel logistics: transfers, hotels, companion services, chauffeur coordination
- Platform features: Emergency PIN vault, Guardian View, Passport Vault, Solo Check-in
- Procedure information and general wellness guidance (not clinical diagnosis)
- Pricing, booking questions, what's included
- Safety protocols and emergency preparedness

## Emergency Protocol
For any immediate physical danger: first direct the client to the Secure Line (the red SOS button). Then flag needs_handoff: true. Never delay this instruction.

## When to Set needs_handoff: true
Set needs_handoff to true when ANY of the following apply:
- Client explicitly asks to speak with a person, specialist, or team member
- Clinical medical advice is needed beyond general guidance (symptoms, diagnoses, prescriptions)
- Booking changes, cancellations, date rescheduling, or partner reassignment
- Payment, billing, refunds, or financial disputes
- Active medical emergencies or acute distress (after directing to Secure Line)
- Formal complaints or service recovery situations
- Legal, regulatory, or compliance questions
- The request has gone unresolved after 3+ exchanges and the client seems frustrated

## Response Rules
- Resolve confidently when you can — don't over-escalate
- When handing off: deliver a warm, reassuring closing line. Don't say "I'll escalate this"
- Never expose platform internals, other clients' data, or system limitations
- For anything uncertain: acknowledge honestly, stay calm, offer what you do know

## Output Format
Return ONLY valid JSON. No markdown fences. Exactly two fields:
{"reply": "your response", "needs_handoff": false}`;

Deno.serve(createHandler(async ({ base44, user, body }) => {
  const { messages, trip_phase, case_id } = await body<{
    messages: { role: string; content: string }[];
    trip_phase?: string;
    case_id?: string;
  }>();

  if (!Array.isArray(messages) || messages.length === 0) {
    return err('messages array is required');
  }

  // PHI minimization: the LLM subprocessor has no BAA, so only first name +
  // non-identifying context reach it — never the patient's email.
  const firstName = user?.full_name?.split(' ')[0] || '';
  const userCtx   = [
    firstName     && `Client name: ${firstName}`,
    trip_phase    && `Journey phase: ${trip_phase}`,
    case_id       && `Case reference: ${case_id}`,
  ].filter(Boolean).join(' | ');

  // Trim, sanitize, and enforce role alternation (LLM requirement)
  // Sanitize ALL message content (a client could mislabel injected text as
  // 'assistant') before any of it reaches the prompt.
  const raw = messages
    .slice(-16)
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: scrubPHI(sanitizePromptInput(m.content, 1200).text) }));

  const firstUser = raw.findIndex(m => m.role === 'user');
  if (firstUser === -1) return ok({ reply: "I'm here whenever you're ready.", needs_handoff: false });
  const conv = raw.slice(firstUser);

  const historyLines = conv.slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Client' : 'Morales'}: ${m.content}`)
    .join('\n');

  const lastMsg = conv[conv.length - 1]?.content ?? '';

  const prompt = [
    SYSTEM_PROMPT,
    userCtx ? `\n\nClient context: ${userCtx}` : '',
    historyLines ? `\n\nConversation so far:\n${historyLines}` : '',
    `\n\nClient: ${lastMsg}`,
    '\n\nMorales Concierge (JSON only, no prose outside the JSON):',
  ].join('');

  const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model:  'gpt_5_mini',
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        reply:         { type: 'string' },
        needs_handoff: { type: 'boolean' },
      },
      required: ['reply', 'needs_handoff'],
    },
  });

  // InvokeLLM with response_json_schema returns a parsed object directly.
  // Guard against string fallback in case the platform returns raw text.
  let reply        = '';
  let needsHandoff = false;

  try {
    if (llmResult && typeof llmResult === 'object') {
      reply        = String((llmResult as Record<string, unknown>).reply ?? '');
      needsHandoff = !!(llmResult as Record<string, unknown>).needs_handoff;
    } else {
      const raw   = String(llmResult ?? '');
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        reply        = String(parsed.reply ?? '');
        needsHandoff = !!parsed.needs_handoff;
      } else {
        reply = raw.trim();
      }
    }
  } catch {
    reply = '';
  }

  if (!reply) reply = "I'm here whenever you're ready. Please let me know how I can help.";

  // If handoff needed: capture full context and notify the care team
  if (needsHandoff) {
    const summary = conv
      .map(m => `${m.role === 'user' ? 'Client' : 'Morales'}: ${escapeHtml(m.content)}`)
      .join('\n\n');

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to:      'support@moralesdentalandaesthetics.com',
        subject: `Morales Assist — Specialist Needed${firstName ? ` · ${firstName}` : ''}`,
        body: `
<h2 style="color:#D4AF37">Morales Assist — Specialist Follow-up Required</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
  <tr><td style="padding:4px 12px 4px 0;color:#888">Client</td><td><strong>${escapeHtml(user?.full_name || 'N/A')}</strong> (${escapeHtml(user?.email || 'N/A')})</td></tr>
  ${trip_phase ? `<tr><td style="padding:4px 12px 4px 0;color:#888">Journey phase</td><td>${escapeHtml(trip_phase)}</td></tr>` : ''}
  ${case_id    ? `<tr><td style="padding:4px 12px 4px 0;color:#888">Case reference</td><td>${escapeHtml(case_id)}</td></tr>` : ''}
</table>
<hr style="margin:16px 0"/>
<h3 style="margin:0 0 8px">Full Conversation</h3>
<pre style="white-space:pre-wrap;font-family:sans-serif;font-size:13px;line-height:1.6">${summary}</pre>
<hr style="margin:16px 0"/>
<p style="color:#aaa;font-size:11px">Morales Assist · AI Handoff · ${new Date().toISOString()}</p>`,
      });
    } catch (_) {
      // Email failure must not surface to the client
    }
  }

  return ok({ reply, needs_handoff: needsHandoff });
}, { name: 'moralesAssist', requireAuth: true }));
