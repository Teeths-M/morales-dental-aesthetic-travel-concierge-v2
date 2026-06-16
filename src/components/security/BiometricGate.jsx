import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Eye, Lock, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 3;

export default function BiometricGate({ children }) {
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [method, setMethod] = useState(null); // 'biometric' | 'pin'
  const [pin, setPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(null);
  const [supported, setSupported] = useState(false);

  // Check WebAuthn support
  useEffect(() => {
    setSupported(!!window.PublicKeyCredential && !!navigator.credentials?.get);
  }, []);

  // Idle timer — lock on 5 min inactivity
  useEffect(() => {
    let idleTimer;
    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setLocked(true), IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, []);

  // Lock on tab/window visibility change (background transition)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setLocked(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-logout countdown when max failures reached
  useEffect(() => {
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      let count = 10;
      setAutoLogoutCountdown(count);
      const interval = setInterval(() => {
        count--;
        setAutoLogoutCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          base44.auth.logout('/');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [failedAttempts]);

  const tryBiometric = async () => {
    if (!supported) { setMethod('pin'); return; }
    setAuthenticating(true);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 30000
        }
      });
      if (assertion) { setLocked(false); setFailedAttempts(0); }
      else { handleFailure(); }
    } catch (e) {
      // Biometric not enrolled — fall back to PIN
      setMethod('pin');
    } finally {
      setAuthenticating(false);
    }
  };

  const tryPin = () => {
    // Simple session PIN — stored in sessionStorage, set by user on first lock
    const savedPin = sessionStorage.getItem('morales_session_pin');
    if (!savedPin) {
      // First time — save the entered PIN
      if (pin.length >= 4) {
        sessionStorage.setItem('morales_session_pin', pin);
        setLocked(false);
        setPin('');
        setFailedAttempts(0);
      }
      return;
    }
    if (pin === savedPin) {
      setLocked(false);
      setPin('');
      setFailedAttempts(0);
    } else {
      handleFailure();
      setPin('');
    }
  };

  const handleFailure = () => {
    setFailedAttempts(f => f + 1);
  };

  if (!locked) return children;

  const isMaxed = failedAttempts >= MAX_FAILED_ATTEMPTS;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-xl flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-800"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-16 h-16 bg-emerald-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Session Locked</h2>
          <p className="text-gray-400 text-sm mb-6">
            {isMaxed
              ? `Too many failed attempts. Auto-logout in ${autoLogoutCountdown}s...`
              : 'Verify your identity to continue.'}
          </p>

          {isMaxed ? (
            <div className="space-y-3">
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 text-sm font-semibold">Security lockout active</p>
                <p className="text-red-400 text-xs mt-1">Logging out in {autoLogoutCountdown} seconds...</p>
              </div>
              <Button onClick={() => base44.auth.logout('/')} variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-900/20 rounded-xl">
                Logout Now
              </Button>
            </div>
          ) : method === 'pin' ? (
            <div className="space-y-4">
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && tryPin()}
                placeholder="Enter session PIN"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={8}
                autoFocus
              />
              {failedAttempts > 0 && (
                <p className="text-red-400 text-xs">Incorrect PIN. {MAX_FAILED_ATTEMPTS - failedAttempts} attempt(s) remaining.</p>
              )}
              <Button onClick={tryPin} disabled={pin.length < 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3">
                <Lock className="w-4 h-4 mr-2" /> Unlock
              </Button>
              {supported && (
                <button onClick={() => setMethod(null)} className="text-gray-500 text-xs hover:text-gray-300">
                  Try biometric instead
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {supported && (
                <Button
                  onClick={tryBiometric}
                  disabled={authenticating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 text-base"
                >
                  {authenticating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scanning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" />
                      Use Face ID / Fingerprint
                    </span>
                  )}
                </Button>
              )}
              <Button onClick={() => setMethod('pin')} variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl py-3">
                <Lock className="w-4 h-4 mr-2" /> Use Session PIN
              </Button>
              <button onClick={() => base44.auth.logout('/')} className="text-gray-500 text-xs hover:text-gray-400">
                Logout instead
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}