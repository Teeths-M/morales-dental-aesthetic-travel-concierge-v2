/**
 * offlineSyncController — Central coordinator for all offline queues.
 *
 * Registers sync functions from each offline queue (vault, upload, handshake,
 * recovery, pause, SOS) and flushes them in sequence when connectivity returns.
 *
 * Each queue already has its own online listener, but this controller provides:
 * 1. A single registration point — new flows register here instead of
 *    each adding their own window 'online' listener (reduces listener sprawl).
 * 2. Ordered flushing with per-queue error isolation — one queue's failure
 *    never blocks the others.
 * 3. A global "pending offline actions" counter for UI badges.
 *
 * Existing queues continue to work independently — this is additive.
 *
 * Usage (in a top-level component like AppLayout):
 *   useEffect(() => {
 *     const unregister = registerSyncQueue('vault', () => processQueue(email));
 *     return unregister;
 *   }, [email]);
 *
 * Or initialize all at once:
 *   initGlobalSync(userEmail);
 */

const registry = new Map(); // queueName → { syncFn, lastFlushAt, lastResult }
const listeners = new Set(); // UI subscribers for pending-count updates

/**
 * Register a queue's sync function.
 * @param {string} queueName - Unique identifier (e.g., 'vault', 'upload', 'sos')
 * @param {function} syncFn - Async function that flushes the queue. Returns { synced, pending }.
 * @returns {function} Unregister function.
 */
export function registerSyncQueue(queueName, syncFn) {
  registry.set(queueName, { syncFn, lastFlushAt: null, lastResult: null });
  return () => {
    registry.delete(queueName);
    notifyListeners();
  };
}

/**
 * Flush all registered queues in sequence.
 * Each queue is flushed independently — one failure never blocks the others.
 * Called automatically on 'online' event, or manually.
 */
export async function flushAllQueues() {
  if (!navigator.onLine) return { totalSynced: 0, totalPending: 0 };

  let totalSynced = 0;
  let totalPending = 0;

  for (const [queueName, entry] of registry) {
    try {
      const result = await entry.syncFn();
      const synced = result?.synced || 0;
      const pending = result?.pending || 0;

      entry.lastFlushAt = new Date().toISOString();
      entry.lastResult = { synced, pending, success: true };

      totalSynced += synced;
      totalPending += pending;
    } catch (err) {
      entry.lastResult = {
        synced: 0,
        pending: 0,
        success: false,
        error: err?.message || 'Unknown error',
      };
      // Continue to next queue — one failure must not block others
    }
  }

  notifyListeners();
  return { totalSynced, totalPending };
}

/**
 * Get a summary of all registered queues for UI display.
 * Returns an array of { name, lastFlushAt, lastResult }.
 */
export function getSyncSummary() {
  const summary = [];
  for (const [name, entry] of registry) {
    summary.push({
      name,
      lastFlushAt: entry.lastFlushAt,
      lastResult: entry.lastResult,
    });
  }
  return summary;
}

/**
 * Subscribe to sync state changes (for UI badges showing pending count).
 * @param {function} callback - Called with getSyncSummary() on changes.
 * @returns {function} Unsubscribe function.
 */
export function subscribeToSyncState(callback) {
  listeners.add(callback);
  callback(getSyncSummary());
  return () => listeners.delete(callback);
}

function notifyListeners() {
  const summary = getSyncSummary();
  listeners.forEach((cb) => {
    try {
      cb(summary);
    } catch {
      // Listener errors must not crash the sync controller
    }
  });
}

let globalListenerInitialized = false;

/**
 * Initialize the global online/offline listener.
 * Call once at app startup (e.g., in AppLayout or main.jsx).
 * Safe to call multiple times — only initializes once.
 */
export function initGlobalSyncListener() {
  if (globalListenerInitialized) return;
  globalListenerInitialized = true;

  const handleOnline = () => {
    // Small delay to let the browser stabilize the connection
    setTimeout(() => {
      flushAllQueues();
    }, 1000);
  };

  window.addEventListener('online', handleOnline);

  // If already online on init, flush any pending items
  if (navigator.onLine) {
    setTimeout(() => {
      flushAllQueues();
    }, 2000);
  }
}