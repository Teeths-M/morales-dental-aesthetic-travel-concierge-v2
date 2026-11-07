import { describe, it, expect, vi } from 'vitest';
import { answerCheckIn, checkInCodeError, isCheckInCode } from '@/lib/checkInCode';
import { codeFromSms, codeLocked, isCheckInCode as serverIsCode } from '../base44/shared/checkInCode.ts';

const serverError = (code) => Object.assign(new Error('401'), { response: { data: { code } } });

describe('isCheckInCode', () => {
  it('takes exactly four digits', () => {
    for (const ok of ['0000', '4821']) { expect(isCheckInCode(ok)).toBe(true); expect(serverIsCode(ok)).toBe(true); }
    for (const bad of ['482', '48211', 'abcd', '48 2', '', null, 4821]) { expect(isCheckInCode(bad)).toBe(false); expect(serverIsCode(bad)).toBe(false); }
  });
});

describe('codeFromSms', () => {
  it('reads the code after SAFE or CHECKIN, however it is spaced or cased', () => {
    expect(codeFromSms('SAFE 4821')).toBe('4821');
    expect(codeFromSms('safe4821')).toBe('4821');
    expect(codeFromSms('  Safe: 4821 ')).toBe('4821');
    expect(codeFromSms('CHECKIN 4821')).toBe('4821');
  });

  it('finds no code in a bare SAFE, a checkpoint word, or a longer number', () => {
    expect(codeFromSms('SAFE')).toBe(null);
    expect(codeFromSms('SAFE HOTEL')).toBe(null);
    expect(codeFromSms('SAFE 48211')).toBe(null);
    expect(codeFromSms('I AM SAFE 4821')).toBe(null);
  });
});

describe('codeLocked', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  it('is locked only while locked_until is in the future', () => {
    expect(codeLocked({ locked_until: '2026-11-06T12:20:00Z' }, now)).toBe(true);
    expect(codeLocked({ locked_until: '2026-11-06T11:59:00Z' }, now)).toBe(false);
    expect(codeLocked({}, now)).toBe(false);
    expect(codeLocked(null, now)).toBe(false);
  });
});

describe('checkInCodeError', () => {
  it('recognises only the two code answers', () => {
    expect(checkInCodeError(serverError('CODE_REQUIRED'))).toBe('CODE_REQUIRED');
    expect(checkInCodeError(serverError('INVALID_CODE'))).toBe('INVALID_CODE');
    expect(checkInCodeError(serverError('EXPIRED'))).toBe(null);
    expect(checkInCodeError(new Error('Network Error'))).toBe(null);
  });
});

describe('answerCheckIn', () => {
  it('never asks a traveler who has no code', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { success: true } });
    const askCode = vi.fn();
    await answerCheckIn(invoke, 'acknowledgeSoloCheckIn', { case_id: 'c1' }, askCode);
    expect(askCode).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith('acknowledgeSoloCheckIn', { case_id: 'c1' });
  });

  it('asks for the code when needed and sends it', async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(serverError('CODE_REQUIRED'))
      .mockResolvedValueOnce({ data: { success: true } });
    const askCode = vi.fn().mockResolvedValue('4821');
    await answerCheckIn(invoke, 'acknowledgeSoloCheckIn', { case_id: 'c1' }, askCode);
    expect(askCode).toHaveBeenCalledWith('CODE_REQUIRED');
    expect(invoke).toHaveBeenLastCalledWith('acknowledgeSoloCheckIn', { case_id: 'c1', code: '4821' });
  });

  it('asks again after a wrong code', async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(serverError('CODE_REQUIRED'))
      .mockRejectedValueOnce(serverError('INVALID_CODE'))
      .mockResolvedValueOnce({ data: { success: true } });
    const askCode = vi.fn().mockResolvedValueOnce('1111').mockResolvedValueOnce('4821');
    await answerCheckIn(invoke, 'acknowledgeSoloCheckIn', {}, askCode);
    expect(askCode).toHaveBeenNthCalledWith(2, 'INVALID_CODE');
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('stops quietly when the traveler cancels', async () => {
    const invoke = vi.fn().mockRejectedValue(serverError('CODE_REQUIRED'));
    const askCode = vi.fn().mockResolvedValue(null);
    await expect(answerCheckIn(invoke, 'acknowledgeSoloCheckIn', {}, askCode)).rejects.toMatchObject({ cancelled: true });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('passes any other error straight through', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('Network Error'));
    const askCode = vi.fn();
    await expect(answerCheckIn(invoke, 'acknowledgeSoloCheckIn', {}, askCode)).rejects.toThrow('Network Error');
    expect(askCode).not.toHaveBeenCalled();
  });

  it('gives up after a few wrong codes instead of looping', async () => {
    const invoke = vi.fn().mockRejectedValue(serverError('INVALID_CODE'));
    const askCode = vi.fn().mockResolvedValue('1111');
    await expect(answerCheckIn(invoke, 'acknowledgeSoloCheckIn', {}, askCode, 3)).rejects.toMatchObject({ response: { data: { code: 'INVALID_CODE' } } });
    expect(invoke).toHaveBeenCalledTimes(4);
  });
});
