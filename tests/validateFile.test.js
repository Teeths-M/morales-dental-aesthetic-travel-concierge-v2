import { describe, it, expect } from 'vitest';
import { validateFile } from '../src/lib/validateFile.js';

// Plain objects matching the { type, size } shape validateFile actually
// reads — avoids depending on the Node version's File/Blob global.
const fakeFile = (type, sizeBytes) => ({ type, size: sizeBytes });

const PRESET = { allowedTypes: ['image/jpeg', 'application/pdf'], maxSizeMB: 10 };

describe('validateFile', () => {
  it('accepts a file within the allowed type and size', () => {
    const result = validateFile(fakeFile('image/jpeg', 1024), PRESET);
    expect(result).toEqual({ valid: true, error: null });
  });

  it('rejects a disallowed MIME type', () => {
    const result = validateFile(fakeFile('application/x-msdownload', 1024), PRESET);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/type/i);
  });

  it('rejects an oversized file', () => {
    const result = validateFile(fakeFile('image/jpeg', 11 * 1024 * 1024), PRESET);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/large/i);
  });

  it('rejects a missing file', () => {
    const result = validateFile(null, PRESET);
    expect(result.valid).toBe(false);
  });

  it('throws if the preset has no allowedTypes — a caller mistake, not a user-input case', () => {
    expect(() => validateFile(fakeFile('image/jpeg', 1024), {})).toThrow();
  });

  it('accepts a file exactly at the size boundary', () => {
    const result = validateFile(fakeFile('application/pdf', 10 * 1024 * 1024), PRESET);
    expect(result.valid).toBe(true);
  });
});
