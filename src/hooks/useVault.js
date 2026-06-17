/**
 * useVault — data-fetching hook for the Passport Vault feature.
 * Separates fetch logic from presentation; VaultDashboard stays pure UI.
 */
import { useState, useEffect, useCallback } from 'react';
import { vaultService } from '@/lib/services';

export function useVault(user) {
  const [vaults, setVaults]         = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [auditLogs, setAuditLogs]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const [docs, links, logs] = await Promise.all([
        vaultService.getActiveDocuments(user.email),
        vaultService.getActiveShareLinks(user.email),
        vaultService.getAuditLog(user.id),
      ]);
      setVaults(docs   || []);
      setShareLinks(links || []);
      setAuditLogs(logs  || []);
    } catch (err) {
      console.error('[useVault] load failed:', err);
      setError('Failed to load vault data.');
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => { load(); }, [load]);

  return { vaults, shareLinks, auditLogs, loading, error, reload: load };
}