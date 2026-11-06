import { HOLD_STATE, isTerminal } from './bookingState.ts';

/**
 * The trip status a waiver action may set, or null to leave the status alone.
 *
 * handleWaiverRequest used to write status 'Submitted' on every signature and
 * reissue, and 'waiver_refused' on every refusal, whatever the trip's status
 * was. Done in that order, a refusal and then a signature took a trip out of
 * an Admin-Review safety hold, which only an admin's explicit clear may do
 * (see clearHold in bookingState.ts).
 *
 * The rules now:
 *   - A safety hold, or a completed or cancelled trip, never changes because
 *     of a waiver. The waiver itself is still recorded.
 *   - A refusal pauses an active trip ('waiver_refused'), as before.
 *   - A signature, or an admin reissuing the waiver, resumes only a trip that
 *     a refusal paused, back to 'Submitted', as before. A trip further along
 *     keeps its status instead of being sent back to the start.
 */
export const WAIVER_PAUSED_STATUS = 'waiver_refused';
export const WAIVER_RESUME_STATUS = 'Submitted';

export type WaiverAction = 'sign' | 'refuse' | 'reissue';

export function caseStatusAfterWaiver(current: string | null | undefined, action: WaiverAction): string | null {
  if (!current) return null;
  if (current === HOLD_STATE || isTerminal(current)) return null;
  if (action === 'refuse') return current === WAIVER_PAUSED_STATUS ? null : WAIVER_PAUSED_STATUS;
  return current === WAIVER_PAUSED_STATUS ? WAIVER_RESUME_STATUS : null;
}
