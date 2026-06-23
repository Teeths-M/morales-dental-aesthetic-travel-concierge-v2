import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, AlertTriangle, WifiOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyVaultPIN, saveVaultPIN, hasVaultPIN } from '@/lib/vault/offlineVaultPIN';
import { motion } from 'framer-motion';

const PinInput = ({ onComplete, disabled }) => {
  const [pins, setPins] = useState(['', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPins = [...pins];
    newPins[index] = value.slice(-1);
    setPins(newPins);

    if (value && index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    if (newPins.every(p => p !== '')) {
      onComplete(newPins.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pins[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {pins.map((pin, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={pin}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className="w-14 h-16 text-center text-2xl font-semibold bg-slate-900/60 border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
        />
      ))}
    </div>
  );
};

export default function OfflineVaultAccess({ userEmail, onVerified, onBack }) {
  const [step, setStep] = useState('email'); // email | verify | setup | access
  const [email, setEmail] = useState(userEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setError(null);
    setStep(hasVaultPIN(email) ? 'verify' : 'setup');
  };

  const handlePINSetup = async (pin) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await saveVaultPIN(email, pin);
      setStep('access');
      onVerified({ email, pin_session_token: 'offline_local' });
    } catch (err) {
      setError('Failed to save PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePINVerify = async (pin) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await verifyVaultPIN(email, pin);
      if (result.valid) {
        setStep('access');
        onVerified({ email, pin_session_token: 'offline_local' });
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'access') {
    return null; // Parent will render EmergencyVaultViewer
  }

  return (
    <div className="space-y-6">
      {step !== 'email' && (
        <button
          onClick={() => setStep('email')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}

      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-700/50">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Offline Vault Access</h2>
        <p className="text-slate-400 text-sm mt-2">
          {isOffline ? '📵 No internet - using local verification' : '🔒 100% local - works without internet'}
        </p>
      </div>

      {step === 'email' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Your Account Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="you@email.com"
              className="w-full bg-slate-900/60 border border-slate-600 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}

          <Button onClick={handleEmailSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Continue
          </Button>

          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-200 mb-2">✓ How Offline Access Works:</p>
            <ul className="text-[11px] text-emerald-300 space-y-1">
              <li>1. Enter your email once while online to set up</li>
              <li>2. Your PIN is saved locally on this device</li>
              <li>3. Access your vault anytime - no internet needed</li>
              <li>4. Works even if you're logged out of the app</li>
            </ul>
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-200 mb-1">⚠️ First Time Setup</p>
            <p className="text-[11px] text-amber-300">Create a 4-digit PIN to access your vault offline. Remember this PIN - it's stored only on this device.</p>
          </div>

          <PinInput onComplete={handlePINSetup} disabled={isLoading} />

          {isLoading && (
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Saving your PIN...</p>
            </div>
          )}
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <WifiOff className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-200">Offline Mode Active</p>
          </div>

          <p className="text-center text-sm text-slate-300">Enter your 4-digit PIN</p>

          <PinInput onComplete={handlePINVerify} disabled={isLoading} />

          {isLoading && (
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Verifying...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}