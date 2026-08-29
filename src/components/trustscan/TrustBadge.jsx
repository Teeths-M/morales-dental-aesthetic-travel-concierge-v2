import React from 'react';
import { ShieldCheck, BadgeCheck, Building2, Stethoscope } from 'lucide-react';

// TrustBadge — a verification-level badge, NOT a generic checkmark. Each
// of the four tiers has its own icon + label so a patient can tell
// "Identity Verified" apart from "Medical Provider Approved". Never one
// "Verified" stamp for everything.
const LEVELS = {
  basic: { label: 'Basic', icon: BadgeCheck, color: '#6b7280', desc: 'Email & phone verified' },
  identity_verified: { label: 'Identity Verified', icon: ShieldCheck, color: '#D4AF37', desc: 'Document + active liveness' },
  partner_verified: { label: 'Partner Verified', icon: Building2, color: '#D4AF37', desc: 'Business verified' },
  medical_provider_approved: { label: 'Medical Provider Approved', icon: Stethoscope, color: '#10b981', desc: 'License + human review' },
};

export default function TrustBadge({ level = 'basic', sandbox = false, size = 'sm', onClick = null }) {
  const cfg = LEVELS[level] || LEVELS.basic;
  const Icon = cfg.icon;
  const padX = size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1';
  const text = size === 'lg' ? 'text-xs' : 'text-[11px]';
  const iconSize = size === 'lg' ? 14 : 12;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border ${padX} ${text} font-semibold ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ borderColor: `${cfg.color}55`, color: cfg.color, background: `${cfg.color}12` }}
      title={`${cfg.label} — ${cfg.desc}${sandbox ? ' (sandbox)' : ''}`}
    >
      <Icon size={iconSize} />
      {cfg.label}
      {sandbox && <span className="opacity-70 font-normal">· sandbox</span>}
    </span>
  );
}