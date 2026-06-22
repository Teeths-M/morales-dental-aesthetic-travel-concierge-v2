/**
 * AccessDenied
 *
 * Standard "you don't have permission" state for guarded sections.
 * Use inside a page when a sub-area is role-gated (route-level guarding
 * still lives in ProtectedRoute — this is for in-page partial denial).
 *
 * Props:
 *   title       {string?}   — default 'Access not available'
 *   message     {string?}
 *   dark        {boolean?}  — default true
 *   className   {string?}
 */
import React from 'react';
import { ShieldX } from 'lucide-react';

export default function AccessDenied({
  title = 'Access not available',
  message = 'Your account does not have permission to view this section.',
  dark = true,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        dark ? 'bg-white/[0.04] border border-white/[0.06] text-white/30' : 'bg-muted border border-border text-muted-foreground/50'
      }`}>
        <ShieldX className="w-6 h-6" strokeWidth={1.75} />
      </div>
      <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white/70' : 'text-foreground'}`}>{title}</p>
      <p className={`text-xs max-w-sm ${dark ? 'text-white/30' : 'text-muted-foreground'}`}>{message}</p>
    </div>
  );
}