/**
 * EmptyState
 *
 * Production-grade empty state for lists, tables, and data views.
 * Handles icon, title, message, and action button with consistent styling.
 *
 * Props:
 *   icon     {ReactNode?}  — Custom icon (defaults to Inbox)
 *   title    {string?}     — Empty state title
 *   message  {string?}     — Descriptive message
 *   action   {ReactNode?}  — CTA button
 *   dark     {boolean?}    — Dark theme variant (default true)
 *   className{string?}
 */

import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ 
  icon, 
  title = 'No data yet', 
  message, 
  action, 
  dark = true,
  className = '' 
}) {
  const Icon = icon || Inbox;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
        dark ? 'bg-white/[0.04] border border-white/[0.06] text-white/20' : 'bg-muted border border-border text-muted-foreground/40'
      }`}>
        {React.isValidElement(Icon) ? Icon : <Icon className="w-7 h-7" />}
      </div>
      
      <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white/60' : 'text-foreground/70'}`}>
        {title}
      </p>
      
      {message && (
        <p className={`text-xs max-w-xs mb-4 ${dark ? 'text-white/30' : 'text-muted-foreground'}`}>
          {message}
        </p>
      )}
      
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}