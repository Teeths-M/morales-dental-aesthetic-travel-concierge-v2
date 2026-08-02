/**
 * friendlyError — turn any thrown thing into a sentence a patient can act on.
 *
 * Raw `error.message` on a patient-facing screen is a product bug, not a
 * shortcut. It arrives at the worst possible moment (a payment failing, a
 * document not opening, a check-in not confirming) and it is:
 *
 *   - frightening   — "Request failed with status code 500" reads as "your
 *                     money/medical record is gone"
 *   - unactionable  — it never says what the patient should do next
 *   - a leak        — SDK and Deno messages carry entity names, field names and
 *                     stack fragments straight into a screenshot
 *
 * So: the raw error goes to the console (where we can debug it), and the
 * patient gets a mapped sentence that always answers two questions — what
 * happened, and what is true about their data now.
 *
 * ADMIN AND OPERATOR SCREENS ARE DELIBERATELY EXCLUDED. An operator triaging a
 * failed partner import or a stuck escalation genuinely needs the raw message,
 * and there is no patient present to frighten. Do not "finish the job" by
 * applying this to /admin.
 */

/** Network failures look different across fetch, axios and the Base44 SDK. */
function isOffline(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(err?.message || '');
  return (
    err?.name === 'TypeError' ||          // fetch's "Failed to fetch"
    err?.code === 'ERR_NETWORK' ||
    /network|fetch|timeout|ECONNREFUSED/i.test(msg)
  );
}

/** HTTP status, wherever this particular client decided to put it. */
function statusOf(err) {
  return err?.status ?? err?.response?.status ?? err?.data?.status ?? null;
}

const BY_STATUS = {
  401: 'Your session has expired. Please sign in again — nothing you entered has been lost.',
  403: "You don't have access to this. If that seems wrong, contact your care team.",
  404: "We couldn't find that. It may have been moved or removed.",
  409: 'Someone else changed this while you were working. Refresh to see the latest version.',
  413: 'That file is too large. Try one under 10 MB.',
  429: 'Too many attempts in a row. Wait a minute and try again.',
};

/**
 * @param {unknown} err       the caught error — logged, never shown
 * @param {string}  fallback  what to say when we can't classify it. Write this
 *                            for the specific action that failed, and say what
 *                            is true about the patient's data.
 * @param {string}  [context] a tag for the console line, e.g. 'PaymentCheckout'
 * @returns {string} safe to render
 */
export function friendlyError(/** @type {any} */ err, fallback, context) {
  if (context) console.error(`[${context}]`, err);
  else console.error('[friendlyError]', err);

  // An error WE authored and explicitly marked safe is shown as written. Our
  // edge functions return deliberate business messages via err() ("This clinic
  // is not accepting bookings"), and flattening those into a generic sentence
  // would be a downgrade, not a fix. Only `safeError()` sets this flag — an
  // arbitrary SDK or runtime error can never wear it.
  if (err?.isSafeMessage && typeof err.message === 'string') return err.message;

  if (isOffline(err)) {
    return "You appear to be offline. Nothing was lost — reconnect and try again.";
  }

  const status = statusOf(err);
  if (status && BY_STATUS[status]) return BY_STATUS[status];

  // 402 is the Base44 integration-credit gate. It fires at the platform layer
  // before our function body runs, so it is our billing problem, never the
  // patient's — say so without exposing what it actually is.
  if (status === 402) {
    return 'This feature is briefly unavailable. Our team has been notified — please try again shortly.';
  }

  if (status >= 500) {
    return 'Something went wrong on our side. Nothing you entered has been lost — please try again in a moment.';
  }

  return fallback;
}

/**
 * Throw a message that is safe to show as written.
 *
 * Use ONLY for text you authored or that came back from one of our own edge
 * functions via err() — never for a message from the SDK, the browser, or a
 * third-party API.
 *
 *   if (!res.data?.success) throw safeError(res.data?.error || 'Could not save.');
 */
export function safeError(message) {
  const e = /** @type {any} */ (new Error(message));
  e.isSafeMessage = true;
  return e;
}

export default friendlyError;
