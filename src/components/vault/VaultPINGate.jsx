import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { generatePINHash, verifyPIN } from '@/lib/vaultPINHashing';
import ForgotPIN from '@/components/emergency/ForgotPIN';

export default function VaultPINGate({ onPINVerified, hasExistingPIN, user }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSettingPIN, setIsSettingPIN] = useState(hasExistingPIN === false);
  const [showForgotPIN, setShowForgotPIN] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (inputRefs[0].current) inputRefs[0].current.focus();
    
    // Store user email in localStorage for offline PIN verification
    if (user?.email) {
      localStorage.setItem('morales_user_email', user.email.toLowerCase());
    }
  }, []);

  useEffect(() => {
    if (hasExistingPIN !== undefined) {
      setIsSettingPIN(hasExistingPIN === false);
    }
  }, [hasExistingPIN]);

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');
    
    if (value && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleConfirmChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newConfirm = [...confirmPin];
    newConfirm[index] = value;
    setConfirmPin(newConfirm);
    setError('');
    
    if (value && index < 3) {
      confirmRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleVerifyPIN = async () => {
    const pinString = pin.join('');
    if (pinString.length !== 4) {
      setError('Please enter a complete 4-digit PIN');
      return;
    }

    setLoading(true);
    
    const userEmail = localStorage.getItem('morales_user_email') || user?.email;
    
    // OFFLINE-FIRST: If offline or no email, verify locally immediately
    if (!navigator.onLine || !userEmail) {
      const storedHash = localStorage.getItem(`vault_pin_hash_${userEmail?.toLowerCase()}`);
      const storedSalt = localStorage.getItem(`vault_pin_salt_${userEmail?.toLowerCase()}`);
      
      if (!storedHash || !storedSalt) {
        setError('No PIN found. Please set a new PIN.');
        setIsSettingPIN(true);
        setLoading(false);
        return;
      }
      
      const isValid = await verifyPIN(pinString, storedSalt, storedHash);
      
      if (isValid) {
        onPINVerified();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin(['', '', '', '']);
        inputRefs[0]?.current?.focus();
      }
      setLoading(false);
      return;
    }
    
    // ONLINE: Try server with 2s timeout, then fallback to local
    const serverPromise = base44.functions.invoke('verifyVaultPIN', {
      pin: pinString,
      action: 'verify'
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Server timeout')), 2000)
    );
    
    try {
      const response = await Promise.race([serverPromise, timeoutPromise]);
      
      if (response.data.valid) {
        onPINVerified();
      } else if (response.data.error === 'No PIN set') {
        setIsSettingPIN(true);
        setError('No PIN found. Please set a new PIN.');
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin(['', '', '', '']);
        inputRefs[0]?.current?.focus();
      }
    } catch (serverErr) {
      // Server failed or timed out - fallback to local verification
      console.warn('Server verification failed/timed out, using local:', serverErr);
      const storedHash = localStorage.getItem(`vault_pin_hash_${userEmail.toLowerCase()}`);
      const storedSalt = localStorage.getItem(`vault_pin_salt_${userEmail.toLowerCase()}`);
      
      if (storedHash && storedSalt) {
        const isValid = await verifyPIN(pinString, storedSalt, storedHash);
        if (isValid) {
          onPINVerified();
        } else {
          setError('Incorrect PIN. Please try again.');
          setPin(['', '', '', '']);
          inputRefs[0]?.current?.focus();
        }
      } else {
        setError('Network error and no local PIN found.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPIN = async () => {
    const pinString = pin.join('');
    const confirmString = confirmPin.join('');

    if (pinString.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pinString !== confirmString) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      // Generate salt and hash client-side
      const userEmail = localStorage.getItem('morales_user_email') || user?.email;
      if (!userEmail) {
        setError('User email not found. Please log in again.');
        setLoading(false);
        return;
      }

      const { salt, hash } = await generatePINHash(pinString, userEmail);
      
      // Store hash and salt in localStorage for offline verification
      localStorage.setItem(`vault_pin_hash_${userEmail.toLowerCase()}`, hash);
      localStorage.setItem(`vault_pin_salt_${userEmail.toLowerCase()}`, salt);
      
      // Also sync to server if online. If this fails, the PIN only exists in
      // localStorage on this device — hasPIN will still read false from the
      // server on next load, sending the user right back to "Set Vault PIN"
      // (looks like the PIN "isn't saving"). Surface the real error instead
      // of silently letting the user in for one session.
      if (navigator.onLine) {
        try {
          await base44.functions.invoke('verifyVaultPIN', {
            pin: pinString,
            action: 'set'
          });
        } catch (serverErr) {
          console.error('Server PIN sync failed:', serverErr);
          setError(serverErr?.response?.data?.message || serverErr?.response?.data?.error || 'Could not save PIN to server. Please try again.');
          setLoading(false);
          return;
        }
      }

      onPINVerified();
    } catch (err) {
      console.error('PIN setup error:', err);
      setError('Failed to set PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPinInputs = (isConfirm = false) => {
    const values = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmRefs : inputRefs;
    const onChange = isConfirm ? handleConfirmChange : handlePinChange;
    const onKeyDown = isConfirm ? handleKeyDown : handleKeyDown;

    return (
      <div className="flex gap-3 justify-center mb-6">
        {values.map((digit, index) => (
          <Input
            key={index}
            ref={refs[index]}
            type="text"
            inputMode="numeric"
            value={digit}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e, isConfirm)}
            className="w-14 h-16 text-center text-2xl font-semibold bg-white/10 border-white/20 text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            maxLength={1}
          />
        ))}
      </div>
    );
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-blue-900 flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
        {!showForgotPIN && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {showForgotPIN ? (
          <ForgotPIN
            userEmail={localStorage.getItem('morales_user_email') || user?.email || ''}
            pinType="vault"
            onBack={() => setShowForgotPIN(false)}
          />
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
                {isSettingPIN ? 'Set Vault PIN' : 'Enter Vault PIN'}
              </h1>
              <p className="text-white/70 text-sm">
                {isSettingPIN
                  ? 'Create a 4-digit PIN to protect your vault'
                  : 'Enter your PIN to access your documents'}
              </p>
            </div>

            {renderPinInputs(false)}

            {isSettingPIN && (
              <>
                <p className="text-white/70 text-sm text-center mb-3">Confirm PIN</p>
                {renderPinInputs(true)}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-300 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={isSettingPIN ? handleSetPIN : handleVerifyPIN}
              disabled={loading || pin.some(d => d === '') || (isSettingPIN && confirmPin.some(d => d === ''))}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : isSettingPIN ? (
                'Set PIN'
              ) : (
                'Unlock Vault'
              )}
            </Button>

            {!isSettingPIN && (
              <button
                onClick={() => { setError(''); setShowForgotPIN(true); }}
                className="w-full text-center text-sm text-emerald-300 hover:text-emerald-200 mt-4 transition-colors"
              >
                Forgot PIN?
              </button>
            )}

            <div className="mt-6 text-center">
              <p className="text-white/50 text-xs">
                <Lock className="w-3 h-3 inline mr-1" />
                {navigator.onLine
                  ? 'Your PIN is securely hashed (PBKDF2) and never stored in plain text'
                  : 'Offline Mode: Verifying against local secure hash'}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}