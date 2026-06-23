import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Smartphone, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { saveVaultPIN, verifyVaultPIN, hasVaultPIN } from '@/lib/vault/offlineVaultPIN';

// ---------- Manifest cache primer ----------
// Called automatically after PIN setup so the offline manifest is ready without
// requiring a separate visit to /emergency-manifest.
async function cacheManifestLocally(userEmail) {
  const MANIFEST_KEY = 'morales_emergency_manifest';
  const MAX_BYTES = 50 * 1024;
  try {
    const cases = await base44.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 1);
    const c = cases?.[0];
    const manifestData = {
      full_name: c?.client_name || userEmail,
      blood_type: c?.blood_type || 'Unknown',
      allergies: c?.allergies || 'None recorded',
      medications: c?.medications || 'None recorded',
      medical_conditions: c?.medical_conditions || 'None recorded',
      emergency_contacts: c?.emergency_contact
        ? [{ name: c.emergency_contact, relationship: 'Emergency Contact', phone: c.emergency_contact_phone || 'Not provided' }]
        : [],
      passport_last4: c?.passport_vault_token ? 'On file' : 'Not on file',
      procedure: Array.isArray(c?.procedures) ? c.procedures.join(', ') : (c?.procedures || 'Not specified'),
      doctor_name: c?.doctor_selected || 'Not assigned',
      doctor_phone: c?.doctor_email || 'Not available',
      case_id: c?.id || 'N/A',
      patient_phone: c?.client_phone || 'Not on file',
      client_email: userEmail,
      client_country: c?.client_country || 'Not on file',
      preferred_language: c?.preferred_language || 'English',
      insurance_info: c?.insurance_info || 'Not on file',
      cached_at: new Date().toISOString(),
      cached_version: '2.0',
    };
    const str = JSON.stringify(manifestData);
    if (str.length <= MAX_BYTES) localStorage.setItem(MANIFEST_KEY, str);
  } catch (_) {
    // Non-fatal — manifest can still be cached by visiting /emergency-manifest
  }
}

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

export default function EmergencyPINSetup({ userEmail, mode = 'setup', onVerified, onForgotPIN }) {
  // SYNCHRONOUS check on first render - no async, works 100% offline
  const initialMode = React.useMemo(() => {
    if (!userEmail) return mode;
    // Check PBKDF2 local PIN first (most secure)
    if (hasVaultPIN(userEmail)) return 'verify';
    // Fallback to legacy local PIN
    const stored = localStorage.getItem(LOCAL_PIN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email === userEmail.toLowerCase()) return 'verify';
      } catch {}
    }
    // SECURITY: no local PIN copy on this device. If we're offline right now,
    // we have no way to know whether a PIN already exists server-side on
    // another device — silently defaulting to 'setup' here would let anyone
    // create a brand-new PIN with zero verification against the real one,
    // overwriting legitimate emergency access. Block instead of guessing.
    if (!navigator.onLine) return 'blocked_needs_sync';
    return mode;
  }, [userEmail, mode]);

  const [currentMode, setCurrentMode] = useState(initialMode);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPIN, setHasPIN] = useState(initialMode === 'verify');
  const [pinHint, setPinHint] = useState(null);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const { toast } = useToast();
  // True when the user is changing an existing PIN (reached via "Change PIN"
  // from the done state) rather than setting one up for the first time.
  // Changing requires the current PIN; first-time setup has none to verify.
  const isChangingExisting = currentMode === 'setup' && hasPIN;

  // Load hint from legacy storage (async, non-blocking)
  React.useEffect(() => {
    if (userEmail && initialMode === 'verify') {
      const localHint = getLocalHint(userEmail);
      if (localHint !== null) setPinHint(localHint);
    }
  }, [userEmail, initialMode]);

  // Removed checkExisting - now handled synchronously in initialMode

  const setupPIN = async () => {
    if (pin.length !== 6) { setError('PIN must be exactly 6 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
    if (isChangingExisting && currentPin.length !== 6) {
      setError('Enter your current 6-digit PIN to set a new one.');
      return;
    }
    setLoading(true);
    setError('');

    // Changing an existing PIN requires server verification of the current
    // PIN first — local-only save isn't enough here, since the whole point
    // is confirming the caller actually knows the real current PIN before
    // we let them replace it.
    if (isChangingExisting) {
      if (!navigator.onLine) {
        setError('Connect to the internet to change your PIN (this confirms your current PIN first).');
        setLoading(false);
        return;
      }
      try {
        await base44.functions.invoke('verifyEmergencyPIN', {
          action: 'setup', user_email: userEmail, pin: currentPin, new_pin: pin, hint
        });
      } catch (err) {
        const serverMsg = err?.response?.data?.error || err?.message;
        setError(serverMsg === 'current_pin_required' || !serverMsg
          ? 'Could not verify current PIN. Please try again.'
          : serverMsg);
        setLoading(false);
        return;
      }
    }

    // Step 1a: Save PBKDF2 hash (secure offline access via VaultPINGate)
    try {
      await saveVaultPIN(userEmail, pin);
    } catch (err) {
      console.error('[EmergencyPINSetup] PBKDF2 save failed:', err);
    }
    // Step 1b: ALWAYS save legacy SHA-256 hash regardless of PBKDF2 outcome.
    // EmergencyManifest offline verification and OfflineCapabilitiesPanel
    // status display both read morales_emergency_pin_hash — they would
    // falsely show "Not Set" if only the PBKDF2 key was written.
    await saveLocalPIN(pin, userEmail, hint);

    // Step 2: Save to server (if online and not already handled above)
    if (!isChangingExisting && navigator.onLine) {
      try {
        await base44.functions.invoke('verifyEmergencyPIN', { action: 'setup', user_email: userEmail, new_pin: pin, hint });
      } catch (_) {
        // Server save failed, but local save succeeded — still works offline
      }
    }
    
    // Step 3: Prime emergency manifest cache in the background (best-effort, non-blocking)
    if (navigator.onLine) {
      cacheManifestLocally(userEmail).catch(() => {});
    }

    // Step 4: Clear inputs and show success
    toast({
      title: '✅ Emergency PIN Saved!',
      description: 'Stored securely on-device for offline access',
      variant: 'default'
    });
    
    setHasPIN(true);
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setCurrentMode('done');
    setLoading(false);
  };

  const verifyPIN = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    setError('');

    // Try PBKDF2 verification first (most secure, works offline)
    try {
      const result = await verifyVaultPIN(userEmail, pin);
      if (result.valid) {
        setCurrentMode('verified');
        if (onVerified) onVerified({ verified: true, pin_session_token: 'offline_local', expires_at: null });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[EmergencyPINSetup] PBKDF2 verify failed:', err);
    }

    // Fallback to legacy local verification
    const legacyOk = await verifyLocalPIN(pin, userEmail);
    if (legacyOk) {
      setCurrentMode('verified');
      if (onVerified) onVerified({ verified: true, pin_session_token: 'offline_local', expires_at: null });
      setLoading(false);
      return;
    }

    // If online, try server as last resort
    if (navigator.onLine) {
      try {
        const res = await base44.functions.invoke('verifyEmergencyPIN', { action: 'verify', user_email: userEmail, pin });
        if (res.data?.verified) {
          // Save locally for next offline use
          try {
            await saveVaultPIN(userEmail, pin);
          } catch (_) {}
          setVerifiedToken(res.data.pin_session_token);
          setCurrentMode('verified');
          if (onVerified) onVerified({ verified: true, pin_session_token: res.data.pin_session_token, expires_at: res.data.expires_at });
          setLoading(false);
          return;
        }
      } catch (_) {}
    }

    // All methods failed
    setError('Incorrect PIN');
    setAttemptsLeft(a => a - 1);
    setPin('');
    setLoading(false);
  };

  // If connectivity returns while blocked, re-check — the user may now be
  // able to sync their real PIN status instead of staying stuck.
  React.useEffect(() => {
    if (currentMode !== 'blocked_needs_sync') return;
    const handleOnline = () => {
      if (hasVaultPIN(userEmail)) { setCurrentMode('verify'); return; }
      const stored = localStorage.getItem(LOCAL_PIN_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email === userEmail.toLowerCase()) { setCurrentMode('verify'); return; }
        } catch {}
      }
      setCurrentMode(mode); // genuinely no PIN anywhere — safe to allow setup now that we're online
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentMode, userEmail, mode]);

  if (currentMode === 'blocked_needs_sync') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
          <WifiOff className="w-7 h-7 text-amber-700" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Connect Once to Set Up Emergency Access</h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          This device hasn't verified your Emergency PIN yet. Connect to the internet once to sync
          it securely — after that, it will work fully offline on this device.
        </p>
      </div>
    );
  }

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
      {isOffline && !isChangingExisting && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          Offline Mode Active — PIN verified on-device
        </div>
      )}
      {isOffline && isChangingExisting && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          Changing your PIN requires an internet connection to verify your current PIN.
        </div>
      )}
      {/* Mode header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-7 h-7 text-blue-700" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">
          {isChangingExisting ? 'Change Emergency PIN' : hasPIN || currentMode === 'verify' ? 'Emergency PIN Access' : 'Setup Emergency PIN'}
        </h3>
        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
          {isChangingExisting
            ? 'Enter your current PIN, then choose a new one.'
            : hasPIN || currentMode === 'verify'
              ? 'Enter your 6-digit PIN to unlock your vault and SOS console.'
              : 'Create your 6-digit PIN for offline emergency access.'}
        </p>
        {pinHint && currentMode === 'verify' && <p className="text-xs text-blue-600 mt-2">Hint: {pinHint}</p>}
      </div>

      {/* PIN entry */}
      <div className="space-y-4">
        {/* Current PIN (change-existing only) */}
        {isChangingExisting && (
          <div>
            <p className="text-xs font-semibold text-slate-600 text-center mb-3">Enter your current 6-digit PIN</p>
            <PINInput value={currentPin} onChange={setCurrentPin} disabled={loading} />
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-600 text-center mb-3">
            {currentMode === 'verify' || hasPIN ? (isChangingExisting ? 'Choose a new 6-digit PIN' : 'Enter your 6-digit PIN') : 'Choose a 6-digit PIN'}
          </p>
          <PINInput value={pin} onChange={setPin} disabled={loading} />
        </div>

        {/* Confirm PIN (setup only) */}
        {(!hasPIN || isChangingExisting) && currentMode !== 'verify' && (
          <div>
            <p className="text-xs font-semibold text-slate-600 text-center mb-3">Confirm PIN</p>
            <PINInput value={confirmPin} onChange={setConfirmPin} disabled={loading} />
          </div>
        )}

        {/* Hint (setup only) */}
        {(!hasPIN || isChangingExisting) && currentMode !== 'verify' && (
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
          onClick={hasPIN && !isChangingExisting || currentMode === 'verify' ? verifyPIN : setupPIN}
          disabled={
            loading ||
            pin.length !== 6 ||
            ((!hasPIN || isChangingExisting) && currentMode !== 'verify' && confirmPin.length !== 6) ||
            (isChangingExisting && currentPin.length !== 6)
          }
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 font-bold">
          {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Processing...</span>
            : hasPIN && !isChangingExisting || currentMode === 'verify' ? 'Unlock Emergency Access'
            : isChangingExisting ? 'Save New PIN'
            : 'Activate Emergency PIN'}
        </Button>

        {(currentMode === 'verify' || (hasPIN && !isChangingExisting)) && onForgotPIN && (
          <button
            type="button"
            onClick={onForgotPIN}
            className="w-full text-center text-xs text-slate-400 hover:text-blue-400 transition-colors pt-1"
          >
            Forgot your PIN?
          </button>
        )}
      </div>
    </div>
  );
}