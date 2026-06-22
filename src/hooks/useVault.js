/**
 * useVault — OFFLINE-FIRST data-fetching hook for the Passport Vault feature.
 * Uses stale-while-revalidate: shows cached data immediately, updates in background.
 */
import { useState, useEffect, useCallback } from 'react';
import { vaultService } from '@/lib/services';
import { initBackgroundSync, getSyncStatus, processQueue } from '@/lib/services/vaultSyncService';

export function useVault(user) {
  const [vaults, setVaults]         = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);
  const [loading, setLoading]       = useState(false); // Start false - show cache immediately
  const [error, setError]           = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0, syncing: false });

  const load = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      setIsOfflineMode(!navigator.onLine);
      return;
    }

    const cacheKey = `morales_vault_meta_${user.email.toLowerCase()}`;
    const cleanup = initBackgroundSync(user.email);
    const status = getSyncStatus(user.email);
    setSyncStatus(status);

    // OFFLINE-FIRST: Load from cache immediately to avoid spinner
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setVaults(parsed);
        setIsOfflineMode(true);
        setLoading(false); // Show cached data immediately
      }
    } catch (_) {}

    // If online, fetch fresh data in background (stale-while-revalidate)
    if (navigator.onLine) {
      try {
        const [docs, links, logs] = await Promise.all([
          vaultService.getActiveDocuments(user.email, user.id),
          vaultService.getActiveShareLinks(user.email),
          vaultService.getAuditLog(user.id),
        ]);
        
        setVaults(docs || []);
        setShareLinks(links || []);
        setAuditLogs(logs || []);
        setIsOfflineMode(false);
        setError(null);
        
        // Update cache with fresh data
        try {
          const meta = (docs || []).map(v => ({
            id: v.id,
            vault_id: v.id,
            passport_token: v.passport_token,
            document_type: v.document_type,
            file_name: v.file_name,
            file_size_bytes: v.file_size_bytes,
            mime_type: v.mime_type,
            redacted_for_display: v.redacted_for_display,
            uploaded_at: v.uploaded_at,
            expires_at: v.expires_at,
            is_emergency_accessible: v.is_emergency_accessible,
          }));
          localStorage.setItem(cacheKey, JSON.stringify(meta));
        } catch (_) {}
        
        // Process sync queue
        const syncResult = await processQueue(user.email);
        if (syncResult.synced > 0) {
          await load();
        }
      } catch (err) {
        console.error('[useVault] background fetch failed:', err);
        setError('Offline — viewing cached data');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    
    return cleanup;
  }, [user?.email, user?.id]);

  useEffect(() => {
    let cleanupFn = null;
    
    const executeLoad = async () => {
      const result = await load();
      if (typeof result === 'function') {
        cleanupFn = result;
      }
    };
    
    executeLoad();
    
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [load]);

  return { vaults, shareLinks, auditLogs, loading, error, isOfflineMode, syncStatus, reload: load };
}