import React from 'react';

// Three trust tiers a provider M-Care mentions can honestly be in. Colors
// are deliberately distinct from this app's gold "approved/trusted" accent
// (#D4AF37) for the two lower tiers, so APPROVED visually reads as the one
// that actually matters.
const TIERS = {
  discovered: {
    emoji: '🔎',
    label: 'Discovered on the web',
    detail: 'Found via web search — not yet checked by Morales. Verification is a separate, human step before this provider would ever be recommended for booking.',
    color: '#94A3B8',
  },
  verified: {
    emoji: '🛡️',
    label: 'Verified',
    detail: "License and identity checks passed. Still pending a background check and Morales's final internal review before approval.",
    color: '#38BDF8',
  },
  approved: {
    emoji: '✓',
    label: 'Morales Approved',
    detail: "Completed Morales's full verification pipeline — license, identity, and background checks, plus internal admin review.",
    color: '#D4AF37',
  },
};

// Renders the small trust-tier pill parsed from a {{providerstatus:TIER|Name}}
// token M-Care emits whenever it names a specific provider (see
// MessageBubble.jsx's extractProviderStatus). Real backing data:
// 'discovered' = a discoverProviderCandidates (Tavily) result;
// 'approved' = a matchDoctorsForProcedure result — that tool only ever
// returns doctors who already cleared Morales's full verification pipeline.
// 'verified' (license + identity checks passed, background check still
// pending) is a real, distinct state in Doctor.jsonc's schema, but no
// traveler-facing tool emits it today — M-Care never recommends a doctor
// mid-pipeline to a traveler, by design. This component renders it
// correctly regardless, so it's honest and ready the moment a real
// traveler-facing use for it exists, rather than something built later
// under time pressure.
export default function ProviderStatusBadge({ tier, name }) {
  const config = TIERS[tier];
  if (!config) return null;
  return (
    <div
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: config.color, color: config.color, background: 'rgba(255,255,255,0.03)' }}
      title={config.detail}
    >
      <span>{config.emoji}</span>
      <span>{name ? `${name} — ${config.label}` : config.label}</span>
    </div>
  );
}
