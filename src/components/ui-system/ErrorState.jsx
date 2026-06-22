/**
 * ErrorState
 *
 * Full-section error display with optional retry. Never exposes raw
 * stack traces — pass a human-readable message.
 *
 * Props:
 *   title       {string?}    — default 'Something went wrong'
 *   message     {string?}    — user-safe description
 *   onRetry     {() => void?} — shows a Retry button when provided
 *   retrying    {boolean?}   — disables retry + shows spinner
 *   dark        {boolean?}   — default true
 *   className   {string?}
 */
import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this content. Please try again.',
  onRetry,
  retrying = false,
  dark = true,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        dark ? 'bg-red-500/[0.08] border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-500'
      }`}>
        <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
      </div>

      <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white/80' : 'text-foreground'}`}>{title}</p>
      <p className={`text-xs max-w-sm mb-5 ${dark ? 'text-white/35' : 'text-muted-foreground'}`}>{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
            dark ? 'bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.08]' : 'bg-muted hover:bg-muted/70 text-foreground border border-border'
          }`}
          aria-label="Retry loading"
        >
          <RotateCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}