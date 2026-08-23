// safetyGateStatus — shared classification of a computeSafeTScreening /
// safeT4LifeScan tool_call result into a render tier (pending / failed /
// cleared / caution / blockRefusal). Extracted from SafetyGateCard.jsx so
// the message-bubble card and MCareOrb's orb-level "alert" state
// derivation share exactly one implementation of this logic, never two
// independently-drifting copies of the same safety-tier classification.
//
// This module only ever READS a tool_call's own already-computed result —
// it never scores or decides a safety outcome itself. The real decision
// still comes from the deterministic SAFE-T engine server-side; this is
// purely presentation-layer classification of what that engine already
// returned.

const SAFETY_TOOL_NAMES = ['computeSafeTScreening', 'safeT4LifeScan'];

export function isSafetyToolCall(toolCall) {
  return !!toolCall && SAFETY_TOOL_NAMES.includes(toolCall.name);
}

export function parseSafetyResult(toolCall) {
  let r = toolCall.results;
  if (typeof r === 'string') { try { r = JSON.parse(r); } catch { /* keep raw */ } }
  const data = r?.data || r || {};
  const tier = String(data.risk_tier || data.risk_level || data.tier || data.risk || '').toLowerCase();
  const status = String(data.status || '').toLowerCase();
  let flags = data.flags || data.safe_t_flags || data.signals || data.concerns || (Array.isArray(data.factors) ? data.factors : []);
  if (!Array.isArray(flags)) flags = flags ? [flags] : [];
  const reason = data.reason || data.fail_closed_reason || data.message || '';
  return { tier, status, flags, reason };
}

export function classifySafetyToolCall(toolCall) {
  const pending = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const failed = ['failed', 'error'].includes(toolCall.status);
  const { tier, status, flags, reason } = parseSafetyResult(toolCall);

  const blockRefusal = ['critical', 'high', 'extreme', 'unsafe', 'blocked', 'waiver_required', 'review'].includes(tier)
    || ['blocked', 'waiver_required'].includes(status)
    || (tier === '' && status === 'blocked');
  const cleared = ['low', 'minimal', 'passed', 'safe', 'none', 'pass'].includes(tier)
    || status === 'passed';
  const caution = !blockRefusal && !cleared && (['medium', 'review', 'elevated', 'moderate'].includes(tier) || flags.length > 0);

  return { pending, failed, blockRefusal, cleared, caution, tier, status, flags, reason };
}

// Scans a conversation's messages for a real safety tool_call that is
// currently blocking or cautionary — never a pending or failed call
// (nothing to alert on yet), never a cleared one. Used to derive
// MCareOrb's `alert` orb state as a real, tool-grounded reflection of
// what SafetyGateCard is already showing inline in the chat — never a
// second, independently-computed safety decision.
export function hasActiveSafetyAlert(messages) {
  if (!Array.isArray(messages)) return false;
  for (const msg of messages) {
    const calls = msg?.tool_calls;
    if (!Array.isArray(calls)) continue;
    for (const tc of calls) {
      if (!isSafetyToolCall(tc)) continue;
      const { pending, failed, blockRefusal, caution } = classifySafetyToolCall(tc);
      if (!pending && !failed && (blockRefusal || caution)) return true;
    }
  }
  return false;
}
