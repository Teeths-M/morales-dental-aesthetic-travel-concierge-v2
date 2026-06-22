/**
 * useVault — React Query hooks for PassportVault
 * Uses vaultService for all entity access.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaultService } from '@/lib/services/vaultService';
import { CACHE } from '@/lib/constants';

// ── Query key factory ─────────────────────────────────────────────────────────
export const vaultKeys = {
  all:        ()      => ['vault'],
  documents:  (email) => ['vault', 'docs', email],
  shareLinks: (email) => ['vault', 'shares', email],
  auditLog:   (uid)   => ['vault', 'audit', uid],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch active vault documents for a user */
export function useVaultDocuments(userEmail, options = {}) {
  return useQuery({
    queryKey: vaultKeys.documents(userEmail),
    queryFn: () => vaultService.getActiveDocuments(userEmail),
    enabled: !!userEmail,
    staleTime: CACHE.MEDIUM,
    ...options,
  });
}

/** Fetch active share links for a user */
export function useShareLinks(ownerEmail, options = {}) {
  return useQuery({
    queryKey: vaultKeys.shareLinks(ownerEmail),
    queryFn: () => vaultService.getActiveShareLinks(ownerEmail),
    enabled: !!ownerEmail,
    staleTime: CACHE.MEDIUM,
    ...options,
  });
}

/** Fetch vault audit log for a user */
export function useVaultAuditLog(userId, options = {}) {
  return useQuery({
    queryKey: vaultKeys.auditLog(userId),
    queryFn: () => vaultService.getAuditLog(userId),
    enabled: !!userId,
    staleTime: CACHE.MEDIUM,
    ...options,
  });
}

/** Mutation: archive (soft-delete) a document */
export function useArchiveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vaultId) => vaultService.archiveDocument(vaultId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vaultKeys.all() });
    },
  });
}

/** Mutation: request a signed download URL */
export function useDownloadVaultDocument() {
  return useMutation({
    mutationFn: (vaultToken) => vaultService.requestDownload(vaultToken),
  });
}

/** Mutation: create a share link */
export function useCreateShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params) => vaultService.createShareLink(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vaultKeys.all() });
    },
  });
}