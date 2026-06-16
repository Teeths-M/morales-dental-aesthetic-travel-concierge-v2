import React, { useState } from 'react';
import { Shield, Lock, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { decryptFileWithPassword } from '@/lib/vaultEncryption';

export default function EmergencyVaultViewer({ pinSessionToken }) {
  const [vaults, setVaults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const loadVault = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('emergencyVaultAccess', { pin_session_token: pinSessionToken });
      setVaults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vault');
    }
    setLoading(false);
  };

  const handleDownload = async (vault) => {
    const password = prompt('Enter decryption password:');
    if (!password) return;

    setDownloading(vault.vault_id);
    try {
      // Note: In emergency mode, user needs to know their password
      // This is a limitation - consider alternative emergency access flows
      alert('In emergency mode, you need your encryption password to decrypt documents.');
      // Similar download logic as VaultDashboard
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
    setDownloading(null);
  };

  if (!vaults) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Emergency Vault Access</h3>
        <p className="text-sm text-slate-500 mt-1">
          {vaults?.vaults?.length || 0} documents available
        </p>
        <Button onClick={loadVault} className="mt-4">
          Load Vault Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Emergency Access Active</p>
            <p className="text-xs text-emerald-700">
              Session expires {new Date(vaults.session_expires_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {vaults.vaults.map(vault => (
          <div key={vault.vault_id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl">
                {vault.document_type === 'passport' ? '🛂' : vault.document_type === 'flight_ticket' ? '✈️' : '📄'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{vault.file_name}</p>
                <p className="text-xs text-slate-500">
                  {vault.document_type.replace(/_/g, ' ')} · {(vault.file_size_bytes / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={downloading === vault.vault_id}
              onClick={() => handleDownload(vault)}
            >
              {downloading ? 'Decrypting...' : 'Download'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}