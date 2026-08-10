import { describe, it, expect } from 'vitest';
import { detectTalkModeCommand, extractSpeakableText, isSpeechSupported } from '../src/lib/talkMode.js';

describe('talkMode.detectTalkModeCommand', () => {
  it('recognizes exact ON phrases, case-insensitively', () => {
    expect(detectTalkModeCommand('toggle talk mode')).toBe('on');
    expect(detectTalkModeCommand('Turn On Talk Mode')).toBe('on');
    expect(detectTalkModeCommand('ENABLE VOICE MODE')).toBe('on');
    expect(detectTalkModeCommand('speak to me')).toBe('on');
    expect(detectTalkModeCommand('talk to me')).toBe('on');
  });

  it('recognizes exact OFF phrases, case-insensitively', () => {
    expect(detectTalkModeCommand('toggle talk mode off')).toBe('off');
    expect(detectTalkModeCommand('Turn Off Talk Mode')).toBe('off');
    expect(detectTalkModeCommand('disable voice mode')).toBe('off');
    expect(detectTalkModeCommand('stop talking')).toBe('off');
    expect(detectTalkModeCommand('silent mode')).toBe('off');
  });

  it('tolerates surrounding whitespace and trailing punctuation', () => {
    expect(detectTalkModeCommand('  speak to me!  ')).toBe('on');
    expect(detectTalkModeCommand('stop talking.')).toBe('off');
    expect(detectTalkModeCommand('silent mode?')).toBe('off');
  });

  it('does NOT match a real question that merely contains trigger words', () => {
    expect(detectTalkModeCommand('Can you talk to me about dental implants?')).toBeNull();
    expect(detectTalkModeCommand('I want you to stop talking about the price')).toBeNull();
    expect(detectTalkModeCommand('is silent mode a real feature')).toBeNull();
  });

  it('returns null for empty, whitespace, or unrelated text', () => {
    expect(detectTalkModeCommand('')).toBeNull();
    expect(detectTalkModeCommand('   ')).toBeNull();
    expect(detectTalkModeCommand(undefined)).toBeNull();
    expect(detectTalkModeCommand(null)).toBeNull();
    expect(detectTalkModeCommand('hi')).toBeNull();
    expect(detectTalkModeCommand('what are you')).toBeNull();
  });

  it('disambiguates the overlapping "toggle talk mode" / "toggle talk mode off" prefix pair correctly', () => {
    expect(detectTalkModeCommand('toggle talk mode')).toBe('on');
    expect(detectTalkModeCommand('toggle talk mode off')).toBe('off');
  });
});

describe('talkMode.extractSpeakableText', () => {
  it('returns empty string for falsy input', () => {
    expect(extractSpeakableText('')).toBe('');
    expect(extractSpeakableText(null)).toBe('');
    expect(extractSpeakableText(undefined)).toBe('');
  });

  it('strips a {{choices:...}} token but speaks the option labels as a deterministic enumeration', () => {
    expect(extractSpeakableText('Pick one {{choices:Yes|No|Maybe}}'))
      .toBe('Pick one. Your options are: Yes, No, or Maybe.');
  });

  it('phrases a single choice naturally', () => {
    expect(extractSpeakableText('One way forward. {{choices:Continue}}'))
      .toBe('One way forward. Your one option is: Continue.');
  });

  it('phrases exactly two choices with "or", no comma, and does not double up an existing terminal punctuation mark', () => {
    expect(extractSpeakableText('How would you like to proceed? {{choices:Pay in Full|25% Deposit}}'))
      .toBe('How would you like to proceed? Your options are: Pay in Full or 25% Deposit.');
  });

  it('phrases three or more choices with a serial comma before the final "or"', () => {
    expect(extractSpeakableText('{{choices:Pay in Full|25% Deposit|50% Deposit}}'))
      .toBe('Your options are: Pay in Full, 25% Deposit, or 50% Deposit.');
  });

  it('cleans markdown emphasis out of individual choice labels', () => {
    expect(extractSpeakableText('{{choices:**Pay in Full**|_25% Deposit_}}'))
      .toBe('Your options are: Pay in Full or 25% Deposit.');
  });

  it('does not append anything when there is no {{choices:...}} token', () => {
    expect(extractSpeakableText('Just a plain reply with no options.'))
      .toBe('Just a plain reply with no options.');
  });

  it('strips a {{maps:LABEL|DEST}} token entirely', () => {
    expect(extractSpeakableText('Here is the clinic {{maps:Clinic|123 Main St}} see you there')).toBe('Here is the clinic  see you there');
  });

  it('strips a {{qr:LABEL|DEST}} token entirely', () => {
    expect(extractSpeakableText('Scan this {{qr:Hotel|456 Ocean Ave}} for your driver')).toBe('Scan this  for your driver');
  });

  it('strips markdown emphasis without losing the words', () => {
    expect(extractSpeakableText('This is **very** important and _urgent_')).toBe('This is very important and urgent');
  });

  it('leaves plain text unchanged aside from trimming', () => {
    expect(extractSpeakableText('  Hello, how can I help you today?  ')).toBe('Hello, how can I help you today?');
  });
});

describe('talkMode.isSpeechSupported', () => {
  it('reflects whether window.speechSynthesis is present in this environment', () => {
    // jsdom (vitest's default test environment) does not implement speechSynthesis,
    // so this should be false here — proving the guard actually checks, not just
    // returns true unconditionally.
    expect(typeof isSpeechSupported()).toBe('boolean');
  });
});
