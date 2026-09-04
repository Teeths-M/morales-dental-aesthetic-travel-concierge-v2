/**
 * voiceCallAdapter — dormant outbound conversational-voice-AI adapter
 * (Retell AI), same discipline as flightSearchAdapter.ts/currencyConvert.ts:
 * modeled on registryLookup.ts's { supported: boolean } shape, honest
 * "not connected yet" until real env vars exist — never a fabricated call
 * outcome. Vendor chosen 2026 after real pricing research (Retell AI came
 * out cheapest at real production scale and has a built-in warm-transfer-
 * to-human primitive, which matches this app's own "AI narrates, a human
 * decides" discipline for anything beyond a low-risk Tier-1 trusted-contact
 * call — see CLAUDE.md).
 *
 * NOTE: the request/response shape below is written from Retell's public
 * API docs (POST /v2/create-phone-call), not verified against a live call
 * — no key exists yet to test with. Re-confirm against Retell's current
 * docs before this is ever exercised for real.
 *
 * Three env vars, all required to activate:
 *   RETELL_API_KEY     — the account API key (also the webhook-signature secret)
 *   RETELL_AGENT_ID     — a pre-built Retell agent. Its system prompt is
 *                         authored in Retell's own dashboard, NOT by this
 *                         code — a real, disclosed setup step beyond "add a
 *                         key," since an AI agent's persona/disclosure
 *                         script has to be written somewhere, and Retell's
 *                         dashboard is the correct place for it. The prompt
 *                         MUST open with a plain statement that this is an
 *                         AI assistant calling on behalf of the named
 *                         patient (RULE 41 / the spec's own disclosure
 *                         requirement) — that line does not come from this
 *                         code and must be verified in the agent config
 *                         before this ever goes live.
 *   RETELL_FROM_NUMBER  — the Retell-provisioned or imported outbound number.
 */

export type PlaceCallResult =
  | { supported: false; message: string }
  | { supported: true; call_id: string };

export interface PlaceCallOptions {
  toNumber: string; // E.164, e.g. "+18095551234"
  dynamicVariables: Record<string, string>;
  metadata?: Record<string, string>;
}

export async function placeOutboundCall(opts: PlaceCallOptions): Promise<PlaceCallResult> {
  const apiKey = Deno.env.get('RETELL_API_KEY');
  const agentId = Deno.env.get('RETELL_AGENT_ID');
  const fromNumber = Deno.env.get('RETELL_FROM_NUMBER');

  if (!apiKey || !agentId || !fromNumber) {
    return {
      supported: false,
      message: 'Real-time voice calling is not connected yet — needs RETELL_API_KEY, RETELL_AGENT_ID, and RETELL_FROM_NUMBER added as Base44 secrets (plus a Retell agent configured with the disclosure requirement in its prompt). I cannot place or claim a real call.',
    };
  }

  if (!/^\+\d{7,15}$/.test(opts.toNumber)) {
    return { supported: false, message: 'The number on file is not in a callable format.' };
  }

  try {
    const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: opts.toNumber,
        override_agent_id: agentId,
        retell_llm_dynamic_variables: opts.dynamicVariables,
        metadata: opts.metadata || {},
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { supported: false, message: `Voice call request failed (HTTP ${res.status}).` };
    }
    const data = await res.json();
    if (!data?.call_id) {
      return { supported: false, message: 'Voice call request did not return a call id.' };
    }
    return { supported: true, call_id: data.call_id };
  } catch {
    return { supported: false, message: 'Voice call request failed.' };
  }
}
