/**
 * InlineAlert
 *
 * Contextual inline alert for forms, dashboards, and status panels.
 * Not a toast — sits in the document flow, not floating.
 *
 * Props:
 *   variant    {'info'|'success'|'warning'|'error'}  — default 'info'
 *   title      {string?}
 *   message    {string|ReactNode}
 *   onDismiss  {() => void?}   — shows × if provided
 *   actions    {ReactNode?}    — inline action buttons
 *   icon       {LucideIcon?}   — override default icon
 *   className  {string?}
 */

import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

const VARIANT_CONFIG = {
  info:    { icon: Info,          bg: 'bg-blue-500/[0.08]',   border: 'border-blue-500/25',   text: 'text-blue-300',   title: 'text-blue-200' },
  success: { icon: CheckCircle2,  bg: 'bg-emerald-500/[0.08]',border: 'border-emerald-500/25',text: 'text-emerald-300',title: 'text-emerald-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/[0.08]',  border: 'border-amber-500/25',  text: 'text-amber-300',  title: 'text-amber-200' },
  error:   { icon: XCircle,       bg: 'bg-red-500/[0.08]',    border: 'border-red-500/25',    text: 'text-red-300',    title: 'text-red-200' },
};

export default function InlineAlert({
  variant = 'info',
  title,
  message,
  onDismiss,
  actions,
  icon: CustomIcon,
  className = '',
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
  const IconComp = CustomIcon || config.icon;

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-xl border p-4 ${config.bg} ${config.border} ${className}`}
    >
      <IconComp className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.text}`} strokeWidth={1.75} />

      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold mb-0.5 ${config.title}`}>{title}</p>
        )}
        {message && (
          <p className={`text-xs leading-relaxed ${config.text} opacity-80`}>{message}</p>
        )}
        {actions && (
          <div className="mt-2.5 flex items-center gap-2">{actions}</div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-0.5 rounded transition-opacity opacity-40 hover:opacity-80 ${config.text}`}
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}