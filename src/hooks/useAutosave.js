/**
 * useAutosave — Global Draft/Resume pattern for any form or wizard.
 *
 * Protects user input from accidental data loss (app close, tab refresh,
 * connection drop). Writes to localStorage immediately (offline-first),
 * then optionally syncs to a backend entity when online.
 *
 * Usage:
 *   const { draft, isSaving, lastSavedAt, clearDraft } = useAutosave({
 *     key: 'intake_v2_medical_history',
 *     initialData: { allergies: [], conditions: [] },
 *     syncFn: async (data) => base44.entities.ConsultationDraft.update(id, { form_data: data }),
 *     debounceMs: 800,
 *   });
 *
 * - On mount: restores any saved draft from localStorage (resume after crash).
 * - On data change: debounced save to localStorage, then syncFn if online.
 * - On offline: localStorage only; syncFn deferred until reconnection.
 * - Drafts expire after 7 days to prevent stale data.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DRAFT_PREFIX = 'morales_draft_';
const DEFAULT_DEBOUNCE_MS = 800;
const DRAFT_TTL_DAYS = 7;

function storageKey(key) {
  return `${DRAFT_PREFIX}${key}`;
}

function loadDraft(key) {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
    if (ageMs > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraftLocal(key, data) {
  try {
    localStorage.setItem(
      storageKey(key),
      JSON.stringify({ data, savedAt: new Date().toISOString() })
    );
  } catch {
    // Quota exceeded or storage unavailable — fail silently.
    // The data is still in component state; next save attempt may succeed.
  }
}

export function useAutosave({
  key,
  initialData = {},
  syncFn = null,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
  // Restore from localStorage on first render (resume after crash/refresh)
  const [draft, setDraft] = useState(() => {
    const saved = loadDraft(key);
    return saved ? saved.data : initialData;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(() => {
    const saved = loadDraft(key);
    return saved ? saved.savedAt : null;
  });

  const debounceTimer = useRef(null);
  const isOnlineRef = useRef(navigator.onLine);
  const dataRef = useRef(draft);

  // Keep ref in sync so the debounce callback reads latest
  useEffect(() => {
    dataRef.current = draft;
  }, [draft]);

  // Track online/offline status
  useEffect(() => {
    const onOnline = () => {
      isOnlineRef.current = true;
      // If we have a syncFn and pending data, flush it now
      if (syncFn) {
        attemptBackendSync(dataRef.current);
      }
    };
    const onOffline = () => {
      isOnlineRef.current = false;
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const attemptBackendSync = useCallback(
    async (data) => {
      if (!syncFn || !isOnlineRef.current) return;
      setIsSaving(true);
      try {
        await syncFn(data);
        setLastSavedAt(new Date().toISOString());
      } catch {
        // Backend sync failed — localStorage copy is still safe.
        // Will retry on next data change or reconnection.
      } finally {
        setIsSaving(false);
      }
    },
    [syncFn]
  );

  // Debounced autosave on data change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      // 1. Always save to localStorage immediately (offline-first)
      saveDraftLocal(key, dataRef.current);
      setLastSavedAt(new Date().toISOString());

      // 2. If online and a sync function is provided, push to backend
      if (syncFn && isOnlineRef.current) {
        attemptBackendSync(dataRef.current);
      }
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [draft, key, debounceMs, syncFn, attemptBackendSync]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(key));
    } catch {
      // ignore
    }
    setDraft(initialData);
    setLastSavedAt(null);
  }, [key, initialData]);

  return {
    draft,
    setDraft,
    isSaving,
    lastSavedAt,
    clearDraft,
  };
}

/**
 * Static helpers for checking draft existence without mounting the hook
 * (e.g., showing "Resume your application?" banner before navigating).
 */
export function hasDraft(key) {
  return loadDraft(key) !== null;
}

export function getDraftData(key) {
  const saved = loadDraft(key);
  return saved ? saved.data : null;
}

export function getDraftAge(key) {
  const saved = loadDraft(key);
  if (!saved) return null;
  const diffMs = Date.now() - new Date(saved.savedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}