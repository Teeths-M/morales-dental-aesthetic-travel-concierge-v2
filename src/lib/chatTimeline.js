/**
 * One chat timeline from several lists, in the order things happened.
 *
 * M-Care's panel shows three kinds of message: the conversation with the agent, the scan-an-ad sign-up exchange, and
 * M-Care's journey updates. They live in separate lists (each for its own reason; see MCareOrb.jsx) and used to be
 * drawn one list after another, so after scanning a QR code every new reply landed above the scan greeting, which sat
 * pinned at the bottom: the chat read upside down.
 *
 * mergeTimeline interleaves the lists by time without ever reordering a list internally (the server's own order of
 * the conversation is kept as is). Times are read with serverTimeMs, because the backend's times carry no timezone
 * while the sign-up messages' times are made in the browser. Something with no time (a message shown the instant it
 * was sent, before the server echoes it back with one) counts as newest, so it stays at the bottom. On a tie, the
 * earlier list goes first.
 */
import { serverTimeMs } from './serverTime.js';

const UNDATED = Number.MAX_SAFE_INTEGER;

const timeOf = (value) => {
  const t = serverTimeMs(value);
  return Number.isFinite(t) ? t : UNDATED;
};

/**
 * @param {Array<Array<any>>} lists  each list already in its own order
 * @param {(item: any) => any} getDate  the item's time, if it has one
 * @returns {Array<any>} every item, once, interleaved by time
 */
export function mergeTimeline(lists, getDate) {
  const queues = lists.map((list) => (list || []).slice());
  const out = [];
  for (;;) {
    let best = -1;
    let bestTime = 0;
    for (let q = 0; q < queues.length; q += 1) {
      if (!queues[q].length) continue;
      const t = timeOf(getDate(queues[q][0]));
      if (best === -1 || t < bestTime) {
        best = q;
        bestTime = t;
      }
    }
    if (best === -1) break;
    out.push(queues[best].shift());
  }
  return out;
}
