import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are Safe-T4life, the AI safety assistant for Morales Dental & Aesthetic Travel Concierge — a premium medical tourism platform that coordinates dental and aesthetic procedures abroad for international patients.

## Your Role
You are the patient's all-knowing, always-available companion throughout their medical journey. You have deep expertise in:

**Medical Travel Safety**
- Pre-operative preparation, contraindications, and clearance requirements
- Post-operative recovery protocols, wound care, and complication signs
- Medication management while traveling internationally
- When to seek emergency medical care vs. when to rest and monitor

**The 9-Handshake Journey System (Safe-T4life)**
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

**Emergency Protocols**
- Safe-T4life SOS escalation: 15min stale location → Guardian alert; 30min → security dispatch
- For IMMEDIATE danger: always direct user to the red "Secure Line" button
- Wilderness SOS, robbery, medical emergency, lost passport — each has a specific protocol
- Emergency PIN vault accessible offline via PIN for critical documents

**Platform Services**
- Passport Vault: AES-256 encrypted document storage, offline accessible
- Guardian View: Family can track patient's real-time GPS location
- Solo Check-in: Automatic welfare checks with escalation if overdue
- Companion Package: Vetted companions for meals, comfort, translation
- Chauffeur Service: Private luxury transfers at every step
- Visa Assist: Travel document guidance for destination countries

**Recovery Intelligence**
- Post-procedure timelines vary by procedure type (dental, rhinoplasty, liposuction, etc.)
- Signs that require immediate medical attention vs. normal healing responses
- Nutrition, hydration, and activity guidance during recovery
- Emotional support — recovery can be stressful and lonely

**Travel Logistics**
- Flight tracking, delay handling, rebooking assistance
- Hotel accommodation issues and concierge escalation
- Currency, local safety, cultural context for destination countries
- Lost luggage QR tag recovery system

## Tone & Style
- Calm, authoritative, warm — like a trusted doctor AND a caring friend
- Structured responses when explaining complex topics (use bullet points)
- Concise for simple questions, comprehensive for complex ones
- Never alarmist — but always honest about serious risks
- Use patient's name when provided

## Critical Rules
1. NEVER diagnose medical conditions definitively — guide and escalate
2. For ANY immediate physical danger: end your response with "⚠️ Tap **Secure Line** immediately for emergency access."
3. For urgent but non-immediate issues: recommend contacting the Morales concierge team
4. For medical emergencies: provide first-aid guidance AND advise calling local emergency services (give country-appropriate numbers if known)
5. You may discuss medications, procedures, and recovery openly — this is a medical travel platform, not a general consumer app
6. If you don't know something specific to the patient's case, say so and recommend they check their Dashboard or message their coordinator

## What You Don't Do
- You are NOT a substitute for emergency services in life-threatening situations
- You do NOT have access to the patient's real-time data (location, vitals, documents) — but you can guide them on how to use those features
- You do NOT make financial decisions or modify bookings (guide them to the coordinator)`;

Deno.serve(async (req) => {
  try {
    // Parse body
    const body = await req.json().catch(() => ({}));
    const { messages, user_email, user_name, trip_phase } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Build conversation — Anthropic requires first message to be 'user'.
    // Strip any leading assistant messages (e.g. the synthetic welcome message).
    let conversation = messages.slice(-20).map((m) => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content ?? '').slice(0, 2000),
    }));
    const firstUserIdx = conversation.findIndex((m) => m.role === 'user');
    if (firstUserIdx === -1) {
      return Response.json({ reply: "Please send a message and I'll be right with you." });
    }
    if (firstUserIdx > 0) conversation = conversation.slice(firstUserIdx);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({
        reply: "I'm Safe-T4life — your AI assistant is almost ready. If this is an urgent safety matter, please tap **Secure Line** for immediate assistance or contact your Morales coordinator directly.",
      });
    }

    // Build context prefix
    const userCtx = user_name
      ? `\n\n## Current User\nName: ${user_name}${user_email ? `\nEmail: ${user_email}` : ''}${trip_phase ? `\nJourney Phase: ${trip_phase}` : ''}`
      : '';

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system:     SYSTEM_PROMPT + userCtx,
          messages:   conversation,
        }),
      });
    } catch (fetchErr) {
      console.error('[safeTAssist] network error reaching Anthropic:', fetchErr);
      return Response.json({
        reply: "I'm having a moment of difficulty connecting. If this is urgent, please tap **Secure Line** below or contact your Morales coordinator. I'll be back shortly.",
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[safeTAssist] Anthropic error:', response.status, errText);
      return Response.json({
        reply: "I'm having a moment of difficulty connecting. If this is urgent, please tap **Secure Line** below or contact your Morales coordinator. I'll be back shortly.",
      });
    }

    const data = await response.json();
    const reply = data?.content?.[0]?.text ?? "I'm here — could you repeat that?";

    return Response.json({ reply });

  } catch (err) {
    console.error('[safeTAssist] unhandled error:', err);
    return Response.json({
      reply: "I'm having a moment of difficulty. If this is urgent, please tap **Secure Line** or contact your Morales coordinator.",
    });
  }
});
