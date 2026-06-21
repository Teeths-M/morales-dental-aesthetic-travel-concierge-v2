import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Smartphone, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// ---------- Local offline PIN helpers ----------
const LOCAL_PIN_KEY = 'morales_emergency_pin_hash';

async function hashPIN(pin, email) {
  const data = new TextEncoder().encode(pin + ':' + email.toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function saveLocalPIN(pin, email, hint) {
  const hash = await hashPIN(pin, email);
  localStorage.setItem(LOCAL_PIN_KEY, JSON.stringify({ hash, email: email.toLowerCase(), hint: hint || '', savedAt: new Date().toISOString() }));
}

async function verifyLocalPIN(pin, email) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_PIN_KEY) || 'null');
    if (!stored || stored.email !== email.toLowerCase()) return false;
    const hash = await hashPIN(pin, email);
    return hash === stored.hash;
  } catch { return false; }
}

function getLocalHint(email) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_PIN_KEY) || 'null');
    if (stored && stored.email === email.toLowerCase()) return stored.hint || null;
  } catch {}
  return null;
}
// -----------------------------------------------

// 6-box PIN input component
function PINInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = digits.map((d, idx) => idx === i ? v : d).join('');
    onChange(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input key={i} ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1} value={d} disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 focus:outline-none transition-all
            ${d ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-800'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-blue-400'}`}
        />
      ))}
    </div>
  );
}

export default function EmergencyPINSetup({ userEmail, mode = 'setup', onVerified }) {
  const [currentMode, setCurrentMode] = useState(mode); // setup | verify | success
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPIN, setHasPIN] = useState(null);
  const [pinHint, setPinHint] = useState(null);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userEmail) checkExisting();
  }, [userEmail]);

  const checkExisting = async () => {
    // Always check local first (works offline)
    const localHint = getLocalHint(userEmail);
    if (localHint !== null) {
      setHasPIN(true);
      setPinHint(localHint);
    }
    // Then try server (if online) to sync
    if (navigator.onLine) {
      try {
        const res = await base44.functions.invoke('verifyEmergencyPIN', { action: 'get_hint', user_email: userEmail });
        if (res.data) {
          setHasPIN(res.data.has_pin);
          setPinHint(res.data.hint || localHint);
        }
      } catch (_) {}
    }
  };

  const setupPIN = async () => {
    if (pin.length !== 6) { setError('PIN must be exactly 6 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
    setLoading(true);
    setError('');
    // Always save locally so offline verify works
    await saveLocalPIN(pin, userEmail, hint);
    if (navigator.onLine) {
      try {
        await base44.functions.invoke('verifyEmergencyPIN', { action: 'setup', user_email: userEmail, new_pin: pin, hint });
      } catch (_) {}
    }
    toast({ title: '✅ Emergency PIN set', description: 'Saved on-device — works offline too' });
    setHasPIN(true);
    setPin('');
    setConfirmPin('');
    setCurrentMode('done');
    setLoading(false);
  };

  const verifyPIN = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    setError('');

    // Offline path: verify locally
    if (!navigator.onLine) {
      const ok = await verifyLocalPIN(pin, userEmail);
      if (ok) {
        setCurrentMode('verified');
        if (onVerified) onVerified({ verified: true, pin_session_token: 'offline_local', expires_at: null });
      } else {
        setError('Incorrect PIN');
        setAttemptsLeft(a => a - 1);
        setPin('');
      }
      setLoading(false);
      return;
    }

    // Online path: verify via server, also save locally for next offline use
    try {
      const res = await base44.functions.invoke('verifyEmergencyPIN', { action: 'verify', user_email: userEmail, pin });
      if (res.data?.verified) {
        await saveLocalPIN(pin, userEmail, hint); // keep local in sync
        setVerifiedToken(res.data.session_token);
        setCurrentMode('verified');
        if (onVerified) onVerified({ verified: true, pin_session_token: res.data.session_token, expires_at: res.data.expires_at });
      } else {
        setError(res.data?.error || 'Incorrect PIN');
        setAttemptsLeft(res.data?.attempts_remaining ?? attemptsLeft - 1);
        setPin('');
      }
    } catch (_) {
      // Server unreachable — fall back to local
      const ok = await verifyLocalPIN(pin, userEmail);
      if (ok) {
        setCurrentMode('verified');
        if (onVerified) onVerified({ verified: true, pin_session_token: 'offline_local', expires_at: null });
      } else {
        setError('Incorrect PIN (offline verification)');
        setPin('');
      }
    }
    setLoading(false);
  };

  if (currentMode === 'done' || currentMode === 'verified') {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-1">
          {currentMode === 'done' ? 'Emergency PIN Active' : 'Identity Verified'}
        </h3>
        <p className="text-slate-500 text-sm">
          {currentMode === 'done'
            ? `Your 6-digit PIN is set. Use it on any device at ${window.location.hostname} to access your vault and SOS console.`
            : 'PIN verified. You now have emergency access to your vault and safety tools.'}
        </p>
        {currentMode === 'done' && (
          <button onClick={() => { setCurrentMode('setup'); setPin(''); setConfirmPin(''); }}
            className="mt-4 flex items-center gap-2 mx-auto text-xs text-slate-500 hover:text-slate-700">
            <RefreshCw className="w-3.5 h-3.5" /> Change PIN
          </button>
        )}
      </div>
    );
  }

  const isOffline = !navigator.onLine;

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          Offline — verifying PIN from your device
        </div>
      )}
      {/* Mode header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-7 h-7 text-blue-700" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">
          {hasPIN && currentMode === 'setup' ? 'Update Emergency PIN' : hasPIN ? 'Emergency PIN Access' : 'Set Up Emergency PIN'}
        </h3>
        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
          {hasPIN && currentMode === 'setup'
            ? 'Your universal 6-digit PIN works on any device — no app login required.'
            : 'Enter your PIN to access your vault and SOS console on any device.'}
        </p>
        {pinHint && <p className="text-xs text-blue-600 mt-2">Hint: {pinHint}</p>}
      </div>

      {/* PIN entry */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-600 text-center mb-3">
            {currentMode === 'verify' ? 'Enter your 6-digit PIN' : hasPIN ? 'Enter new PIN' : 'Choose a 6-digit PIN'}
          </p>
          <PINInput value={pin} onChange={setPin} disabled={loading} />
        </div>

        {/* Confirm PIN (setup only) */}
        {(currentMode === 'setup' || !hasPIN) && (
          <div>
            <p className="text-xs font-semibold text-slate-600 text-center mb-3">Confirm PIN</p>
            <PINInput value={confirmPin} onChange={setConfirmPin} disabled={loading} />
          </div>
        )}

        {/* Hint (setup only) */}
        {(currentMode === 'setup' || !hasPIN) && (
          <div>
            <input value={hint} onChange={e => setHint(e.target.value)}
              placeholder="Optional memory hint (e.g. Year + City)"
              className="w-full text-center text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            {attemptsLeft < 5 && <span className="ml-auto font-bold">{attemptsLeft} left</span>}
          </div>
        )}

        <Button
          onClick={currentMode === 'verify' || hasPIN ? verifyPIN : setupPIN}
          disabled={loading || pin.length !== 6 || ((!hasPIN || currentMode === 'setup') && confirmPin.length !== 6)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 font-bold">
          {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span>
            : currentMode === 'verify' || hasPIN ? 'Unlock Emergency Access'
            : 'Activate Emergency PIN'}
        </Button>

        {hasPIN && currentMode !== 'verify' && (
          <button onClick={() => setCurrentMode('setup')} className="w-full text-xs text-slate-400 hover:text-slate-600 mt-1">
            Change existing PIN
          </button>
        )}
      </div>
    </div>
  );
}