import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, WifiOff, FileText, Phone, Plane, Hotel, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const DOC_ICONS = {
  passport: '🛂',
  visa: '📋',
  flight_ticket: '✈️',
  hotel_booking: '🏨',
  medical_record: '🏥',
  insurance: '🛡️',
  other: '📄',
};

// Read redacted vault metadata cached in localStorage (saved by VaultDashboard when online)
function getLocalVaultCache(userEmail) {
  try {
    const key = `morales_vault_meta_${userEmail?.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function EmergencyVaultViewer({ pinSessionToken, userEmail }) {
  const [vaults, setVaults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isOffline = !navigator.onLine;
  const isOfflineToken = pinSessionToken === 'offline_local';

  const loadVault = async () => {
    setLoading(true);
    setError(null);

    // Offline: serve from local cache
    if (isOffline || isOfflineToken) {
      const cached = getLocalVaultCache(userEmail);
      if (cached) {
        setVaults({ vaults: cached, offline: true });
      } else {
        setError('No cached documents found. Connect to the internet at least once with the app open to cache your vault.');
      }
      setLoading(false);
      return;
    }

    // Online: fetch from server
    try {
      const res = await base44.functions.invoke('emergencyVaultAccess', { pin_session_token: pinSessionToken });
      setVaults(res.data);
      // Cache the metadata locally for next offline use
      if (res.data?.vaults && userEmail) {
        const key = `morales_vault_meta_${userEmail.toLowerCase()}`;
        localStorage.setItem(key, JSON.stringify(res.data.vaults));
      }
    } catch (err) {
      // Server failed — try local cache as last resort
      const cached = getLocalVaultCache(userEmail);
      if (cached) {
        setVaults({ vaults: cached, offline: true });
      } else {
        setError(err.response?.data?.error || 'Failed to load vault. No local cache available.');
      }
    }
    setLoading(false);
  };

  if (!vaults) {
    return (
      <div className="text-center py-6">
        <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Emergency Vault Access</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {isOffline ? '📵 Offline — loading from device cache' : 'View your cached documents'}
        </p>
        {isOffline && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 mb-4">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            No internet — showing locally cached document info only
          </div>
        )}
        <Button onClick={loadVault} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? 'Loading...' : 'Load My Documents'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vaults.offline ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">Offline — Cached Document List</p>
            <p className="text-[10px] text-amber-700">Encrypted files require connection to download. This is your document index.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Lock className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-bold text-emerald-800">Emergency Access Active</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {vaults.vaults?.length === 0 && (
          <p className="text-center text-xs text-slate-500 py-4">No documents found in your vault.</p>
        )}
        {vaults.vaults?.map((vault, i) => (
          <div key={vault.vault_id || vault.id || i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
            <span className="text-xl">{DOC_ICONS[vault.document_type] || '📄'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{vault.file_name || vault.document_type}</p>
              <p className="text-xs text-slate-500 capitalize">{(vault.document_type || '').replace(/_/g, ' ')}</p>
              {vault.redacted_for_display?.expiry_date && (
                <p className="text-[10px] text-slate-400">Expires: {vault.redacted_for_display.expiry_date}</p>
              )}
            </div>
            {vaults.offline ? (
              <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Cached</span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Online</span>
            )}
          </div>
        ))}
      </div>

      {vaults.offline && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
          <p className="font-bold mb-1">📞 Need to share your document details?</p>
          <p>Give border/medical staff your document reference numbers from the list above. Reconnect to internet to download the full encrypted files.</p>
        </div>
      )}
    </div>
  );
}