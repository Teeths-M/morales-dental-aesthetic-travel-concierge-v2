import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { saveVaultPIN } from '@/lib/vault/offlineVaultPIN';
import { generatePINHash } from '@/lib/vaultPINHashing';

function PINField({ label, value, onChange, length }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-300 block">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={length}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        placeholder={'• '.repeat(length).trim()}
        className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
  );
}

export default function ResetPIN() {
  const [params] = useSearchParams();
  const token = params.get('t');
  const sig = params.get('s');
  const pinType = params.get('type') === 'vault' ? 'vault' : 'emergency';
  const pinLength = pinType === 'vault' ? 4 : 6;
  const backRoute = pinType === 'vault' ? '/passport-vault' : '/emergency-access';

  const [verifyState, setVerifyState] = useState('loading'); // loading | valid | invalid | expired
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !sig) { setVerifyState('invalid'); return; }
    base44.functions.invoke('confirmPINReset', { token, sig, action: 'verify', pin_type: pinType })
      .then(res => {
        const d = res?.data;
        if (d?.valid && d?.email) {
          setEmail(d.email);
          setVerifyState('valid');
        } else {
          setVerifyState(d?.reason === 'expired' ? 'expired' : 'invalid');
        }
      })
      .catch(() => setVerifyState('invalid'));
  }, [token, sig]);

  const handleSave = async () => {
    if (pin.length !== pinLength) { setError(`PIN must be exactly ${pinLength} digits.`); return; }
    if (pin !== pinConfirm) { setError("PINs don't match. Please try again."); return; }
    setError('');
    setSaveState('saving');
    try {
      // Confirm on server first (sets PIN for other devices too) — for the
      // vault PIN, this also validates a VaultPIN record actually exists.
      await base44.functions.invoke('confirmPINReset', { token, sig, action: 'confirm', new_pin: pin, pin_type: pinType });
      // Save locally (works offline after this) — same storage shape each
      // gate checks: offlineVaultPIN for the Emergency PIN gate,
      // vault_pin_hash_/vault_pin_salt_ keys for VaultPINGate.
      if (pinType === 'vault') {
        const { salt, hash } = await generatePINHash(pin, email);
        localStorage.setItem(`vault_pin_hash_${email.toLowerCase()}`, hash);
        localStorage.setItem(`vault_pin_salt_${email.toLowerCase()}`, salt);
      } else {
        await saveVaultPIN(email, pin);
      }
      setSaveState('done');
    } catch {
      setSaveState('error');
      setError("Couldn't save your PIN. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-700/50">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Morales Medical</p>
          <h1 className="text-2xl font-semibold text-white mt-1">{pinType === 'vault' ? 'Reset Vault PIN' : 'Reset Emergency PIN'}</h1>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-3xl p-6 space-y-5">
          {verifyState === 'loading' && (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Verifying link…
            </div>
          )}

          {verifyState === 'expired' && (
            <div className="text-center py-4 space-y-3">
              <Clock className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-white font-semibold">Link expired</p>
              <p className="text-slate-400 text-sm">This reset link is only valid for 15 minutes. Please request a new one.</p>
              <Link to={backRoute} className="inline-block mt-2 text-blue-400 text-sm hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}

          {verifyState === 'invalid' && (
            <div className="text-center py-4 space-y-3">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-white font-semibold">Link not valid</p>
              <p className="text-slate-400 text-sm">This link has already been used or is not valid. Please request a new one.</p>
              <Link to={backRoute} className="inline-block mt-2 text-blue-400 text-sm hover:underline">
                Back
              </Link>
            </div>
          )}

          {verifyState === 'valid' && saveState !== 'done' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center">
                Resetting PIN for <span className="text-white font-semibold">{email}</span>
              </p>
              <PINField label={`New ${pinLength}-digit PIN`} value={pin} onChange={v => { setPin(v); setError(''); }} length={pinLength} />
              <PINField label="Confirm new PIN" value={pinConfirm} onChange={v => { setPinConfirm(v); setError(''); }} length={pinLength} />
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saveState === 'saving' || pin.length < pinLength || pinConfirm.length < pinLength}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {saveState === 'saving'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : 'Save New PIN'}
              </button>
            </div>
          )}

          {saveState === 'done' && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
              <p className="text-white font-semibold text-lg">PIN updated!</p>
              <p className="text-slate-400 text-sm">
                Your new {pinLength}-digit PIN is active.{' '}
                {pinType === 'vault' ? 'Use it to unlock your vault on this device.' : 'Use it on any device for emergency access.'}
              </p>
              <Link to={backRoute} className="inline-block mt-3 text-blue-400 text-sm hover:underline">
                {pinType === 'vault' ? 'Go to My Vault' : 'Go to Emergency Access'}
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          🔒 PIN stored locally (PBKDF2-SHA256) · Works offline after reset
        </p>
      </div>
    </div>
  );
}
