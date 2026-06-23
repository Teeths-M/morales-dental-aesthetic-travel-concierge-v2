import React, { useEffect, useState } from 'react';
import { Shield, ArrowLeft, Lock, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import VaultDashboard from '@/components/vault/VaultDashboard';
import VaultUploader from '@/components/vault/VaultUploader';
import VaultPINGate from '@/components/vault/VaultPINGate';
import { BRAND } from '@/lib/brandTokens';

export default function PassportVault() {
  // IMPORTANT: pull identity from the shared AuthContext instead of calling
  // base44.auth.me() directly. AuthContext already restores a cached identity
  // (morales_last_known_user) when offline; a page-local auth.me() call has no
  // such fallback, so on every remount (refresh, leaving and returning, a
  // fresh browser open) while offline it would fail/hang and the page would
  // fall through to "Sign In Required" — looking exactly like the vault
  // itself requiring network, when actually it was an auth check requiring it.
  const { user, isLoadingAuth } = useAuth();
  const [hasVault, setHasVault] = useState(null);
  const [hasPIN, setHasPIN] = useState(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth) return; // wait for AuthContext to resolve (online or cached-offline)

    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Defensive timeout matching the PageLoader pattern: even though fetch
    // usually rejects fast when offline, don't let a slow/hung request keep
    // this page spinning indefinitely — fall back to cache after 6s.
    const withTimeout = (promise, ms = 6000) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);

    (async () => {
      // These are live network calls (base44.entities.*), not routed through
      // useVault/vaultService's offline-first cache. If they throw, hang, or
      // time out while offline, fall back to cached state so offline users
      // still reach the dashboard, which reads its own data from localStorage.
      const cacheKey = `morales_vault_meta_${user.email.toLowerCase()}`;
      const pinCacheKey = `morales_vault_haspin_${user.id}`;

      try {
        const vaults = await withTimeout(base44.entities.PassportVault.filter({ user_id: user.id, status: 'active' }, '-uploaded_at', 1));
        if (cancelled) return;

        setHasVault(vaults.length > 0);
        try { localStorage.setItem(cacheKey + '_exists', vaults.length > 0 ? '1' : '0'); } catch (_) {}
      } catch (err) {
        console.warn('[PassportVault] vault lookup failed, falling back to cache:', err);
        let cachedExists = false;
        try { cachedExists = localStorage.getItem(cacheKey + '_exists') === '1'; } catch (_) {}
        if (!cachedExists) {
          try { cachedExists = JSON.parse(localStorage.getItem(cacheKey) || '[]').length > 0; } catch (_) {}
        }
        if (!cancelled) setHasVault(cachedExists);
      }

      try {
        const pins = await withTimeout(base44.entities.VaultPIN.filter({ user_id: user.id }));
        if (cancelled) return;
        const hasPinResult = pins.length > 0;
        setHasPIN(hasPinResult);
        try { localStorage.setItem(pinCacheKey, hasPinResult ? '1' : '0'); } catch (_) {}
      } catch (err) {
        console.warn('[PassportVault] PIN lookup failed, falling back to cache:', err);
        // SECURITY: don't default to "no PIN" (false) when we genuinely don't
        // know — that silently routes into VaultPINGate's setup mode, which
        // lets a brand-new PIN be created with zero verification against any
        // real PIN, on a device that's simply never synced. Only resolve to a
        // concrete true/false if we have an actual cached signal; otherwise
        // surface 'unknown' so the gate can block instead of guessing.
        let cachedValue = null;
        try { cachedValue = localStorage.getItem(pinCacheKey); } catch (_) {}
        if (!cancelled) setHasPIN(cachedValue === null ? 'unknown' : cachedValue === '1');
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, isLoadingAuth]);

  // If we landed in the 'unknown' blocked state (offline, no cached PIN
  // signal), retry automatically the moment connectivity returns instead of
  // requiring a manual refresh.
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    if (hasPIN !== 'unknown') return;
    const handleOnline = () => setRetryNonce(n => n + 1);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [hasPIN]);

  useEffect(() => {
    if (retryNonce === 0 || !user) return;
    setLoading(true);
    setHasPIN(null);
    const pinCacheKey = `morales_vault_haspin_${user.id}`;
    base44.entities.VaultPIN.filter({ user_id: user.id })
      .then(pins => {
        const result = pins.length > 0;
        setHasPIN(result);
        try { localStorage.setItem(pinCacheKey, result ? '1' : '0'); } catch (_) {}
      })
      .catch(() => setHasPIN('unknown'))
      .finally(() => setLoading(false));
  }, [retryNonce, user]);

  const handlePINVerified = () => {
    setPinVerified(true);
  };

  if (loading || hasPIN === null) {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} transparent` }} />
      </div>
    );
  }

  // SECURITY: offline, no cached signal either way for whether a vault PIN
  // already exists. Don't guess — VaultPINGate would otherwise silently
  // drop into 4-digit *setup* mode, letting a brand-new PIN be created with
  // zero verification against any real one on a device that's never synced.
  if (user && hasPIN === 'unknown') {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <WifiOff className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Connect Once to Unlock Vault</h2>
          <p className="text-white/40 text-[15px] leading-relaxed">
            This device hasn't verified your Vault PIN status yet. Connect to the internet once —
            after that, your vault will unlock fully offline on this device.
          </p>
        </div>
      </div>
    );
  }

  // Show PIN gate - will handle both setup and verification internally
  if (user && !pinVerified) {
    return (
      <>
        {!navigator.onLine && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 border border-amber-400 shadow-lg">
            <WifiOff className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">Offline Mode</span>
          </div>
        )}
        <VaultPINGate hasExistingPIN={hasPIN === true} onPINVerified={handlePINVerified} user={user} />
      </>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5" style={{ boxShadow: '0 0 40px rgba(212,175,55,0.08)' }}>
            <Shield className="w-8 h-8 text-white/15" />
          </div>
          <h2 className="font-display text-2xl text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Sign In Required</h2>
          <p className="text-white/40 text-[15px] mb-7 leading-relaxed">You must be signed in to access your secure Passport Vault.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldLight} 100%)`, color: '#060B16', boxShadow: `0 4px 20px ${BRAND.goldAlpha(0.3)}` }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] py-12 px-4" style={{ background: 'linear-gradient(180deg, #060B16 0%, #0A101D 100%)' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Emergency Access Banner */}
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-amber-300" style={{ letterSpacing: '-0.01em' }}>Emergency Access Available</p>
            <p className="text-[13px] text-amber-400/60 mt-1 leading-relaxed">
              Lost your phone? Access documents from any device — no login required.
            </p>
            <Link to="/emergency-access"
              className="inline-block mt-3 px-5 py-2 rounded-lg text-xs font-semibold text-amber-900 transition-all hover:opacity-90"
              style={{ background: '#f59e0b' }}>
              Go to Emergency Access →
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2.5 rounded-xl text-white/20 hover:text-white hover:bg-white/[0.04] transition-all" aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl text-white leading-none" style={{ letterSpacing: '-0.02em' }}>Secure Document Vault</h1>
              <p className="text-[11px] text-white/30 mt-1.5 tracking-[0.2em] uppercase">Zero-knowledge · AES-256-GCM</p>
            </div>
            {!navigator.onLine && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-200">Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0A101D]/80 p-6" style={{ backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {hasVault ? (
            <VaultDashboard user={user} />
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-white">Upload Your First Document</h2>
                <p className="text-sm text-white/40 mt-1 leading-relaxed">
                  Documents are encrypted on your device before upload. We cannot read them.
                </p>
              </div>
              <VaultUploader onTokenIssued={() => setHasVault(true)} />
            </div>
          )}
        </div>

        {/* Privacy footer */}
        <p className="text-center text-[10px] text-white/25 tracking-[0.25em] uppercase pt-4">
          🔒 PBKDF2 · AES-256-GCM · Zero-knowledge · Emergency PIN
        </p>
      </div>
    </div>
  );
}