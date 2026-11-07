/**
 * The traveler's check-in code, on the app's side (the server side is base44/shared/checkInCode.ts).
 *
 * Once a traveler sets a 4-digit code, answering a safety check-in ("I'm safe") needs it, so someone holding their
 * phone can't switch the alarm off. The server answers CODE_REQUIRED or INVALID_CODE; answerCheckIn then asks for
 * the code and tries again. A traveler who never set a code is never asked.
 */

export const CHECKIN_CODE_PATTERN = /^\d{4}$/;

export const isCheckInCode = (value) => typeof value === 'string' && CHECKIN_CODE_PATTERN.test(value);

/** 'CODE_REQUIRED' | 'INVALID_CODE' | null, read from a rejected base44.functions.invoke call. */
export function checkInCodeError(error) {
  const code = error?.response?.data?.code;
  return code === 'CODE_REQUIRED' || code === 'INVALID_CODE' ? code : null;
}

/**
 * Calls a check-in function, asking for the code when the server needs it.
 *   invoke(name, payload) — base44.functions.invoke
 *   askCode(reason)       — resolves to the 4 digits, or null if the traveler cancels
 * Resolves with the function's response. Rejects with the server's error, or with an error whose `cancelled` is true
 * when the traveler closes the code box.
 */
export async function answerCheckIn(invoke, name, payload, askCode, maxTries = 3) {
  let code = null;
  for (let attempt = 0; ; attempt++) {
    try {
      return await invoke(name, code ? { ...payload, code } : payload);
    } catch (error) {
      const reason = checkInCodeError(error);
      if (!reason || attempt >= maxTries) throw error;
      code = await askCode(reason);
      if (!isCheckInCode(code)) throw Object.assign(new Error('cancelled'), { cancelled: true });
    }
  }
}
