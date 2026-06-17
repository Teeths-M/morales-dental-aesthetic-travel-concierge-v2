import React, { useState, useCallback, useMemo } from 'react';
import { Shield, Clock, FileText, Share2, Trash2, Download, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { decryptFileWithPassword } from '@/lib/vaultEncryption';
import VaultPasswordModal from './VaultPasswordModal';
import ShareLinkModal from './ShareLinkModal';
import VaultUploader from './VaultUploader';
import { ConfirmDialog } from '@/components/ui-system';
import { BRAND } from '@/lib/brandTokens';
import { useVault } from '@/hooks/useVault';
import { vaultService } from '@/lib/services';

const DOC_META = {
  passport:      { emoji: '🛂', label: 'Passport' },
  visa:          { emoji: '🛂', label: 'Visa' },
  national_id:   { emoji: '🆔', label: 'National ID' },
  flight_ticket: { emoji: '✈️', label: 'Flight Ticket' },
  hotel_booking: { emoji: '🏨', label: 'Hotel Booking' },
  medical_record:{ emoji: '🏥', label: 'Medical Record' },
  insurance:     { emoji: '🛡️', label: 'Insurance' },
  other:         { emoji: '📄', label: 'Document' },
};

const TABS = [
  { key: 'documents', icon: FileText, label: 'Documents' },
  { key: 'shares',    icon: Share2,   label: 'Share Links' },
  { key: 'upload',    icon: Plus,     label: 'Add New' },
  { key: 'audit',     icon: Clock,    label: 'Audit Log' },
];

export default function VaultDashboard({ user }) {
  const { vaults, shareLinks, auditLogs, loading, reload } = useVault(user);
  const [activeTab, setActiveTab] = useState('documents');

  // Modal state
  const [pwModal, setPwModal]           = useState({ open: false, vault: null, isLoading: false });
  const [shareModal, setShareModal]     = useState({ open: false, vault: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stable callbacks — useCallback prevents new function refs on every render,
  // which would otherwise cause every vault row button to re-render on modal open/close
  const handleDownload = useCallback((vault) => setPwModal({ open: true, vault, isLoading: false }), []);
  const closePwModal   = useCallback(() => setPwModal({ open: false, vault: null, isLoading: false }), []);
  const closeShareModal= useCallback(() => setShareModal({ open: false, vault: null }), []);
  const closeDelete    = useCallback(() => setDeleteTarget(null), []);

  const handleDecryptAndDownload = useCallback(async (password) => {
    const vault = pwModal.vault;
    setPwModal(p => ({ ...p, isLoading: true }));
    try {
      const res = await vaultService.requestDownload(vault.passport_token);
      // Surface migration error cleanly — user entered the right password, the file just needs re-upload
      if (res.data?.error_code === 'LEGACY_ENCRYPTION_NO_SALT') {
        setPwModal({ open: false, vault: null, isLoading: false });
        alert('This document was uploaded before encryption was upgraded. Please delete it and re-upload to use the latest security format.');
        return;
      }
      const { signed_url, encryption_iv_b64, encryption_salt_b64, file_name, mime_type } = res.data;
      const blob = await fetch(signed_url).then(r => r.blob());
      const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
      const decryptedBlob = await decryptFileWithPassword(encryptedB64, encryption_iv_b64, encryption_salt_b64, password, mime_type);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a'); a.href = url; a.download = file_name; a.click();
      URL.revokeObjectURL(url);
      setPwModal({ open: false, vault: null, isLoading: false });
    } catch (err) {
      setPwModal(p => ({ ...p, isLoading: false }));
      console.error('[VaultDashboard] decrypt error:', err.message);
      alert('Decryption failed. Please check your password and try again.');
    }
  }, [pwModal.vault]);

  const handleDeleteConfirm = useCallback(async () => {
    await vaultService.archiveDocument(deleteTarget.id);
    setDeleteTarget(null);
    await reload();
  }, [deleteTarget?.id, reload]);

  // Pre-format all dates once when vaults/links/logs change — not on every render
  const formattedDates = useMemo(() => {
    const out = {};
    vaults.forEach(v => { if (v.uploaded_at) out[v.id] = format(new Date(v.uploaded_at), 'MMM d, yyyy'); });
    shareLinks.forEach(l => { if (l.expires_at) out[`sl-${l.id}`] = format(new Date(l.expires_at), 'MMM d, yyyy h:mm a'); });
    auditLogs.forEach(l => { if (l.timestamp) out[`al-${l.id}`] = format(new Date(l.timestamp), 'MMM d, yyyy h:mm a'); });
    return out;
  }, [vaults, shareLinks, auditLogs]);

  const docCount = vaults.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} transparent` }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06]">
        <div>
          <p className="text-sm font-semibold text-emerald-300">{docCount} Document{docCount !== 1 ? 's' : ''} Secured</p>
          <p className="text-xs text-emerald-400/60 mt-0.5">PBKDF2 + AES-256-GCM · Emergency PIN · Zero-knowledge</p>
        </div>
        <Shield className="w-7 h-7 text-emerald-400/60" strokeWidth={1.5} />
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-white/[0.07] overflow-hidden">
        {TABS.map(({ key, icon: Icon, label }) => {
          const count = key === 'documents' ? docCount : key === 'shares' ? shareLinks.length : key === 'audit' ? auditLogs.length : null;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${activeTab === key ? 'bg-white/[0.08] text-white' : 'bg-transparent text-white/30 hover:text-white/60 hover:bg-white/[0.03]'}`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
              {count !== null && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white/10 text-white/60' : 'bg-white/[0.05] text-white/25'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {/* ── Documents ── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {vaults.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-2xl">🔒</div>
                <p className="text-sm font-semibold text-white/40">No documents yet</p>
                <p className="text-xs text-white/20 mt-1 max-w-xs">Add your first document using the "Add New" tab above.</p>
              </div>
            ) : (
              vaults.map(vault => {
                const meta = DOC_META[vault.document_type] || DOC_META.other;
                return (
                  <div key={vault.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl flex-shrink-0">
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{vault.file_name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{meta.label} · {(vault.file_size_bytes / 1024).toFixed(1)} KB</p>
                        {formattedDates[vault.id] && (
                          <p className="text-[10px] text-white/20 mt-1">
                            Added {formattedDates[vault.id]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button onClick={() => handleDownload(vault)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white hover:border-white/25 hover:bg-white/[0.05] text-xs font-semibold transition-all">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button onClick={() => setShareModal({ open: true, vault })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white hover:border-white/25 hover:bg-white/[0.05] text-xs font-semibold transition-all">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      <button onClick={() => setDeleteTarget(vault)}
                        className="p-2.5 rounded-xl border border-white/[0.08] text-white/20 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/[0.05] transition-all"
                        aria-label="Delete document">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Share Links ── */}
        {activeTab === 'shares' && (
          <div className="space-y-3">
            {shareLinks.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4"><Share2 className="w-6 h-6 text-white/15" /></div>
                <p className="text-sm font-semibold text-white/40">No active share links</p>
                <p className="text-xs text-white/20 mt-1">Create a share link from any document to securely share with embassies, airlines, or hotels.</p>
              </div>
            ) : shareLinks.map(link => (
              <div key={link.id} className="p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{link.purpose?.replace(/_/g, ' ')} Share Link</p>
                    <p className="text-xs text-white/30 mt-1">
                      {link.access_count}/{link.max_access_count} downloads used ·{' '}
                      Expires {formattedDates[`sl-${link.id}`] || '—'}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full ring-1 ${link.is_active ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-red-500/10 text-red-400 ring-red-500/20'}`}>
                    {link.is_active ? 'Active' : 'Expired'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Add New ── */}
        {activeTab === 'upload' && (
          <VaultUploader onTokenIssued={() => { reload(); setActiveTab('documents'); }} />
        )}

        {/* ── Audit Log ── */}
        {activeTab === 'audit' && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4"><Clock className="w-6 h-6 text-white/15" /></div>
                <p className="text-sm font-semibold text-white/40">No activity yet</p>
              </div>
            ) : auditLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                <div>
                  <p className="text-xs font-medium text-white/70 capitalize">{log.event_type?.replace(/_/g, ' ')}</p>
                  {formattedDates[`al-${log.id}`] && <p className="text-[10px] text-white/25 mt-0.5">{formattedDates[`al-${log.id}`]}</p>}
                </div>
                {log.sensitive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20 flex-shrink-0">Sensitive</span>
                )}
              </div>
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