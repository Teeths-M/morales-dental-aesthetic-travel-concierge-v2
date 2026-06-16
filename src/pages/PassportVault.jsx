import React, { useEffect, useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VaultUploader from '@/components/vault/VaultUploader';
import VaultDashboard from '@/components/vault/VaultDashboard';

export default function PassportVault() {
  const [user, setUser] = useState(null);
  const [hasVault, setHasVault] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const vaults = await base44.entities.PassportVault.filter({ status: 'active' });
        setHasVault(vaults.length > 0);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleTokenIssued = () => {
    setHasVault(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h2 className="text-lg font-display font-semibold text-foreground">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mt-1">You must be signed in to access your Passport Vault.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">Passport Vault</h1>
              <p className="text-xs text-muted-foreground">Zero-knowledge encrypted · AES-256-GCM</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6">
            {hasVault ? (
              <VaultDashboard user={user} />
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-foreground">Create Your Secure Document Vault</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your documents are encrypted locally with PBKDF2 + AES-256-GCM before upload.
                    Zero-knowledge architecture — we cannot read your documents. Emergency PIN access enabled.
                  </p>
                </div>
                <VaultUploader onTokenIssued={handleTokenIssued} />
              </>
            )}
          </div>
        </div>

        {/* Privacy Footer */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          🔒 PBKDF2 + AES-256-GCM · Zero-knowledge · Emergency PIN access · Secure share links · Immutable audit trail
        </p>
      </div>
    </div>
  );
}