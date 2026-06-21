import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react';

const LOCAL_PIN_KEY = 'morales_emergency_pin_hash';

function hasLocalPIN(email) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_PIN_KEY) || 'null');
    return stored && stored.email === email?.toLowerCase();
  } catch { return false; }
}

export default function PINSetupPrompt({ userEmail }) {
  const [hasPIN, setHasPIN] = useState(null);

  useEffect(() => {
    if (userEmail) {
      setHasPIN(hasLocalPIN(userEmail));
    }
  }, [userEmail]);

  if (hasPIN === null) return null;
  if (hasPIN) {
    return (
      <div className="flex items-center gap-3 bg-emerald-900/40 border border-emerald-700/50 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-emerald-300 text-xs font-bold">✅ Emergency PIN Active</p>
          <p className="text-emerald-400/80 text-[10px]">Your PIN is saved on this device and synced to the server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-amber-900/40 border border-amber-700/50 rounded-xl px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-amber-300 text-xs font-bold mb-1">⚠️ Emergency PIN Not Set</p>
        <p className="text-amber-400/80 text-[10px] leading-relaxed">
          <strong>Required for offline safety.</strong> Set your 6-digit PIN now to access your vault, manifest, and SOS tools without internet or app login.
        </p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-400/70">
          <Smartphone className="w-3 h-3" />
          <span>Works on any device · Saved locally + synced to server</span>
        </div>
      </div>
    </div>
  );
}