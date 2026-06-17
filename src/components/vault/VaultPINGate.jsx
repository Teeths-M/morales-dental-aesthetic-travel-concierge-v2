import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { BRAND } from '@/lib/brandTokens';

export default function VaultPINGate({ onPINVerified, hasExistingPIN }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSettingPIN, setIsSettingPIN] = useState(!hasExistingPIN);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const confirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (inputRefs[0].current) inputRefs[0].current.focus();
  }, []);

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
    try {
      const response = await base44.functions.invoke('verifyVaultPIN', {
        pin: pinString,
        action: 'verify'
      });

      if (response.data.valid) {
        onPINVerified();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin(['', '', '', '']);
        inputRefs[0]?.current?.focus();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
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
      await base44.functions.invoke('verifyVaultPIN', {
        pin: pinString,
        action: 'set'
      });
      onPINVerified();
    } catch (err) {
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
            className="w-14 h-16 text-center text-2xl font-bold bg-white/10 border-white/20 text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            maxLength={1}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-blue-900 flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
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

        <div className="mt-6 text-center">
          <p className="text-white/50 text-xs">
            <Lock className="w-3 h-3 inline mr-1" />
            Your PIN is securely hashed and never stored in plain text
          </p>
        </div>
      </div>
    </motion.div>
  );
}