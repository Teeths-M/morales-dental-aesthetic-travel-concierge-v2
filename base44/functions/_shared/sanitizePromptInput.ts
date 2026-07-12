// ── Prompt-input sanitizer ────────────────────────────────────────────────────
// Strips instruction-like / injection patterns from user-supplied text BEFORE it
// is placed into any LLM prompt context, so user input cannot be used to steer a
// narration or (worse) attempt to influence a decision. Returns the cleaned text
// AND whether anything was stripped — callers on the safety path treat a positive
// flag as a reason to fail closed (route to human review), never to proceed.

const INJECTION_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context)/gi, label: 'ignore_previous' },
  { re: /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|earlier|system)/gi, label: 'disregard' },
  { re: /forget\s+(?:everything|all|the\s+above|previous)/gi, label: 'forget' },
  { re: /override\s+(?:the\s+)?(?:decision|result|verdict|system|rules?|safety|assessment)/gi, label: 'override' },
  { re: /(?:mark|set|classify|rate|score)\s+(?:this|it|me|the\s+\w+)?\s*(?:as\s+)?(?:low\s*risk|safe|approved|cleared|passed?)/gi, label: 'force_clear' },
  { re: /approve\s+(?:anyway|regardless|it|this|me|despite)/gi, label: 'approve_anyway' },
  { re: /\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as|from\s+now\s+on\s+you)\b/gi, label: 'role_reassign' },
  { re: /\b(?:new|updated|revised)\s+(?:instructions?|rules?|system\s+prompt)\b/gi, label: 'new_instructions' },
  { re: /\b(?:jailbreak|DAN\s+mode|developer\s+mode|sudo\s+mode)\b/gi, label: 'jailbreak' },
  { re: /<\/?\s*(?:system|instructions?|prompt|assistant|user)\s*>/gi, label: 'role_tag' },
  { re: /^\s*(?:system|assistant|developer)\s*:/gim, label: 'role_prefix' },
  { re: /```+\s*(?:system|prompt|instructions?)/gi, label: 'fenced_prompt' },
];

export type SanitizeResult = {
  text: string;
  flagged: boolean;
  hits: string[];
};

/**
 * Cleans one text field. Replaces any injection pattern with a neutral marker so
 * the surrounding wording is preserved for the narrator but the instruction is
 * defused, collapses whitespace, and hard-caps length.
 */
export function sanitizePromptInput(input: unknown, maxLen = 1500): SanitizeResult {
  if (typeof input !== 'string' || !input) return { text: '', flagged: false, hits: [] };
  let text = input;
  const hits: string[] = [];

  for (const { re, label } of INJECTION_PATTERNS) {
    if (re.test(text)) {
      hits.push(label);
      text = text.replace(re, ' [removed] ');
    }
    re.lastIndex = 0;
  }

  // Neutralize any remaining stray angle-bracket role tags and code fences.
  text = text.replace(/[<>]/g, ' ').replace(/`{3,}/g, ' ');
  // Collapse whitespace and cap length.
  text = text.replace(/\s+/g, ' ').trim().slice(0, maxLen);

  return { text, flagged: hits.length > 0, hits: [...new Set(hits)] };
}

/** Sanitizes several fields at once; flagged is true if ANY field tripped a pattern. */
export function sanitizeFields(
  fields: Record<string, unknown>,
  maxLen = 1500,
): { clean: Record<string, string>; flagged: boolean; hits: string[] } {
  const clean: Record<string, string> = {};
  const allHits: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const r = sanitizePromptInput(v, maxLen);
    clean[k] = r.text;
    if (r.flagged) allHits.push(...r.hits.map((h) => `${k}:${h}`));
  }
  return { clean, flagged: allHits.length > 0, hits: allHits };
}
