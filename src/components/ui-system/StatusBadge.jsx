/**
 * StatusBadge
 * 
 * Production-grade status indicator with semantic colour mapping.
 * Covers every status value used across CaseRecord, PartnerVerification,
 * DoctorVerification, SoloCheckIn, PaymentTransaction, and custom strings.
 *
 * Props:
 *   status       {string}  — the raw status string from the DB
 *   label        {string?} — override the display label
 *   size         {'sm'|'md'|'lg'} — default 'md'
 *   dot          {boolean} — show animated dot for active/live states
 *   className    {string?}
 */

import React from 'react';

const STATUS_MAP = {
  // ── Success / Positive ──
  active:             { color: 'emerald', label: 'Active' },
  verified:           { color: 'emerald', label: 'Verified' },
  auto_verified:      { color: 'emerald', label: 'Auto-Verified' },
  completed:          { color: 'emerald', label: 'Completed' },
  confirmed:          { color: 'emerald', label: 'Confirmed' },
  'paid in full':     { color: 'emerald', label: 'Paid In Full' },
  succeeded:          { color: 'emerald', label: 'Succeeded' },
  acknowledged:       { color: 'emerald', label: 'Acknowledged' },
  passed:             { color: 'emerald', label: 'Passed' },
  approved:           { color: 'emerald', label: 'Approved' },

  // ── In Progress / Neutral ──
  pending:            { color: 'amber',   label: 'Pending' },
  manual_review:      { color: 'amber',   label: 'Manual Review' },
  documents_received: { color: 'amber',   label: 'Docs Received' },
  ai_analysis_complete:{ color: 'amber',  label: 'AI Analysed' },
  '25% paid':         { color: 'amber',   label: '25% Paid' },
  '50% paid':         { color: 'amber',   label: '50% Paid' },
  in_progress:        { color: 'blue',    label: 'In Progress' },
  session_created:    { color: 'blue',    label: 'Session Created' },
  processing:         { color: 'blue',    label: 'Processing' },

  // ── Warning / Escalated ──
  escalated_2h:       { color: 'orange',  label: 'Escalated 2h' },
  escalated_3h:       { color: 'orange',  label: 'Escalated 3h' },
  under_review:       { color: 'orange',  label: 'Under Review' },
  suspended:          { color: 'orange',  label: 'Suspended' },
  requires_reverification: { color: 'orange', label: 'Re-verify' },
  escalated:          { color: 'orange',  label: 'Escalated' },
  missed:             { color: 'red',     label: 'Missed' },

  // ── Error / Blocked ──
  denied:             { color: 'red',     label: 'Denied' },
  failed:             { color: 'red',     label: 'Failed' },
  expired:            { color: 'red',     label: 'Expired' },
  blocked:            { color: 'red',     label: 'Blocked' },
  revoked:            { color: 'red',     label: 'Revoked' },
  quarantined:        { color: 'red',     label: 'Quarantined' },
  rejected:           { color: 'red',     label: 'Rejected' },

  // ── Neutral / Inactive ──
  inactive:           { color: 'gray',    label: 'Inactive' },
  archived:           { color: 'gray',    label: 'Archived' },
  resolved:           { color: 'gray',    label: 'Resolved' },
  cancelled:          { color: 'gray',    label: 'Cancelled' },
  draft:              { color: 'gray',    label: 'Draft' },
};

const COLOR_STYLES = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', ring: 'ring-emerald-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   ring: 'ring-amber-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'bg-blue-400',    ring: 'ring-blue-500/20' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  dot: 'bg-orange-400',  ring: 'ring-orange-500/20' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     ring: 'ring-red-500/20' },
  gray:    { bg: 'bg-white/5',        text: 'text-white/40',    dot: 'bg-white/30',    ring: 'ring-white/10' },
};

const SIZE_STYLES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-[11px] px-2.5 py-1 gap-1.5',
  lg: 'text-xs px-3 py-1.5 gap-2',
};

const LIVE_STATUSES = new Set(['active', 'in_progress', 'processing', 'session_created']);

export default function StatusBadge({ status = '', label, size = 'md', dot = true, className = '' }) {
  const key = status.toLowerCase().replace(/-/g, '_');
  const config = STATUS_MAP[key] || { color: 'gray', label: status || '—' };
  const styles = COLOR_STYLES[config.color];
  const displayLabel = label || config.label;
  const isLive = LIVE_STATUSES.has(key);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ring-1 ${styles.bg} ${styles.text} ${styles.ring} ${SIZE_STYLES[size]} ${className}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {dot && (
        <span className="relative flex-shrink-0" style={{ width: size === 'lg' ? 7 : 6, height: size === 'lg' ? 7 : 6 }}>
          <span className={`absolute inset-0 rounded-full ${styles.dot} ${isLive ? 'animate-ping opacity-75' : ''}`} />
          <span className={`relative block rounded-full ${styles.dot}`} style={{ width: '100%', height: '100%' }} />
        </span>
      )}
      {displayLabel}
    </span>
  );
}