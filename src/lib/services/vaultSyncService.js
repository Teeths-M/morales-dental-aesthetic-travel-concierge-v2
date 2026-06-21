/**
 * Vault Background Sync Service
 * Queues offline actions and automatically syncs when connection is restored.
 */

const SYNC_QUEUE_KEY = 'morales_vault_sync_queue';
const SYNC_STATUS_KEY = 'morales_vault_sync_status';

// Action types
export const SYNC_ACTIONS = {
  UPLOAD: 'vault_upload',
  DELETE: 'vault_delete',
  SHARE: 'vault_share',
};

/**
 * Add an action to the sync queue
 * @param {string} actionType - One of SYNC_ACTIONS
 * @param {object} payload - Action data
 * @param {string} userEmail - User's email for queue isolation
 */
export function queueSyncAction(actionType, payload, userEmail) {
  const queue = getQueue(userEmail);
  const newAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: actionType,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  
  queue.push(newAction);
  localStorage.setItem(`${SYNC_QUEUE_KEY}_${userEmail.toLowerCase()}`, JSON.stringify(queue));
  console.log('[VaultSync] Queued action:', actionType, newAction.id);
  
  // Trigger sync attempt if online
  if (navigator.onLine) {
    processQueue(userEmail);
  }
  
  return newAction.id;
}

/**
 * Get the current sync queue for a user
 */
function getQueue(userEmail) {
  try {
    const raw = localStorage.getItem(`${SYNC_QUEUE_KEY}_${userEmail.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save the updated queue
 */
function saveQueue(userEmail, queue) {
  localStorage.setItem(`${SYNC_QUEUE_KEY}_${userEmail.toLowerCase()}`, JSON.stringify(queue));
}

/**
 * Update sync status
 */
function updateStatus(userEmail, status) {
  localStorage.setItem(`${SYNC_STATUS_KEY}_${userEmail.toLowerCase()}`, JSON.stringify({
    ...status,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Process the sync queue - called automatically on online event
 */
export async function processQueue(userEmail) {
  if (!navigator.onLine) {
    console.log('[VaultSync] Skipping - offline');
    return { synced: 0, reason: 'offline' };
  }

  const queue = getQueue(userEmail);
  if (queue.length === 0) {
    return { synced: 0, reason: 'empty' };
  }

  updateStatus(userEmail, { syncing: true, total: queue.length });

  const failed = [];
  let synced = 0;

  for (const action of queue) {
    if (action.attempts >= 3) {
      console.warn('[VaultSync] Max attempts reached, skipping:', action.id);
      failed.push(action);
      continue;
    }

    try {
      await executeAction(action);
      synced++;
      console.log('[VaultSync] Synced action:', action.id);
    } catch (err) {
      console.error('[VaultSync] Action failed:', action.id, err.message);
      failed.push({ ...action, attempts: action.attempts + 1 });
    }
  }

  // Save remaining failed actions back to queue
  saveQueue(userEmail, failed);
  updateStatus(userEmail, { syncing: false, lastSync: new Date().toISOString(), pending: failed.length });

  console.log(`[VaultSync] Sync complete: ${synced}/${queue.length} actions synced, ${failed.length} pending`);
  
  return { synced, pending: failed.length };
}

/**
 * Execute a single sync action
 */
async function executeAction(action) {
  const { base44 } = await import('@/api/base44Client');
  const { vaultService } = await import('@/lib/services');

  switch (action.type) {
    case SYNC_ACTIONS.DELETE: {
      await base44.entities.PassportVault.update(action.payload.vaultId, { 
        status: 'archived' 
      });
      break;
    }
    
    case SYNC_ACTIONS.UPLOAD: {
      // Re-upload the encrypted file
      await vaultService.uploadEncrypted(action.payload);
      break;
    }
    
    case SYNC_ACTIONS.SHARE: {
      await vaultService.createShareLink(action.payload);
      break;
    }
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Initialize background sync listener
 * Call this once when the app starts
 */
export function initBackgroundSync(userEmail) {
  if (!userEmail) return;

  // Listen for online events
  const handleOnline = () => {
    console.log('[VaultSync] Connection restored, processing queue...');
    processQueue(userEmail);
  };

  window.addEventListener('online', handleOnline);
  
  // Check for pending items on init
  const queue = getQueue(userEmail);
  if (queue.length > 0 && navigator.onLine) {
    console.log('[VaultSync] Found pending items on init:', queue.length);
    processQueue(userEmail);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Get current sync status for UI display
 */
export function getSyncStatus(userEmail) {
  try {
    const raw = localStorage.getItem(`${SYNC_STATUS_KEY}_${userEmail.toLowerCase()}`);
    const status = raw ? JSON.parse(raw) : null;
    const queue = getQueue(userEmail);
    return {
      ...status,
      pendingCount: queue.length,
    };
  } catch {
    return { pendingCount: 0 };
  }
}

/**
 * Clear the sync queue (for debugging or logout)
 */
export function clearSyncQueue(userEmail) {
  localStorage.removeItem(`${SYNC_QUEUE_KEY}_${userEmail.toLowerCase()}`);
  localStorage.removeItem(`${SYNC_STATUS_KEY}_${userEmail.toLowerCase()}`);
}