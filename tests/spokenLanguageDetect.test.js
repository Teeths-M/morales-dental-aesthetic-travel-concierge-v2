import { describe, it, expect } from 'vitest';
import { detectSpokenLanguage, recognitionLocaleFor } from '@/lib/spokenLanguageDetect';

describe('detectSpokenLanguage', () => {
  it('detects Spanish from common cues', () => {
    expect(detectSpokenLanguage('hola, necesito ayuda con un doctor en cancun')).toBe('es');
  });
  it('detects French', () => {
    expect(detectSpokenLanguage('bonjour, aidez moi, je veux un docteur')).toBe('fr');
  });
  it('detects English', () => {
    expect(detectSpokenLanguage('hello, I need a doctor and I want help')).toBe('en');
  });
  it('returns null when no language clearly wins (single ambiguous word)', () => {
    expect(detectSpokenLanguage('doctor')).toBeNull();
  });
  it('returns null for empty input', () => {
    expect(detectSpokenLanguage('')).toBeNull();
  });
});

describe('recognitionLocaleFor', () => {
  it('maps a 2-letter code to a recognition locale', () => {
    expect(recognitionLocaleFor('es')).toBe('es-ES');
    expect(recognitionLocaleFor('fr')).toBe('fr-FR');
    expect(recognitionLocaleFor('en')).toBe('en-US');
  });
  it('defaults to en-US for unknown/null', () => {
    expect(recognitionLocaleFor(null)).toBe('en-US');
    expect(recognitionLocaleFor('xx')).toBe('en-US');
  });
});