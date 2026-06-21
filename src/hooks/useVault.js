/**
 * useVault — data-fetching hook for the Passport Vault feature.
 * Separates fetch logic from presentation; VaultDashboard stays pure UI.
 */
import { useState, useEffect, useCallback } from 'react';
import { vaultService } from '@/lib/services';
import { initBackgroundSync, getSyncStatus, processQueue } from '@/lib/services/vaultSyncService';

export function useVault(user) {
  const [vaults, setVaults]         = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0, syncing: false });

  const load = useCallback(async () => {
    if (!user?.email) {
      // No identity available (e.g. first-ever visit happened offline, no cached
      // user to restore). Don't hang on the loading spinner forever — surface
      // an empty/offline state instead.
      setLoading(false);
      setIsOfflineMode(!navigator.onLine);
      return;
    }
    setLoading(true);
    setError(null);
    setIsOfflineMode(false);

    const cacheKey = `morales_vault_meta_${user.email.toLowerCase()}`;

    // Initialize background sync on first load
    const cleanup = initBackgroundSync(user.email);
    
    // Update sync status
    const status = getSyncStatus(user.email);
    setSyncStatus(status);

    // Check if offline first
    if (!navigator.onLine) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setVaults(JSON.parse(cached));
          setIsOfflineMode(true);
        }
      } catch (_) {}
      setLoading(false);
      return cleanup;
    }

    try {
      // Attempt to fetch fresh data from the database
      const [docs, links, logs] = await Promise.all([
        vaultService.getActiveDocuments(user.email),
        vaultService.getActiveShareLinks(user.email),
        vaultService.getAuditLog(user.id),
      ]);
      setVaults(docs   || []);
      setShareLinks(links || []);
      setAuditLogs(logs  || []);
      
      // Cache successful fetch
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
      
      setIsOfflineMode(false);
      
      // Process any pending sync queue after successful load
      const syncResult = await processQueue(user.email);
      if (syncResult.synced > 0) {
        await load(); // Reload to show synced data
      }
    } catch (err) {
      console.error('[useVault] load failed:', err);
      // Network failed — fallback to cache
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setVaults(JSON.parse(cached));
          setIsOfflineMode(true);
        }
      } catch (_) {}
      setError('Offline — viewing cached data');
    } finally {
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