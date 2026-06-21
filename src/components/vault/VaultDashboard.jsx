import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, FileText, Share2, Trash2, Download, Plus, WifiOff, CloudDownload, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { decryptFileWithPassword } from '@/lib/vaultEncryption';
import VaultPasswordModal from './VaultPasswordModal';
import ShareLinkModal from './ShareLinkModal';
import VaultUploader from './VaultUploader';
import OfflineVaultBanner from './OfflineVaultBanner';
import { ConfirmDialog } from '@/components/ui-system';
import { BRAND } from '@/lib/brandTokens';
import { useVault } from '@/hooks/useVault';
import { vaultService } from '@/lib/services';
import { queueSyncAction, SYNC_ACTIONS } from '@/lib/services/vaultSyncService';

// Safe base64 conversion for large files - avoids "Maximum call stack size exceeded"
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
};

const DOC_META = {
  passport:          { emoji: '🛂', label: 'Passport' },
  visa:              { emoji: '🛂', label: 'Visa' },
  national_id:       { emoji: '🆔', label: 'National ID' },
  flight_ticket:     { emoji: '✈️', label: 'Flight Ticket' },
  hotel_booking:     { emoji: '🏨', label: 'Hotel Booking' },
  medical_record:    { emoji: '🏥', label: 'Medical Record' },
  insurance:         { emoji: '🛡️', label: 'Insurance' },
  payment_reference: { emoji: '💳', label: 'Payment Reference' },
  other:             { emoji: '📄', label: 'Document' },
};

const TABS = [
  { key: 'documents', icon: FileText, label: 'Documents' },
  { key: 'shares',    icon: Share2,   label: 'Share Links' },
  { key: 'upload',    icon: Plus,     label: 'Add New' },
  { key: 'audit',     icon: Clock,    label: 'Audit Log' },
];

export default function VaultDashboard({ user }) {
  const { vaults, shareLinks, auditLogs, loading, error, isOfflineMode, syncStatus, reload } = useVault(user);
  const [activeTab, setActiveTab] = useState('documents');
  const [cacheProgress, setCacheProgress] = useState(null); // { current, total, status: 'caching' | 'complete' | 'error' }

  // Cache vault metadata to localStorage whenever it loads or changes — enables offline emergency access
  useEffect(() => {
    if (!loading && vaults.length > 0 && user?.email) {
      const key = `morales_vault_meta_${user.email.toLowerCase()}`;
      const meta = vaults.map(v => ({
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
        // Cache encryption metadata for offline decryption
        encryption_iv_b64: v.encryption_iv_b64,
        encryption_salt_b64: v.encryption_salt_b64,
        encrypted_file_uri: v.encrypted_file_uri,
      }));
      try { 
        localStorage.setItem(key, JSON.stringify(meta));
        console.log('[VaultDashboard] Cached', meta.length, 'documents for offline access');
      } catch (e) {
        console.error('[VaultDashboard] Cache failed:', e);
      }
    }
  }, [vaults, loading, user?.email]);

  // Prepare all documents for offline use
  const prepareAllForOffline = useCallback(async () => {
    if (!navigator.onLine) {
      alert('You need an internet connection to prepare documents for offline use.');
      return;
    }

    setCacheProgress({ current: 0, total: vaults.length, status: 'caching' });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < vaults.length; i++) {
      const vault = vaults[i];
      const cacheKey = `vault_encrypted_${vault.passport_token}`;
      
      // Skip if already cached
      if (localStorage.getItem(cacheKey)) {
        setCacheProgress({ current: i + 1, total: vaults.length, status: 'caching' });
        successCount++;
        continue;
      }

      try {
        // Fetch and cache this document
        const res = await vaultService.requestDownload(vault.passport_token);
        const { signed_url, encryption_iv_b64, encryption_salt_b64, file_name, mime_type } = res.data;
        const blob = await fetch(signed_url).then(r => r.blob());
        const encryptedB64 = arrayBufferToBase64(await blob.arrayBuffer());
        
        const cacheData = {
          encryptedB64,
          encryption_iv_b64,
          encryption_salt_b64,
          file_name,
          mime_type,
          cached_at: new Date().toISOString()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        successCount++;
      } catch (err) {
        console.error('[VaultDashboard] Failed to cache', vault.file_name, err);
        errorCount++;
      }

      setCacheProgress({ current: i + 1, total: vaults.length, status: 'caching' });
    }

    setCacheProgress({ current: vaults.length, total: vaults.length, status: errorCount === 0 ? 'complete' : 'partial' });
    
    setTimeout(() => setCacheProgress(null), 5000);
    
    if (errorCount > 0) {
      alert(`Successfully cached ${successCount} documents. ${errorCount} documents failed to cache (may be too large).`);
    }
  }, [vaults, user?.email]);

  // Modal state
  const [pwModal, setPwModal]           = useState({ open: false, vault: null, isLoading: false });
  const [shareModal, setShareModal]     = useState({ open: false, vault: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stable callbacks — useCallback prevents new function refs on every render
  const handleDownload = useCallback((vault) => {
    const cacheKey = `vault_encrypted_${vault.passport_token}`;
    const isCached = !!localStorage.getItem(cacheKey);
    
    if (navigator.onLine && !isCached) {
      console.log('[VaultDashboard] Will cache document after download:', vault.file_name);
    } else if (!navigator.onLine && isCached) {
      console.log('[VaultDashboard] Using cached document for offline access:', vault.file_name);
    } else if (!navigator.onLine && !isCached) {
      console.warn('[VaultDashboard] Offline but document not cached:', vault.file_name);
    }
    
    setPwModal({ open: true, vault, isLoading: false });
  }, []);
  const closePwModal   = useCallback(() => setPwModal({ open: false, vault: null, isLoading: false }), []);
  const closeShareModal= useCallback(() => setShareModal({ open: false, vault: null }), []);
  const closeDelete    = useCallback(() => setDeleteTarget(null), []);

  const handleDecryptAndDownload = useCallback(async (password) => {
    const vault = pwModal.vault;
    setPwModal(p => ({ ...p, isLoading: true }));
    
    let cachedData = null; // Declare at function scope for error handler access
    
    try {
      // OFFLINE CHECK: Decryption requires fetching the encrypted blob
      if (!navigator.onLine) {
        setPwModal({ open: false, vault: null, isLoading: false });
        
        // Check if document was primed for offline (cached in localStorage)
        const cacheKey = `vault_encrypted_${vault.passport_token}`;
        const cachedEncrypted = localStorage.getItem(cacheKey);
        
        if (!cachedEncrypted) {
          alert('Offline Mode: This document was not cached for offline access. Please reconnect to the internet and use the "Save Offline" option when viewing this document.');
          return;
        }
        
        // Use cached encrypted blob
        try {
          const { encryption_iv_b64, encryption_salt_b64, file_name, mime_type, encryptedB64 } = JSON.parse(cachedEncrypted);
          const decryptedBlob = await decryptFileWithPassword(encryptedB64, encryption_iv_b64, encryption_salt_b64, password, mime_type);
          const url = URL.createObjectURL(decryptedBlob);
          const a = document.createElement('a'); a.href = url; a.download = file_name; a.click();
          URL.revokeObjectURL(url);
          setPwModal({ open: false, vault: null, isLoading: false });
          return;
        } catch (cacheErr) {
          console.error('[VaultDashboard] offline decrypt failed:', cacheErr);
          alert('Offline Mode: Cached document is corrupted or incomplete. Please reconnect to download again.');
          return;
        }
      }
      const cachedMeta = vault.encryption_iv_b64 && vault.encryption_salt_b64 && vault.encrypted_file_uri;
      
      if (!cachedMeta) {
        // Try online fetch
        const res = await vaultService.requestDownload(vault.passport_token);
        if (res.data?.error_code === 'LEGACY_ENCRYPTION_NO_SALT') {
          setPwModal({ open: false, vault: null, isLoading: false });
          alert('This document was uploaded before encryption was upgraded. Please delete it and re-upload to use the latest security format.');
          return;
        }
        const { signed_url, encryption_iv_b64, encryption_salt_b64, file_name, mime_type } = res.data;
        const blob = await fetch(signed_url).then(r => r.blob());
        const encryptedB64 = arrayBufferToBase64(await blob.arrayBuffer());
        const decryptedBlob = await decryptFileWithPassword(encryptedB64, encryption_iv_b64, encryption_salt_b64, password, mime_type);
        const url = URL.createObjectURL(decryptedBlob);
        const a = document.createElement('a'); a.href = url; a.download = file_name; a.click();
        URL.revokeObjectURL(url);

        // Cache encrypted blob for offline use (up to 5MB to fit localStorage limits)
        const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB
        if (vault.file_size_bytes < MAX_CACHE_SIZE) {
          try {
            const cacheKey = `vault_encrypted_${vault.passport_token}`;
            const cacheData = {
              encryptedB64,
              encryption_iv_b64,
              encryption_salt_b64,
              file_name,
              mime_type,
              cached_at: new Date().toISOString()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log('[VaultDashboard] Cached document for offline access:', file_name, '- Size:', vault.file_size_bytes, 'bytes');
            
            // Verify cache was written correctly
            const verifyCache = localStorage.getItem(cacheKey);
            if (verifyCache) {
              console.log('[VaultDashboard] Cache verification successful');
            } else {
              console.warn('[VaultDashboard] Cache verification failed - data not persisted');
            }
          } catch (cacheErr) {
            console.error('[VaultDashboard] Offline cache failed:', cacheErr);
            alert('Document downloaded successfully, but could not be cached for offline use. You can still view it now, but will need internet next time.');
            // Non-fatal - download still succeeded
          }
        } else {
          console.warn('[VaultDashboard] Document too large for offline cache:', vault.file_size_bytes, 'bytes');
          alert('Document downloaded successfully. This file is too large to cache for offline use (>5MB).');
        }

        setPwModal({ open: false, vault: null, isLoading: false });
        return;
      }
      
      // OFFLINE-FIRST: Check local cache before any network request
      const cacheKey = `vault_encrypted_${vault.passport_token}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      let encryptedB64, encryption_iv_b64, encryption_salt_b64, file_name, mime_type;
      
      if (cachedData) {
        // Use cached encrypted blob (works offline)
        console.log('[VaultDashboard] Using cached document:', vault.passport_token);
        const parsed = JSON.parse(cachedData);
        encryptedB64 = parsed.encryptedB64;
        encryption_iv_b64 = parsed.encryption_iv_b64;
        encryption_salt_b64 = parsed.encryption_salt_b64;
        file_name = parsed.file_name;
        mime_type = parsed.mime_type;
        
        console.log('[VaultDashboard] Cache parsed successfully:', { file_name, mime_type, encryptedB64Length: encryptedB64?.length });
        
        if (!encryptedB64 || !encryption_iv_b64 || !encryption_salt_b64) {
          setPwModal({ open: false, vault: null, isLoading: false });
          console.error('[VaultDashboard] Cached data is incomplete:', parsed);
          alert('This document cache is corrupted. Please reconnect to the internet and try again.');
          return;
        }
      } else if (navigator.onLine) {
        // Not cached, but online - fetch from server
        console.log('[VaultDashboard] Fetching from server...');
        const res = await vaultService.requestDownload(vault.passport_token);
        console.log('[VaultDashboard] Server response:', res.data);
        
        if (res.data?.error_code === 'LEGACY_ENCRYPTION_NO_SALT') {
          setPwModal({ open: false, vault: null, isLoading: false });
          alert('This document was uploaded before encryption was upgraded. Please delete it and re-upload to use the latest security format.');
          return;
        }
        const { signed_url, encryption_iv_b64: iv, encryption_salt_b64: salt, file_name: fname, mime_type: mime } = res.data;
        encryption_iv_b64 = iv;
        encryption_salt_b64 = salt;
        file_name = fname;
        mime_type = mime;
        
        console.log('[VaultDashboard] Fetching encrypted blob from:', signed_url);
        const blob = await fetch(signed_url).then(r => {
          console.log('[VaultDashboard] Blob response status:', r.status, 'content-type:', r.headers.get('content-type'));
          return r.blob();
        });
        console.log('[VaultDashboard] Blob size:', blob.size, 'bytes');
        encryptedB64 = arrayBufferToBase64(await blob.arrayBuffer());
        console.log('[VaultDashboard] Encrypted base64 length:', encryptedB64.length);
      } else {
        // Offline and not cached - cannot download
        setPwModal({ open: false, vault: null, isLoading: false });
        alert('Offline Mode: This document was not cached for offline access. Please reconnect to the internet and download it first.');
        return;
      }
      
      console.log('[VaultDashboard] Starting decryption...');
      const decryptedBlob = await decryptFileWithPassword(encryptedB64, encryption_iv_b64, encryption_salt_b64, password, mime_type);
      console.log('[VaultDashboard] Decryption successful! Blob size:', decryptedBlob.size, 'bytes');
      
      const url = URL.createObjectURL(decryptedBlob);
      console.log('[VaultDashboard] Created object URL:', url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[VaultDashboard] Download triggered successfully');
      setPwModal({ open: false, vault: null, isLoading: false });
    } catch (err) {
      setPwModal(p => ({ ...p, isLoading: false }));
      console.error('[VaultDashboard] decrypt error:', err);
      console.error('[VaultDashboard] vault:', vault);
      console.error('[VaultDashboard] cachedData:', cachedData);
      
      // Provide more specific error messages
      if (err.name === 'InvalidAccessError' || err.message.includes('InvalidAccess')) {
        alert('Decryption failed: The password entered does not match the one used to encrypt this document. Please try again.');
      } else if (err.name === 'OperationError' || err.message.includes('OperationError')) {
        alert('Decryption failed: Incorrect password or corrupted data. Please verify your password and try again.');
      } else {
        alert(`Decryption failed: ${err.message || 'Unknown error'}. Please check your password and try again.`);
      }
    }
  }, [pwModal.vault]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteTarget(null);
    
    // If offline, queue the action for later sync
    if (!navigator.onLine) {
      queueSyncAction(SYNC_ACTIONS.DELETE, { vaultId: deleteTarget.id }, user.email);
      await reload();
      return;
    }
    
    // If online, execute immediately
    await vaultService.archiveDocument(deleteTarget.id);
    await reload();
  }, [deleteTarget?.id, reload, user?.email]);

  // Pre-format all dates once when vaults/links/logs change — not on every render
  const formattedDates = useMemo(() => {
    const out = {};
    vaults.forEach(v => { if (v.uploaded_at) out[v.id] = format(new Date(v.uploaded_at), 'MMM d, yyyy'); });
    shareLinks.forEach(l => { if (l.expires_at) out[`sl-${l.id}`] = format(new Date(l.expires_at), 'MMM d, yyyy h:mm a'); });
    auditLogs.forEach(l => { if (l.timestamp) out[`al-${l.id}`] = format(new Date(l.timestamp), 'MMM d, yyyy h:mm a'); });
    return out;
  }, [vaults, shareLinks, auditLogs]);

  const docCount = vaults.length;
  const offlineReadyCount = useMemo(() => {
    return vaults.filter(v => {
      const cacheKey = `vault_encrypted_${v.passport_token}`;
      return !!localStorage.getItem(cacheKey);
    }).length;
  }, [vaults]);

  // Only show loading if truly no data (first load with no cache)
  if (loading && vaults.length === 0 && shareLinks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} transparent` }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Offline Mode Banner */}
      <OfflineVaultBanner
        isOffline={isOfflineMode}
        pendingCount={syncStatus.pendingCount}
        onSync={reload}
      />

      {/* Sync Status Banner */}
      {syncStatus.syncing && (
        <motion.div
          className="flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-[13px] font-bold text-emerald-100">Syncing {syncStatus.pendingCount} action{syncStatus.pendingCount !== 1 ? 's' : ''}...</p>
        </motion.div>
      )}

      {/* Summary strip with offline readiness */}
      <div className="space-y-3">
        <motion.div
          className="flex items-center justify-between px-6 py-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.15]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="text-[15px] font-bold text-emerald-50" style={{ letterSpacing: '-0.01em' }}>{docCount} Document{docCount !== 1 ? 's' : ''} Secured</p>
            <p className="text-[12px] text-emerald-100 mt-1 tracking-[0.15em] uppercase">PBKDF2 + AES-256-GCM · Zero-knowledge</p>
          </div>
          <Shield className="w-8 h-8 text-emerald-100" strokeWidth={1.3} />
        </motion.div>

        {/* Offline Readiness Status */}
        {vaults.length > 0 && (
          <motion.div
            className="flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {offlineReadyCount === vaults.length ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-100 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-100">✓ All Documents Ready for Offline</p>
                  <p className="text-[11px] text-emerald-200">You can access your vault without internet</p>
                </div>
              </>
            ) : (
              <>
                <CloudDownload className="w-5 h-5 text-amber-100 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-amber-100">{offlineReadyCount}/{vaults.length} Documents Cached</p>
                  <p className="text-[11px] text-amber-200">Prepare remaining documents for offline access</p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Prepare for Offline Button */}
        {navigator.onLine && vaults.length > 0 && offlineReadyCount < vaults.length && (
          <motion.button
            onClick={prepareAllForOffline}
            disabled={cacheProgress?.status === 'caching'}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-emerald-400/40 bg-emerald-400/20 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {cacheProgress?.status === 'caching' ? (
              <>
                <div className="w-5 h-5 border-2 border-emerald-100 border-t-transparent rounded-full animate-spin" />
                <span className="text-[14px] font-bold text-emerald-50">
                  Caching documents... {cacheProgress.current}/{cacheProgress.total}
                </span>
              </>
            ) : (
              <>
                <CloudDownload className="w-5 h-5 text-emerald-100" />
                <div className="text-left">
                  <p className="text-[14px] font-bold text-emerald-50">Prepare All Documents for Offline</p>
                  <p className="text-[11px] text-emerald-100">Download encrypted files for airplane mode access</p>
                </div>
              </>
            )}
          </motion.button>
        )}

        {/* Cache Progress/Error Banner */}
        {cacheProgress?.status === 'partial' && (
          <motion.div
            className="flex items-center gap-3 px-5 py-3 rounded-xl border border-amber-400/30 bg-amber-400/10"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 text-amber-100 flex-shrink-0" />
            <p className="text-[13px] font-bold text-amber-100">Some documents were too large to cache. You can still access them online.</p>
          </motion.div>
        )}
      </div>

      {/* Tab bar */}
      <motion.div
        className="flex rounded-xl border border-white/20 overflow-hidden bg-white/10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {TABS.map(({ key, icon: Icon, label }) => {
          const count = key === 'documents' ? docCount : key === 'shares' ? shareLinks.length : key === 'audit' ? auditLogs.length : null;
          return (
            <motion.button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors ${activeTab === key ? 'bg-white/25 text-white' : 'bg-transparent text-white/80 hover:text-white hover:bg-white/15'}`}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
              {count !== null && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? 'bg-white/30 text-white' : 'bg-white/20 text-white/80'}`}>{count}</span>}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Tab content */}
      <div>
        {/* ── Documents ── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {vaults.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5 text-2xl" style={{ boxShadow: '0 0 40px rgba(212,175,55,0.15)' }}>🔒</div>
                <p className="text-[15px] font-bold text-white/80" style={{ letterSpacing: '-0.01em' }}>No documents yet</p>
                <p className="text-[13px] text-white/70 mt-2 max-w-xs leading-relaxed">Add your first document using the "Add New" tab above.</p>
              </div>
            ) : (
              vaults.map((vault, index) => {
              const meta = DOC_META[vault.document_type] || DOC_META.other;
              const cacheKey = `vault_encrypted_${vault.passport_token}`;
              const isAvailableOffline = !!localStorage.getItem(cacheKey);
              const fileSizeMB = (vault.file_size_bytes / (1024 * 1024)).toFixed(2);
              return (
                  <motion.div
                    key={vault.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/15 transition-all"
                    whileHover={{ scale: 1.01, y: -2 }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl flex-shrink-0" style={{ boxShadow: '0 0 30px rgba(212,175,55,0.12)' }}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-bold text-white truncate" style={{ letterSpacing: '-0.01em' }}>{vault.file_name}</p>
                        {isAvailableOffline ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-400/20 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-2.5 h-2.5" /> Ready for Offline
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                            <CloudDownload className="w-2.5 h-2.5" /> Online Only
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-white/80 mt-1">{meta.label} · {fileSizeMB} MB</p>
                        {formattedDates[vault.id] && (
                          <p className="text-[11px] text-white/70 mt-1.5 tracking-[0.15em] uppercase">
                            Added {formattedDates[vault.id]}
                          </p>
                        )}
                        {!isAvailableOffline && vault.file_size_bytes > 5 * 1024 * 1024 && (
                          <p className="text-[10px] text-amber-200/80 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> Large file - use "Prepare for Offline" to cache
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <motion.button
                        onClick={() => handleDownload(vault)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/25 text-white/90 hover:text-white hover:border-white/40 hover:bg-white/15 text-[13px] font-bold transition-all"
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Download className="w-3.5 h-3.5" /> {isAvailableOffline ? 'Open' : 'Download'}
                      </motion.button>
                      <motion.button
                        onClick={() => setShareModal({ open: true, vault })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/25 text-white/90 hover:text-white hover:border-white/40 hover:bg-white/15 text-[13px] font-bold transition-all"
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </motion.button>
                      <motion.button
                        onClick={() => setDeleteTarget(vault)}
                        className="p-2.5 rounded-xl border border-white/20 text-white/70 hover:text-red-200 hover:border-red-400/40 hover:bg-red-500/[0.12] transition-all"
                        aria-label="Delete document"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ── Share Links ── */}
        {activeTab === 'shares' && (
          <div className="space-y-3">
            {shareLinks.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5"><Share2 className="w-7 h-7 text-white/40" /></div>
                <p className="text-[15px] font-bold text-white/80" style={{ letterSpacing: '-0.01em' }}>No active share links</p>
                <p className="text-[13px] text-white/70 mt-2 max-w-xs leading-relaxed">Create a share link from any document to securely share with embassies, airlines, or hotels.</p>
              </div>
            ) : shareLinks.map((link, index) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-5 rounded-2xl border border-white/20 bg-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-bold text-white capitalize" style={{ letterSpacing: '-0.01em' }}>{link.purpose?.replace(/_/g, ' ')} Share Link</p>
                    <p className="text-[12px] text-white/80 mt-1.5">
                      {link.access_count}/{link.max_access_count} downloads ·{' '}
                      Expires {formattedDates[`sl-${link.id}`] || '—'}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-3 py-1 rounded-full ring-1 tracking-[0.15em] uppercase ${link.is_active ? 'bg-emerald-400/30 text-emerald-100 ring-emerald-400/40' : 'bg-red-400/30 text-red-100 ring-red-400/40'}`}>
                    {link.is_active ? 'Active' : 'Expired'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Add New ── */}
        {activeTab === 'upload' && (
          <VaultUploader onTokenIssued={() => { reload(); setActiveTab('documents'); }} />
        )}

        {/* ── Audit Log ── */}
        {activeTab === 'audit' && (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5"><Clock className="w-7 h-7 text-white/40" /></div>
                <p className="text-[15px] font-bold text-white/80" style={{ letterSpacing: '-0.01em' }}>No activity yet</p>
              </div>
            ) : auditLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-white/15 bg-white/10"
              >
                <div>
                  <p className="text-[13px] font-bold text-white capitalize" style={{ letterSpacing: '-0.01em' }}>{log.event_type?.replace(/_/g, ' ')}</p>
                  {formattedDates[`al-${log.id}`] && <p className="text-[11px] text-white/70 mt-1 tracking-[0.15em] uppercase">{formattedDates[`al-${log.id}`]}</p>}
                </div>
                {log.sensitive && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-400/30 text-red-100 ring-1 ring-red-400/40 flex-shrink-0 tracking-[0.15em] uppercase">Sensitive</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <VaultPasswordModal
        isOpen={pwModal.open}
        isLoading={pwModal.isLoading}
        onClose={closePwModal}
        onConfirm={handleDecryptAndDownload}
      />
      <ShareLinkModal
        isOpen={shareModal.open}
        vault={shareModal.vault}
        onClose={closeShareModal}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={closeDelete}
        onConfirm={handleDeleteConfirm}
        title="Archive this document?"
        message={`"${deleteTarget?.file_name}" will be removed from your active vault. This action cannot be undone.`}
        confirmLabel="Yes, archive"
        variant="danger"
      />
    </div>
  );
}