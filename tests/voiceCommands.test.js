import { describe, it, expect } from 'vitest';
import { parseMcareCommand } from '@/lib/voiceCommands';

describe('parseMcareCommand', () => {
  describe('wake-word stripping', () => {
    it('strips "M," prefix and trailing punctuation', () => {
      expect(parseMcareCommand('M, switch to private')).toEqual(
        expect.objectContaining({ type: 'private_mode', value: 'on' })
      );
    });
    it('strips "hey M" prefix', () => {
      expect(parseMcareCommand('hey M talk to me')).toEqual(
        expect.objectContaining({ type: 'talk_mode', value: 'on' })
      );
    });
    it('works without a wake word', () => {
      expect(parseMcareCommand('switch to private')).toEqual(
        expect.objectContaining({ type: 'private_mode', value: 'on' })
      );
    });
  });

  describe('talk mode', () => {
    it('detects "talk to me" as on', () => {
      expect(parseMcareCommand('talk to me')).toEqual(
        expect.objectContaining({ type: 'talk_mode', value: 'on' })
      );
    });
    it('detects "M, stop talking" as off', () => {
      expect(parseMcareCommand('M, stop talking')).toEqual(
        expect.objectContaining({ type: 'talk_mode', value: 'off' })
      );
    });
  });

  describe('private mode', () => {
    it('"M, switch to private" → on', () => {
      const c = parseMcareCommand('M, switch to private');
      expect(c).toEqual(expect.objectContaining({ type: 'private_mode', value: 'on' }));
      expect(c.confirmText).toMatch(/Private mode activated/i);
    });
    it('"M, resume monitoring" → off', () => {
      expect(parseMcareCommand('M, resume monitoring')).toEqual(
        expect.objectContaining({ type: 'private_mode', value: 'off' })
      );
    });
  });

  describe('modality', () => {
    it('"voice message only" → voice', () => {
      expect(parseMcareCommand('M, voice message only')).toEqual(
        expect.objectContaining({ type: 'modality', value: 'voice' })
      );
    });
    it('"text only" → text', () => {
      expect(parseMcareCommand('M, text only')).toEqual(
        expect.objectContaining({ type: 'modality', value: 'text' })
      );
    });
  });

  describe('always-listen', () => {
    it('"M, always listen" → on', () => {
      expect(parseMcareCommand('M, always listen')).toEqual(
        expect.objectContaining({ type: 'always_listen', value: 'on' })
      );
    });
    it('"M, stop listening" → off', () => {
      expect(parseMcareCommand('M, stop listening')).toEqual(
        expect.objectContaining({ type: 'always_listen', value: 'off' })
      );
    });
  });

  describe('surrounding awareness', () => {
    it('"M, watch my surroundings" → on', () => {
      const c = parseMcareCommand('M, watch my surroundings');
      expect(c).toEqual(expect.objectContaining({ type: 'surrounding_awareness', value: 'on' }));
      expect(c.confirmText).toMatch(/checking/i);
    });
    it('"M, stop watching my surroundings" → off', () => {
      const c = parseMcareCommand('M, stop watching my surroundings');
      expect(c).toEqual(expect.objectContaining({ type: 'surrounding_awareness', value: 'off' }));
      expect(c.confirmText).toMatch(/off/i);
    });
    it('"turn off surrounding awareness" → off, without a wake word', () => {
      expect(parseMcareCommand('turn off surrounding awareness')).toEqual(
        expect.objectContaining({ type: 'surrounding_awareness', value: 'off' })
      );
    });
    it('a passive mention is not a command — the agent handles it conversationally, not this parser', () => {
      expect(parseMcareCommand("I'm walking around an unfamiliar city")).toBeNull();
    });
  });

  describe('language', () => {
    it('"M, respond in Spanish" → es', () => {
      const c = parseMcareCommand('M, respond in Spanish');
      expect(c).toEqual(expect.objectContaining({ type: 'language', value: 'es' }));
      expect(c.confirmText).toMatch(/Spanish/i);
    });
    it('"M, speak in French" → fr', () => {
      expect(parseMcareCommand('M, speak in French')).toEqual(
        expect.objectContaining({ type: 'language', value: 'fr' })
      );
    });
    it('unrecognized language returns null value, not silent no-op', () => {
      const c = parseMcareCommand('M, respond in klingon');
      expect(c).toEqual(expect.objectContaining({ type: 'language', value: null }));
    });
  });

  describe('non-commands', () => {
    it('a real question is never a command', () => {
      expect(parseMcareCommand('I want a dental implant in Mexico')).toBeNull();
    });
    it('a sentence containing "help" mid-thought is not a private/listen command', () => {
      expect(parseMcareCommand('Can you help me find a doctor?')).toBeNull();
    });
    it('empty input is null', () => {
      expect(parseMcareCommand('')).toBeNull();
      expect(parseMcareCommand('   ')).toBeNull();
    });
  });
});