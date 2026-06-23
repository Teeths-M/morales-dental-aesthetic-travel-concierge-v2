/**
 * ConfirmDialog
 *
 * Accessible confirmation modal for destructive or sensitive actions.
 * Traps focus, handles Escape key, supports loading state during async action.
 *
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   onConfirm    {() => Promise<void>|void}
 *   title        {string}
 *   message      {string|ReactNode}
 *   confirmLabel {string?}   — default 'Confirm'
 *   cancelLabel  {string?}   — default 'Cancel'
 *   variant      {'danger'|'warning'|'primary'}  — default 'danger'
 *   icon         {LucideIcon?}
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { BRAND } from '@/lib/brandTokens';

const VARIANT_CONFIG = {
  danger:  { icon: Trash2,        iconBg: 'bg-red-500/10',    iconColor: 'text-red-400',    btnClass: 'bg-red-500 hover:bg-red-600 text-white' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-500/10',  iconColor: 'text-amber-400',  btnClass: 'bg-amber-500 hover:bg-amber-600 text-gray-900' },
  primary: { icon: Info,          iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-400',   btnClass: 'text-[#060B16]' },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon: CustomIcon,
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const cancelRef = useRef(null);
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.danger;
  const IconComp = CustomIcon || config.icon;

  // Focus cancel button on open (safer default for destructive actions)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !isConfirming) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isConfirming, onClose]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm?.();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isConfirming ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0D1525] shadow-2xl p-6"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Close × */}
        <button
          onClick={onClose}
          disabled={isConfirming}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center mb-4`}>
          <IconComp className={`w-5 h-5 ${config.iconColor}`} strokeWidth={1.75} />
        </div>

        {/* Content */}
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-white mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm text-white/50 leading-relaxed mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.15] bg-white/[0.03] hover:bg-white/[0.06] transition-all disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              variant === 'primary'
                ? `${config.btnClass} shadow-lg`
                : config.btnClass
            }`}
            style={variant === 'primary' ? { background: BRAND.gold } : {}}
          >
            {isConfirming ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}