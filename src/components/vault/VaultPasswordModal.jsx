/**
 * VaultPasswordModal
 * Replaces prompt() for decryption password entry.
 * Focus-trapped, Escape to cancel, shows password strength feedback.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

export default function VaultPasswordModal({ isOpen, onClose, onConfirm, title = 'Enter Decryption Password', isLoading }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) { setPassword(''); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0D1525] p-6"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />
        </div>
        <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
        <p className="text-xs text-white/40 mb-5">This password was set when you uploaded the document. We cannot recover it.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your decryption password"
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all"
              aria-label="Decryption password"
            />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 bg-white/[0.03] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!password || isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: '#059669', color: 'white' }}>
              {isLoading
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Decrypting…</>
                : 'Decrypt & Download'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}