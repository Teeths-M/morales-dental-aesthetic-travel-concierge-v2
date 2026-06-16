import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Smartphone, ArrowRight } from 'lucide-react';
import EmergencyPINSetup from '@/components/emergency/EmergencyPINSetup';
import EmergencyVaultViewer from '@/components/vault/EmergencyVaultViewer';
import { Link } from 'react-router-dom';

export default function EmergencyPINAccess() {
  const [email, setEmail] = useState('');
  const [emailEntered, setEmailEntered] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pinSessionToken, setPinSessionToken] = useState(null);

  const handleVerified = (data) => {
    if (data.verified && data.pin_session_token) {
      setPinSessionToken(data.pin_session_token);
      setVerified(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-700/50">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Morales Medical</p>
          <h1 className="text-2xl font-bold text-white mt-1">Emergency Access</h1>
          <p className="text-slate-400 text-sm mt-2">Enter your Universal Emergency PIN to access your vault and safety tools — no app login required</p>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6">
          {!emailEntered ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">Your Account Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email && setEmailEntered(true)}
                  placeholder="you@email.com"
                  className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => email && setEmailEntered(true)}
                disabled={!email}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-slate-500">
                Or <Link to="/" className="text-blue-400 hover:underline">return to home</Link>
              </p>
            </div>
          ) : !verified ? (
            <EmergencyPINSetup userEmail={email} mode="verify" onVerified={handleVerified} />
          ) : (
            <EmergencyVaultViewer pinSessionToken={pinSessionToken} />
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          🔒 PIN verified server-side · SHA-256 salted · 5-attempt lockout
        </p>
      </div>
    </div>
  );
}