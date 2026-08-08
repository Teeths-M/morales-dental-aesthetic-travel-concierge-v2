import { describe, it, expect } from 'vitest';
import { pickMessageReaction } from '../src/lib/mcareReactionHeuristic.js';

describe('mcareReactionHeuristic.pickMessageReaction', () => {
  it('returns null for empty or whitespace-only text', () => {
    expect(pickMessageReaction('')).toBeNull();
    expect(pickMessageReaction('   ')).toBeNull();
    expect(pickMessageReaction(undefined)).toBeNull();
    expect(pickMessageReaction(null)).toBeNull();
  });

  it('suppresses any reaction on a distress/deny-list message', () => {
    expect(pickMessageReaction("I'm in a lot of pain today")).toBeNull();
    expect(pickMessageReaction('This is an emergency, please help')).toBeNull();
    expect(pickMessageReaction("I'm really worried about the swelling")).toBeNull();
  });

  it('deny-list wins even when the message would otherwise also match a positive rule', () => {
    // Starts with "thanks" (would match gratitude -> 🙏) but also mentions pain.
    expect(pickMessageReaction('Thanks, but the pain is getting worse')).toBeNull();
  });

  it('reacts to gratitude', () => {
    expect(pickMessageReaction('Thank you so much for the help!')).toBe('🙏');
    expect(pickMessageReaction('I really appreciate it')).toBe('🙏');
  });

  it('reacts to laughing', () => {
    expect(pickMessageReaction('haha that is great')).toBe('😂');
  });

  it('reacts to strong enthusiasm', () => {
    expect(pickMessageReaction('This is amazing, I love it')).toBe('🔥');
    expect(pickMessageReaction("Can't wait for my trip!!")).toBe('🔥');
  });

  it('reacts to agreement at the start of a message', () => {
    expect(pickMessageReaction('Yes, exactly what I wanted')).toBe('👍');
    expect(pickMessageReaction("Let's do this")).toBe('👍');
  });

  it('reacts to a greeting', () => {
    expect(pickMessageReaction('Hi there')).toBe('👋');
  });

  it('reacts to a question', () => {
    expect(pickMessageReaction('What is the recovery time?')).toBe('🤔');
  });

  it('returns null for a plain neutral statement with no signal', () => {
    expect(pickMessageReaction('My flight lands at 6pm on Tuesday')).toBeNull();
  });
});
