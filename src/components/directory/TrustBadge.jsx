import React from 'react';
import { ShieldCheck } from 'lucide-react';

const BADGE_CONFIG = {
  verified: {
    label: 'SAFE-T Verified',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
  },
  manually_approved: {
    label: 'Admin Verified',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  pending_verification: {
    label: 'Pending Review',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'text-amber-600',
  },
  default: {
    label: 'Unverified',
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
    icon: 'text-slate-400',
  },
};

export default function TrustBadge({ status, size = 'sm' }) {
  const config = BADGE_CONFIG[status] || BADGE_CONFIG.default;
  const isSmall = size === 'sm';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${config.bg} ${config.text} ${config.border} ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
      <ShieldCheck className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.icon}`} />
      {config.label}
    </span>
  );
}