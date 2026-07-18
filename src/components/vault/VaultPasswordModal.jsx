/**
 * VaultPasswordModal
 * Replaces prompt() for decryption password entry.
 * Focus-trapped, Escape to cancel, shows password strength feedback.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, X, AlertCircle } from 'lucide-react';

export default function VaultPasswordModal({ isOpen, onClose, onConfirm, title = 'Enter Decryption Password', isLoading, error }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const inputRef = useRef(null);

  /* A wrong password used to surface as a browser alert() stacked on top of this
     still-open modal. The failure belongs next to the field that caused it, so
     the patient can correct it without dismissing anything. Hidden as soon as
     they start editing — a stale error under a field they're already fixing
     reads as a second, unrelated failure. */
  const showError = error && !dismissedError;

  useEffect(() => {
    if (isOpen) { setPassword(''); setDismissedError(false); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [isOpen]);

  // A new failure re-shows the message even if the previous one was typed away.
  useEffect(() => { if (error) setDismissedError(false); }, [error]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    onConfirm(password);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0D1525] p-6"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
        <motion.button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}>
          <X className="w-4 h-4" />
        </motion.button>
        <motion.div
          className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <Lock className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />
        </motion.div>
        <motion.h2
          className="text-base font-semibold text-white mb-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="text-xs text-white/40 mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          This password was set when you uploaded the document. We cannot recover it.
        </motion.p>
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setDismissedError(true); }}
              placeholder="Your decryption password"
              className={`w-full bg-white/[0.04] border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 transition-all ${
                showError
                  ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-400/20'
                  : 'border-white/[0.10] focus:border-white/25 focus:ring-white/10'
              }`}
              aria-label="Decryption password"
              aria-invalid={showError ? 'true' : undefined}
              aria-describedby={showError ? 'vault-password-error' : undefined}
            />
            <motion.button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </motion.button>
          </div>
          {showError && (
            <motion.p
              id="vault-password-error"
              role="alert"
              className="flex items-start gap-2 text-xs text-red-300/90 leading-relaxed"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={2} />
              <span>{error}</span>
            </motion.p>
          )}
          <div className="flex gap-3">
            <motion.button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 bg-white/[0.03] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={!password || isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: '#059669', color: 'white' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Decrypting…</>
                : 'Decrypt & Download'}
            </motion.button>
          </div>
        </motion.form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}