import React, { useEffect, useState } from 'react';
import { Shield, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VaultDashboard from '@/components/vault/VaultDashboard';
import VaultUploader from '@/components/vault/VaultUploader';
import { BRAND } from '@/lib/brandTokens';

export default function PassportVault() {
  const [user, setUser]       = useState(null);
  const [hasVault, setHasVault] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const vaults = await base44.entities.PassportVault.filter({ user_email: u.email, status: 'active' }, '-uploaded_at', 1);
        setHasVault(vaults.length > 0);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} ${BRAND.goldAlpha(0.4)} transparent` }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white/20" />
          </div>
          <h2 className="text-lg font-display font-semibold text-white">Sign In Required</h2>
          <p className="text-sm text-white/40 mt-1 max-w-xs">You must be signed in to access your Passport Vault.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={{ background: BRAND.gold, color: '#060B16' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Emergency Access Banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Emergency Access Available</p>
            <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
              Lost your phone? Access documents from any device — no login required.
            </p>
            <Link to="/emergency-access"
              className="inline-block mt-2.5 px-4 py-1.5 rounded-lg text-xs font-bold text-amber-900 transition-colors"
              style={{ background: '#f59e0b' }}>
              Go to Emergency Access →
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl text-white/25 hover:text-white hover:bg-white/[0.05] transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-display font-semibold text-white leading-none">My Vault</h1>
              <p className="text-[10px] text-white/25 mt-0.5 tracking-wide">Zero-knowledge · AES-256-GCM</p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0A101D] p-5">
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
        <p className="text-center text-[10px] text-white/20 tracking-wider">
          🔒 PBKDF2 · AES-256-GCM · Zero-knowledge · Emergency PIN · Tamper-evident audit chain
        </p>
      </div>
    </div>
  );
}