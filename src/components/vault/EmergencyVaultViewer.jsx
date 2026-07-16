import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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

    // OFFLINE-FIRST: Always try local cache first for offline token
    if (isOfflineToken) {
      const cached = getLocalVaultCache(userEmail);
      if (cached) {
        setVaults({ vaults: cached, offline: true });
      } else {
        setError('No cached documents found. Please go online and open "My Vault" at least once to cache your documents.');
      }
      setLoading(false);
      return;
    }

    // Online with PIN session - try server first, fallback to cache
    try {
      const res = await base44.functions.invoke('emergencyVaultAccess', { pin_session_token: pinSessionToken });
      setVaults(res.data);
      // Cache the metadata locally for next offline use
      if (res.data?.vaults && userEmail) {
        const key = `morales_vault_meta_${userEmail.toLowerCase()}`;
        localStorage.setItem(key, JSON.stringify(res.data.vaults));
      }
    } catch (err) {
      // Network failed - use cache as fallback
      console.warn('[EmergencyVaultViewer] Network failed, using cache:', err.message);
      const cached = getLocalVaultCache(userEmail);
      if (cached) {
        setVaults({ vaults: cached, offline: true });
      } else {
        setError('Network error and no local cache available. Please connect to internet.');
      }
    }
    setLoading(false);
  };

  // Auto-load vault when component mounts or when user/email changes — critical for offline access
  useEffect(() => {
    if (pinSessionToken && userEmail && !vaults) {
      loadVault();
    }
  }, [pinSessionToken, userEmail]);

  if (!vaults && loading) {
    return (
      <div className="text-center py-6">
        <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Emergency Vault Access</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {isOffline ? '📵 Offline — loading from device cache' : 'Loading your documents...'}
        </p>
        {isOffline && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 mb-4">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            No internet — loading from local cache
          </div>
        )}
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!vaults && error) {
    return (
      <div className="text-center py-6">
        <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Emergency Vault Access</h3>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-xs text-red-700 font-semibold">{error}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-xs text-blue-800">
          <p className="font-semibold mb-2">📌 How to prepare for offline access:</p>
          <ol className="text-left space-y-1">
            <li>1. Connect to the internet</li>
            <li>2. Open the app and go to "My Vault"</li>
            <li>3. Your vault will automatically cache to your device</li>
            <li>4. Return here — your documents will now work offline</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vaults.offline ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <WifiOff className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-800">✓ Offline Mode - All Documents Ready</p>
            <p className="text-[10px] text-emerald-700">Your cached documents are available below - works without internet</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Lock className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-800">Emergency Access Active</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Emergency Info Cards - Critical data extracted from cached metadata */}
      <div className="space-y-3">
        {vaults.vaults?.length === 0 && (
          <p className="text-center text-xs text-slate-500 py-4">No documents found in your vault.</p>
        )}
        {vaults.vaults?.map((vault, i) => {
          const docType = vault.document_type || 'other';
          const redacted = vault.redacted_for_display || {};
          return (
            <div key={vault.vault_id || vault.id || i} className="p-4 rounded-xl border bg-white shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{DOC_ICONS[docType] || '📄'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{redacted.full_name_redacted || vault.file_name || docType}</p>
                  <p className="text-xs text-slate-500 capitalize">{docType.replace(/_/g, ' ')}</p>
                </div>
              </div>
              
              {/* Critical Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {redacted.last_4_digits && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Document # (last 4)</p>
                    <p className="text-sm font-mono font-semibold text-slate-800">{redacted.last_4_digits}</p>
                  </div>
                )}
                {redacted.expiry_date && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Expires</p>
                    <p className="text-sm font-semibold text-slate-800">{redacted.expiry_date}</p>
                  </div>
                )}
                {redacted.nationality && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Nationality</p>
                    <p className="text-sm font-semibold text-slate-800">{redacted.nationality}</p>
                  </div>
                )}
                {redacted.booking_reference && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Booking Reference</p>
                    <p className="text-sm font-mono font-semibold text-slate-800">{redacted.booking_reference}</p>
                  </div>
                )}
                {redacted.hotel_name && (
                  <div className="bg-slate-50 p-2 rounded-lg col-span-2">
                    <p className="text-[10px] text-slate-500 font-semibold">Hotel</p>
                    <p className="text-sm font-semibold text-slate-800">{redacted.hotel_name}</p>
                  </div>
                )}
                {redacted.airline && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Airline</p>
                    <p className="text-sm font-semibold text-slate-800">{redacted.airline}</p>
                  </div>
                )}
                {redacted.card_issuer && (
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-500 font-semibold">Bank</p>
                    <p className="text-sm font-semibold text-slate-800">{redacted.card_issuer}</p>
                  </div>
                )}
                {redacted.bank_phone && (
                  <div className="bg-slate-50 p-2 rounded-lg col-span-2">
                    <p className="text-[10px] text-slate-500 font-semibold">Bank Emergency Phone</p>
                    <p className="text-sm font-mono font-semibold text-slate-800">{redacted.bank_phone}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {vaults.offline && vaults.vaults?.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
          <p className="font-semibold mb-2">✓ Your emergency information is ready:</p>
          <ul className="space-y-1 text-emerald-700">
            <li>• Show this screen to border control / police / medical staff</li>
            <li>• Your passport number (last 4 digits), expiry, and nationality are visible above</li>
            <li>• Hotel booking reference and name are visible for taxi/transport</li>
            <li>• Bank emergency phone numbers work even without data (voice calls)</li>
          </ul>
          <p className="text-[10px] text-emerald-600 mt-3 font-semibold">
            💡 Tip: Voice calls work without data - use the bank phone numbers above to report lost/stolen cards
          </p>
        </div>
      )}

      {vaults.offline && vaults.vaults?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
          <p className="font-semibold mb-2">🔒 Offline Access Active:</p>
          <p className="text-blue-700">
            You're viewing cached documents from this device. No internet connection is being used. 
            This works even if you're logged out of the app or the network is completely unavailable.
          </p>
        </div>
      )}
    </div>
  );
}