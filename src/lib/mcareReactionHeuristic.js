// pickMessageReaction — a deterministic "human touch" for M-Care's chat UI.
// Picks a tapback-style emoji for a patient's own message, the way Boardy AI
// sometimes reacts to a WhatsApp message. Deliberately NOT AI-decided: same
// input always produces the same output, no network call, no involvement
// from base44/agents/m_care.jsonc's instructions at all.
//
// Fail-closed by design: DENY_PATTERNS is checked first and wins
// unconditionally, even over a message that would otherwise also match a
// positive rule. A message that mentions pain, fear, a complaint, or any
// other distress signal gets no reaction rather than a guess — silence is
// always the safe default when a message might be describing something
// medically or emotionally serious.
const DENY_PATTERNS = [
  /\bpain\b/i,
  /\bbleed(ing)?\b/i,
  /\bemergency\b/i,
  /\ballerg(y|ic|ies)\b/i,
  /can'?t breathe/i,
  /\bchest\b/i,
  /\bscared\b/i,
  /\bworr(y|ied|ies)\b/i,
  /\bhurts?\b/i,
  /\burgent\b/i,
  /help me/i,
  /\bpanic\b/i,
  /\banxious\b/i,
  /\bcrying\b/i,
  /\bsad\b/i,
  /\b(died|death|dying)\b/i,
  /\brefund\b/i,
  /\bcomplain(t|ing)?\b/i,
  /\b(angry|furious)\b/i,
  /\b(lawsuit|sue)\b/i,
  /\bunsafe\b/i,
  /\b(nausea|vomit(ing)?)\b/i,
  /\bfever\b/i,
  /\b(swelling|swollen)\b/i,
  /\binfection\b/i,
];

// Ordered — first match wins. Most messages match nothing, which is
// intentional: reactions should feel occasional, like a human noticing
// something worth reacting to, not a reflex on every single message.
const REACTION_RULES = [
  { test: (t) => /(thank you|thanks|appreciate|grateful)/i.test(t), emoji: '🙏' },
  { test: (t) => /(haha|lol|lmao|😂|🤣)/i.test(t), emoji: '😂' },
  { test: (t) => /(love|amazing|awesome|perfect|excited|can'?t wait|fantastic)/i.test(t) || /!{2,}/.test(t), emoji: '🔥' },
  { test: (t) => /^(yes|yep|yeah|exactly|sounds good|great|nice|deal|let'?s do (it|this))\b/i.test(t), emoji: '👍' },
  { test: (t) => /^(hi|hello|hey)\b/i.test(t), emoji: '👋' },
  { test: (t) => t.endsWith('?'), emoji: '🤔' },
];

export function pickMessageReaction(rawText) {
  const text = (rawText || '').trim();
  if (!text) return null;
  if (DENY_PATTERNS.some((re) => re.test(text))) return null;
  const rule = REACTION_RULES.find((r) => r.test(text));
  return rule ? rule.emoji : null;
}
