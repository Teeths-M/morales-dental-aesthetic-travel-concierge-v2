// ── Giotto fallback for AI-assisted doctor-registry verification ─────────────
// Buildathon sponsor resource (Giotto: API access on NVIDIA B300 GPUs). This is
// a SECOND opinion for `runDoctorVerification`'s registry lookup, used only when
// Base44's own InvokeLLM call fails (e.g. integration credits exhausted) — never
// the primary path, and never a substitute for the deterministic RED/SAFE-T
// safety-decision engines (those don't call any LLM at all).
//
// Fail-safe by construction: any missing config, network failure, or malformed
// response returns null, and the caller's existing 'unverifiable' fallback
// applies. This never fabricates a "verified" result.
//
// TODO before this goes live — fill in once Giotto access is issued:
//   1. GIOTTO_API_URL default below (currently a placeholder guess at an
//      OpenAI-chat-completions-compatible path — confirm against real docs).
//   2. Auth header format if it isn't `Authorization: Bearer <key>`.
//   3. The real model identifier to send in the request body.
// Until GIOTTO_API_KEY is set in the Base44 environment, this is a no-op —
// safe to deploy as-is with zero behavior change.

interface GiottoVerifyResult {
  found: boolean;
  name_match: boolean;
  status: string;
  registry_source: string;
  details: string;
}

const DEFAULT_GIOTTO_URL = 'https://api.giotto.ai/v1/chat/completions'; // TODO: confirm real endpoint

export async function callGiottoVerification(prompt: string): Promise<GiottoVerifyResult | null> {
  const apiKey = Deno.env.get('GIOTTO_API_KEY');
  if (!apiKey) return null; // not configured yet — caller falls back to 'unverifiable'

  const apiUrl = Deno.env.get('GIOTTO_API_URL') || DEFAULT_GIOTTO_URL;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // TODO: confirm header format
      },
      body: JSON.stringify({
        model: 'giotto-default', // TODO: real model identifier
        messages: [
          { role: 'system', content: 'You are a medical registry verification assistant. Respond with JSON only.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return null;

    const parsed = JSON.parse(text);
    if (typeof parsed.found !== 'boolean' || typeof parsed.status !== 'string') return null;

    return {
      found: parsed.found,
      name_match: !!parsed.name_match,
      status: parsed.status,
      registry_source: parsed.registry_source || 'Giotto (fallback)',
      details: parsed.details || '',
    };
  } catch (_) {
    return null;
  }
}
