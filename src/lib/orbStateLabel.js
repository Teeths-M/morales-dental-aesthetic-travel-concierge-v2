/**
 * orbStateLabel — the short line under M-Safe's name that says what it is
 * doing right now, the way a messaging app shows "typing…" under a contact.
 *
 * It only ever reads M-Safe's real computed state (MCareOrb's orbState) and,
 * while a tool runs, that tool's own real label. It never invents an action.
 * Idle and offline return null so the caller shows the agent's normal name.
 *
 * tone: 'active' (gold) or 'caution' (amber).
 */

function withEllipsis(text) {
  const t = String(text).trim().replace(/(\.\.\.|…)+$/, '').trim();
  return t ? `${t}…` : '';
}

export function orbStateLabel(orbState, toolLabel = null) {
  switch (orbState) {
    case 'listening':
      return { text: 'Listening…', tone: 'active' };
    case 'thinking':
      return { text: 'Thinking…', tone: 'active' };
    case 'tool_executing': {
      const t = toolLabel ? withEllipsis(toolLabel) : '';
      return { text: t || 'Working on it…', tone: 'active' };
    }
    case 'speaking':
      return { text: 'Speaking…', tone: 'active' };
    case 'acting':
      return { text: 'New update for you', tone: 'active' };
    case 'alert':
      return { text: 'Safety note: please read', tone: 'caution' };
    // Offline is already said twice on screen (the OFFLINE pill and the amber
    // warning in the chat), so the name line stays as the name.
    default:
      return null;
  }
}
