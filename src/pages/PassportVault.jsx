import React, { useEffect, useState } from 'react';
import { Shield, ArrowLeft, Lock, Upload, FileText, Camera } from 'lucide-react';
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
        {/* Emergency Access Banner - Top Priority for 60+ users */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-amber-900">Emergency Access Available</h2>
              <p className="text-sm text-amber-800 mt-1">
                <strong>Lost your phone?</strong> You can access these documents from any device using your Emergency PIN. 
                No app login required — just go to the emergency access page and enter your 6-digit PIN.
              </p>
              <Link to="/emergency-access" className="inline-block mt-3 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition-colors">
                📍 Emergency Access Page
              </Link>
            </div>
          </div>
        </div>

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
              <h1 className="text-xl font-display font-semibold text-foreground">My Vault</h1>
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
                  <h2 className="text-lg font-semibold text-foreground">Upload Your Important Documents</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your documents are encrypted locally with PBKDF2 + AES-256-GCM before upload.
                    Zero-knowledge architecture — we cannot read your documents. Emergency PIN access enabled.
                  </p>
                </div>

                {/* Quick Upload Buttons for 60+ users */}
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  <button 
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer group"
                  >
                    <Camera className="w-8 h-8 text-emerald-700 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-emerald-800">📸 Scan Passport</span>
                    <span className="text-xs text-emerald-600 text-center">Open camera to scan</span>
                  </button>
                  <button 
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer group"
                  >
                    <FileText className="w-8 h-8 text-blue-700 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-blue-800">✈️ Upload Flight Ticket</span>
                    <span className="text-xs text-blue-600 text-center">Select from files</span>
                  </button>
                  <button 
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 text-purple-700 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-purple-800">🏥 Upload Medical Record</span>
                    <span className="text-xs text-purple-600 text-center">Select from files</span>
                  </button>
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