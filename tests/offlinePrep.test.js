import { describe, it, expect } from 'vitest';
import { findLastMapOrQrToken } from '../src/lib/offlinePrep.js';

describe('offlinePrep.findLastMapOrQrToken', () => {
  it('returns null for empty, missing, or non-array input', () => {
    expect(findLastMapOrQrToken([])).toBeNull();
    expect(findLastMapOrQrToken(null)).toBeNull();
    expect(findLastMapOrQrToken(undefined)).toBeNull();
    expect(findLastMapOrQrToken('not an array')).toBeNull();
  });

  it('finds a qr token', () => {
    const messages = [
      { role: 'user', content: 'take me to the airport' },
      { role: 'assistant', content: 'Here you go.\n{{qr:St. Augustine Private Hospital|Eastern Main Road, St. Augustine}}' },
    ];
    expect(findLastMapOrQrToken(messages)).toEqual({
      label: 'St. Augustine Private Hospital',
      dest: 'Eastern Main Road, St. Augustine',
      tokenType: 'qr',
    });
  });

  it('finds a maps token when no qr token exists', () => {
    const messages = [
      { role: 'assistant', content: 'Want directions?\n{{maps:Piarco Airport|10.5954,-61.3372}}' },
    ];
    expect(findLastMapOrQrToken(messages)).toEqual({
      label: 'Piarco Airport',
      dest: '10.5954,-61.3372',
      tokenType: 'maps',
    });
  });

  it('scans backward and returns the MOST RECENT token, not the first', () => {
    const messages = [
      { role: 'assistant', content: '{{maps:Old Place|1,1}}' },
      { role: 'user', content: 'thanks, what about the hotel' },
      { role: 'assistant', content: '{{qr:Hotel Sands|123 Beach Rd}}' },
    ];
    expect(findLastMapOrQrToken(messages)).toEqual({
      label: 'Hotel Sands',
      dest: '123 Beach Rd',
      tokenType: 'qr',
    });
  });

  it('returns null when no token was ever generated', () => {
    const messages = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Hi! How can I help?' },
    ];
    expect(findLastMapOrQrToken(messages)).toBeNull();
  });

  it('skips messages with no content without throwing', () => {
    const messages = [
      { role: 'assistant', content: '{{qr:Clinic|456 Main St}}' },
      { role: 'assistant', tool_calls: [{}] }, // no content, e.g. a pending tool-call placeholder
    ];
    expect(findLastMapOrQrToken(messages)).toEqual({ label: 'Clinic', dest: '456 Main St', tokenType: 'qr' });
  });
});
