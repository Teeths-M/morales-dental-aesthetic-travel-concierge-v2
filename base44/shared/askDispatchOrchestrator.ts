// ── askDispatchOrchestrator ───────────────────────────────────────────────────
// Server-side bridge to mcare_orchestrator (a real, separate Base44 Agent —
// see base44/agents/mcare_orchestrator.jsonc). Every existing use of Base44's
// Agent conversation API in this codebase happens client-side, from the
// browser (MCareOrb.jsx). This is the first server-side (asServiceRole) use
// of it — genuinely unverified until a real Publish + live call confirms it
// works the same way from a Deno edge function.
//
// Fully fail-closed by design: any error (including asServiceRole.agents not
// existing at all) is caught and returns null. A caller of this function must
// never have its own real failure-handling flow blocked, delayed past a
// short bound, or broken by this being unavailable.

const AGENT_NAME = 'mcare_orchestrator';
const MAX_POLL_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 1500;

/**
 * Asks mcare_orchestrator a single question and returns its final plain-text
 * reply, or null if it never got one (unavailable, errored, or timed out
 * within the bounded poll window — never waits indefinitely).
 */
export async function askDispatchOrchestrator(base44: any, situation: string): Promise<string | null> {
  try {
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Dispatch failure recon', description: 'Backend-triggered — no human participant in this conversation' },
    });
    if (!conversation?.id) return null;

    await base44.asServiceRole.agents.addMessage(conversation, { role: 'user', content: situation });

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const updated = await base44.asServiceRole.agents.getConversation(conversation.id).catch(() => null);
      const messages = updated?.messages || [];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant' && typeof last.content === 'string' && last.content.trim()) {
        return last.content.trim();
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}
