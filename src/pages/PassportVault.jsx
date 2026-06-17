import React, { useEffect, useState } from 'react';
import { Shield, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VaultDashboard from '@/components/vault/VaultDashboard';
import VaultUploader from '@/components/vault/VaultUploader';
import VaultPINGate from '@/components/vault/VaultPINGate';
import { BRAND } from '@/lib/brandTokens';

export default function PassportVault() {
  const [user, setUser]       = useState(null);
  const [hasVault, setHasVault] = useState(null);
  const [hasPIN, setHasPIN] = useState(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const vaults = await base44.entities.PassportVault.filter({ user_email: u.email, status: 'active' }, '-uploaded_at', 1);
        setHasVault(vaults.length > 0);
        
        const pins = await base44.entities.VaultPIN.filter({ user_id: u.id });
        setHasPIN(pins.length > 0);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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

  // Show PIN gate - will handle both setup and verification internally
  if (user && !pinVerified) {
    return <VaultPINGate hasExistingPIN={hasPIN === true} onPINVerified={handlePINVerified} />;
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
              className="inline-block mt-3 px-5 py-2 rounded-lg text-xs font-bold text-amber-900 transition-all hover:opacity-90"
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
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white leading-none" style={{ letterSpacing: '-0.02em' }}>Secure Document Vault</h1>
              <p className="text-[11px] text-white/30 mt-1.5 tracking-[0.2em] uppercase">Zero-knowledge · AES-256-GCM</p>
            </div>
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