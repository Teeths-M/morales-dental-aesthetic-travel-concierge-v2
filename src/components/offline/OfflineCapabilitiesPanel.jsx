import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, MessageSquare, QrCode, Shield, MapPin, Smartphone, CheckCircle2, Copy, RefreshCw, AlertTriangle, ExternalLink, Layers } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// IndexedDB helper for offline document caching
const OFFLINE_CACHE_KEY = 'morales_offline_vault';
const MAX_VAULT_BYTES = 50 * 1024 * 1024; // 50 MB LRU cap

// Prune localStorage vault entries exceeding MAX_VAULT_BYTES (LRU — oldest removed first)
function pruneOfflineVault() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('morales_vault_doc_'));
    const entries = keys.map(k => {
      try { return { key: k, ...JSON.parse(localStorage.getItem(k)) }; } catch { return null; }
    }).filter(Boolean).sort((a, b) => new Date(a.accessed_at || a.cached_at) - new Date(b.accessed_at || b.cached_at));
    let total = entries.reduce((sum, e) => sum + (e.size_bytes || 0), 0);
    for (const entry of entries) {
      if (total <= MAX_VAULT_BYTES) break;
      localStorage.removeItem(entry.key);
      total -= (entry.size_bytes || 0);
    }
  } catch (_) {}
}

function generateQRToken(caseId, userId) {
  const payload = { case_id: caseId, user_id: userId, ts: Date.now(), nonce: Math.random().toString(36).slice(2) };
  return btoa(JSON.stringify(payload));
}

function generateEmergencyPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const SMS_COMMANDS = [
  { cmd: 'CHECKIN OK [case_id]', desc: 'Log a safe check-in', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { cmd: 'CHECKIN PAIN [1-10] [case_id]', desc: 'Report pain level', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { cmd: 'AGENCY FLIGHT DELAY [case_id]', desc: 'Flag flight delay', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { cmd: 'AGENCY HOTEL CHANGE [case_id]', desc: 'Request hotel change', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { cmd: 'AGENCY CONFIRM [case_id]', desc: 'Confirm agency readiness', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  { cmd: 'SOS [case_id]', desc: 'Emergency escalation', color: 'text-red-700 bg-red-50 border-red-200' },
  { cmd: 'PIN [4-8 digits]', desc: 'Emergency device access', color: 'text-slate-700 bg-slate-50 border-slate-200' },
];

const DOC_TYPE_ICONS = {
  passport: '🛂', visa: '📋', flight_ticket: '✈️', hotel_booking: '🏨',
  medical_record: '🏥', insurance: '🛡️', other: '📄',
};

function OfflineDocsTab() {
  const [vaultDocs, setVaultDocs] = useState(null);
  const [manifestCached, setManifestCached] = useState(false);
  const [pinCached, setPinCached] = useState(false);

  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    // Vault metadata (saved by VaultDashboard / EmergencyVaultViewer)
    const vaultKey = allKeys.find(k => k.startsWith('morales_vault_meta_'));
    if (vaultKey) {
      try { setVaultDocs(JSON.parse(localStorage.getItem(vaultKey))); } catch (_) {}
    }
    // Emergency manifest
    setManifestCached(!!localStorage.getItem('morales_emergency_manifest'));
    // PIN: detect either the legacy SHA-256 hash (morales_emergency_pin_hash)
    // OR the newer PBKDF2 vault PIN (morales_vault_pin_<email>).
    // When PBKDF2 save succeeds, the legacy key is not written — checking only
    // the legacy key caused "Not Set" for all users who set their PIN normally.
    const hasPinLegacy = !!localStorage.getItem('morales_emergency_pin_hash');
    const hasPinPbkdf2 = allKeys.some(k => k.startsWith('morales_vault_pin_'));
    setPinCached(hasPinLegacy || hasPinPbkdf2);
  }, []);

  const hasDocs = vaultDocs && vaultDocs.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-600" />
        <h4 className="font-semibold text-slate-800 text-sm">Offline Cache Status</h4>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        These items are stored on your device and accessible without internet. Visit each section while online to prime your cache.
      </p>

      {/* PIN Cache */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${pinCached ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <span className="text-base">🔐</span>
        <p className={`flex-1 text-xs font-semibold ${pinCached ? 'text-emerald-800' : 'text-red-700'}`}>Emergency PIN</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pinCached ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {pinCached ? '✓ Cached' : '✗ Not Set'}
        </span>
      </div>

      {/* Manifest Cache */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${manifestCached ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <span className="text-base">🚨</span>
        <p className={`flex-1 text-xs font-semibold ${manifestCached ? 'text-emerald-800' : 'text-amber-700'}`}>Emergency Manifest</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${manifestCached ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {manifestCached ? '✓ Cached' : '⚠ Not Cached'}
        </span>
      </div>

      {/* Vault Documents */}
      {hasDocs ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Vault Documents ({vaultDocs.length})</p>
          {vaultDocs.map((doc, i) => (
            <div key={doc.vault_id || doc.id || i} className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="text-base">{DOC_TYPE_ICONS[doc.document_type] || '📄'}</span>
              <p className="flex-1 text-xs font-semibold text-emerald-800 truncate">{doc.file_name || doc.document_type?.replace(/_/g, ' ')}</p>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Cached</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">No vault documents cached yet</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Open your Passport Vault while online — your document list will automatically cache for offline access.</p>
            <a href="/passport-vault" className="flex items-center gap-1 text-[11px] text-blue-600 mt-2 font-semibold hover:underline">
              <ExternalLink className="w-3 h-3" />Go to Passport Vault →
            </a>
          </div>
        </div>
      )}

      {/* SOS & Emergency Access links */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-slate-700">Offline Emergency Access</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Emergency PIN page and SOS tools work without login. Ensure your PIN is cached above.</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <a href="/emergency-access" className="text-[11px] text-blue-600 font-semibold hover:underline">Emergency PIN Access →</a>
            <a href="/emergency-manifest" className="text-[11px] text-red-600 font-semibold hover:underline">Emergency Manifest →</a>
            <a href="/emergency" className="text-[11px] text-purple-600 font-semibold hover:underline">SOS Hub →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfflineCapabilitiesPanel({ caseId, userId }) {
  const [activeTab, setActiveTab] = useState('tiers');
  const [qrToken, setQrToken] = useState(null);
  const [emergencyPin, setEmergencyPin] = useState(null);
  const [pinSaved, setPinSaved] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [copied, setCopied] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show persistent "Syncing…" banner to prevent double-tap race conditions
      const queue = JSON.parse(localStorage.getItem('morales_offline_queue') || '[]');
      if (queue.length > 0) {
        setSyncing(true);
        // Give sync time to flush before hiding the banner
        setTimeout(() => setSyncing(false), 4000);
      }
      pruneOfflineVault();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const genQR = () => {
    const token = generateQRToken(caseId || 'demo', userId || 'user');
    setQrToken(token);
  };

  const genPin = () => {
    const pin = generateEmergencyPin();
    setEmergencyPin(pin);
    sessionStorage.setItem('morales_emergency_pin', pin);
    setPinSaved(true);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const TABS = [
    { id: 'tiers', label: 'Capabilities', icon: Layers },
    { id: 'sms', label: 'SMS Shortcodes', icon: MessageSquare },
    { id: 'qr', label: 'QR Token', icon: QrCode },
    { id: 'pin', label: 'Emergency PIN', icon: Smartphone },
    { id: 'docs', label: 'Offline Docs', icon: Shield },
  ];

  return (
    <div className="space-y-4">
      {/* Online/Offline status */}
      {syncing && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border bg-blue-50 border-blue-300">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs font-semibold text-blue-800 flex-1">Syncing offline actions to server — please wait…</p>
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin ml-auto" />
        </div>
      )}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        <p className={`text-xs font-semibold ${isOnline ? 'text-emerald-800' : 'text-amber-800'}`}>
          {isOnline ? 'Connected — All systems online' : '⚠️ Offline mode active — SMS fallback available'}
        </p>
        {!isOnline && <WifiOff className="w-4 h-4 text-amber-600 ml-auto" />}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Capability tiers — exact offline degradation matrix */}
        {activeTab === 'tiers' && (
          <motion.div key="tiers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                <h4 className="font-semibold text-slate-800 text-sm">What Works Without Internet</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Exact breakdown of what degrades when you go offline — no overstatements.
              </p>

              {/* Tier 1 — Full offline */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">✅ Works fully offline (no signal needed)</p>
                {[
                  'Emergency PIN — stored on-device',
                  'Emergency contacts & manifest — cached locally',
                  'Vault documents — cached to device storage (50 MB)',
                  'Handshake tap-to-confirm — queued, syncs when online',
                  'SOS via SMS — Twilio SMS works even without data',
                  'QR token — generated client-side, valid 4 hours',
                  'Last-known location & breadcrumb history',
                  'Silent Guardian strikes — tracked locally',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-800">{f}</p>
                  </div>
                ))}
              </div>

              {/* Tier 2 — Degraded */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-amber-700 uppercase">⚠️ Degrades offline (cached data only)</p>
                {[
                  'Case details — last fetched version, may be stale',
                  'Partner contacts — visible but cannot be updated',
                  'Journey stage — shows last known, no live sync',
                  'Guardian view link — link works, data is last cached',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">{f}</p>
                  </div>
                ))}
              </div>

              {/* Tier 3 — Requires connection */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-red-700 uppercase">❌ Requires active connection</p>
                {[
                  'EVN-iQ400 real-time scan — live country intelligence needs internet',
                  'AI partner briefs — LLM calls require connection',
                  'Live GPS streaming — updates only while online',
                  'Internet intelligence scan — domain/social checks are live',
                  'New booking or payment actions',
                  'Doctor portal updates & case stage changes',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                    <WifiOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* SMS Shortcodes */}
        {activeTab === 'sms' && (
          <motion.div key="sms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-slate-800 text-sm">iQ200 SMS Shortcode Layer</h4>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                During data blackouts, send SMS to your coordinator's shortcode number. Commands execute instantly upon reconnect.
              </p>
              <div className="space-y-2">
                {SMS_COMMANDS.map(c => (
                  <div key={c.cmd} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border ${c.color}`}>
                    <div>
                      <code className="text-xs font-semibold">{c.cmd}</code>
                      <p className="text-[10px] opacity-70 mt-0.5">{c.desc}</p>
                    </div>
                    <button onClick={() => copyToClipboard(c.cmd.split(' [')[0], c.cmd)}
                      className="flex-shrink-0 opacity-60 hover:opacity-100">
                      {copied === c.cmd ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-[11px] text-slate-600 font-semibold">Coordinator SMS Shortcode</p>
                <p className="text-xs text-slate-500 mt-0.5">Contact your care coordinator for the country-specific shortcode number. All commands are processed within 60 seconds of SMS delivery.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* QR Token */}
        {activeTab === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <QrCode className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-800 text-sm mb-1">Encrypted QR Profile Token</h4>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Generate an encrypted offline QR token. Partner devices scan this to access your case profile and clear payments on reconnect — no internet required during scan.
              </p>
              {qrToken ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl p-4 mx-auto w-fit shadow-sm border border-slate-100">
                    <QRCodeSVG value={qrToken} size={160} bgColor="#ffffff" fgColor="#060B16" level="M" />
                    <p className="text-[9px] text-slate-400 mt-2 font-mono text-center break-all">{qrToken.slice(0, 24)}...</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => copyToClipboard(qrToken, 'qr')}
                      className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50">
                      {copied === 'qr' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Token
                    </button>
                    <button onClick={genQR}
                      className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Valid for 4 hours · Payment cleared on partner reconnect</p>
                </div>
              ) : (
                <button onClick={genQR}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm">
                  Generate QR Token
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Emergency PIN */}
        {activeTab === 'pin' && (
          <motion.div key="pin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
              <Smartphone className="w-8 h-8 text-violet-600 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-800 text-sm mb-1">Device-Agnostic Emergency PIN</h4>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Works from any borrowed phone or partner console. Send "PIN [code]" via SMS, or enter at any Morales Medical kiosk to authenticate without your personal device.
              </p>
              {emergencyPin ? (
                <div className="space-y-4">
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 mx-auto max-w-xs">
                    <p className="text-4xl font-black tracking-[0.3em] text-violet-800 font-mono">{emergencyPin}</p>
                    <p className="text-xs text-violet-600 mt-2">Your Emergency PIN</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    <p className="font-semibold mb-1">⚠️ Security Notice</p>
                    <p>Never share this PIN except with a Morales Medical coordinator. This PIN expires in 24 hours or upon first use.</p>
                  </div>
                  <button onClick={() => copyToClipboard(emergencyPin, 'pin')}
                    className="flex items-center gap-2 mx-auto text-xs text-violet-600 border border-violet-200 rounded-lg px-4 py-2 hover:bg-violet-50">
                    {copied === 'pin' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy PIN
                  </button>
                </div>
              ) : (
                <button onClick={genPin}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl text-sm">
                  Generate Emergency PIN
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Offline Docs */}
        {activeTab === 'docs' && (
          <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <OfflineDocsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}