import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Clock, CheckCircle2, Eye, Users, FileText, Download, Share2, Trash2, Lock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { decryptFileWithPassword } from '@/lib/vaultEncryption';

export default function VaultDashboard({ user }) {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [shareLinks, setShareLinks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vaultsData, linksData, logsData] = await Promise.all([
        base44.entities.PassportVault.filter({ user_email: user.email, status: 'active' }, '-uploaded_at'),
        base44.entities.SecureShareLink.filter({ owner_email: user.email, is_active: true }, '-created_at'),
        base44.entities.AuditLog.filter(
          { 'data.actor_id': user.id },
          '-timestamp',
          50
        )
      ]);
      setVaults(vaultsData || []);
      setShareLinks(linksData || []);
      setAuditLogs(logsData || []);
    } catch (err) {
      console.error('Failed to load vault data:', err);
    }
    setLoading(false);
  };

  const handleDownload = async (vault) => {
    const password = prompt('Enter your decryption password:');
    if (!password) return;

    try {
      const res = await base44.functions.invoke('downloadFromVault', { vault_token: vault.passport_token });
      const { signed_url, encryption_iv_b64, encryption_salt_b64, file_name, mime_type } = res.data;

      // Fetch encrypted blob
      const blob = await fetch(signed_url).then(r => r.blob());
      
      // Decrypt locally
      const decryptedBlob = await decryptFileWithPassword(
        btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer()))),
        encryption_iv_b64,
        encryption_salt_b64,
        password,
        mime_type
      );

      // Trigger download
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err.message || 'Wrong password or corrupted file'));
    }
  };

  const handleCreateShareLink = async (vault) => {
    const purpose = prompt('Purpose (embassy/airline/hotel/insurance/medical/other):', 'other');
    if (!purpose) return;

    const hours = prompt('Expires in hours (default 24):', '24');
    const maxAccess = prompt('Max downloads (default 1):', '1');

    try {
      const res = await base44.functions.invoke('createSecureShareLink', {
        vault_id: vault.id,
        passport_token: vault.passport_token,
        purpose,
        expires_in_hours: parseInt(hours) || 24,
        max_access_count: parseInt(maxAccess) || 1
      });

      const { share_url } = res.data;
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(share_url);
        alert('Share link copied to clipboard!');
      } else {
        prompt('Copy this link:', share_url);
      }
    } catch (err) {
      alert('Failed to create share link: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (vault) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) return;

    try {
      await base44.entities.PassportVault.update(vault.id, { status: 'archived' });
      await loadData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const getDocIcon = (type) => {
    const icons = {
      passport: '🛂',
      visa: '🛂',
      national_id: '🆔',
      flight_ticket: '✈️',
      hotel_booking: '🏨',
      medical_record: '🏥',
      insurance: '🛡️',
      other: '📄'
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No documents in vault yet. Upload your first document to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-emerald-900 text-sm">Emergency Vault — {vaults.length} Documents</p>
            <p className="text-xs text-emerald-700 mt-1">
              All documents encrypted with PBKDF2 + AES-256-GCM · Emergency PIN accessible
            </p>
          </div>
          <Shield className="w-8 h-8 text-emerald-600" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 ${
              activeTab === 'documents' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Documents ({vaults.length})
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={`flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 ${
              activeTab === 'shares' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Share Links ({shareLinks.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Audit Log ({auditLogs.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {vaults.map(vault => (
                <div key={vault.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl">
                      {getDocIcon(vault.document_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {vault.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {vault.document_type.replace(/_/g, ' ')} · {(vault.file_size_bytes / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-xs text-slate-400">
                        Uploaded {format(new Date(vault.uploaded_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => handleDownload(vault)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => handleCreateShareLink(vault)}
                    >
                      <Share2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(vault)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'shares' && (
            <div className="space-y-3">
              {shareLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active share links</p>
              ) : (
                shareLinks.map(link => (
                  <div key={link.id} className="p-4 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {link.purpose.replace(/_/g, ' ')} Share Link
                        </p>
                        <p className="text-xs text-slate-500">
                          Accesses: {link.access_count}/{link.max_access_count} · 
                          Expires {format(new Date(link.expires_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Badge className={link.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {link.is_active ? 'Active' : 'Expired'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No audit events yet</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {log.event_type?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Badge className="text-xs bg-slate-100 text-slate-600">
                      {log.sensitive ? '🔒 Sensitive' : 'Standard'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}