import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Loader2, CheckCircle2, Stethoscope, Plane, Car, ShieldCheck } from 'lucide-react';

const GOLD = '#D4AF37';

const TYPE_ICON = {
  doctor: Stethoscope,
  travel_agency: Plane,
  taxi: Car,
  security: Shield,
  companion: ShieldCheck,
};

const STATUS_COLOR = {
  pending: 'rgba(255,255,255,0.4)',
  verifying: GOLD,
  verified: '#34d399',
  already_in_network: '#34d399',
  rejected: '#f87171',
};

const STATUS_LABEL = {
  pending: 'Queued',
  verifying: 'Verifying',
  verified: 'Verified',
  already_in_network: 'In your network',
  rejected: 'Could not verify',
};

/**
 * EcosystemStatusBanner — surfaces M-Care's "always watching" safety net on
 * the dashboard. Shows the patient's personal provider network (BYO partners)
 * and the active verification pipeline, so silence from M-Care reads as
 * watchfulness, not inactivity.
 */
export default function EcosystemStatusBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ['ecosystemStatus'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEcosystemStatus', {});
      return res?.data || res;
    },
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5"
        style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Checking your care network…
        </span>
      </div>
    );
  }

  const providers = data?.providers || [];
  const activeInvites = data?.active_invites || 0;
  const verifiedCount = data?.verified_count || 0;

  // Headline state: what is M-Care doing right now for this patient?
  const isVerifying = activeInvites > 0;
  const hasNetwork = verifiedCount > 0;

  const headline = isVerifying
    ? `M-Care is verifying ${activeInvites} provider${activeInvites > 1 ? 's' : ''} for you right now`
    : hasNetwork
      ? `Your care network is active — ${verifiedCount} verified provider${verifiedCount > 1 ? 's' : ''}`
      : 'M-Care is always searching and verifying providers for you';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0C1A1D', border: '1px solid #2A3F4A' }}>
      {/* Headline strip */}
      <div className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: providers.length ? '1px solid #1e2d35' : 'none' }}>
        <div className="relative">
          <Shield className="w-4 h-4" style={{ color: GOLD }} />
          {isVerifying && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
              style={{ background: GOLD }} />
          )}
        </div>
        <span className="text-xs font-medium text-white/90">{headline}</span>
      </div>

      {/* Provider chips */}
      {providers.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {providers.slice(0, 6).map((p) => {
            const Icon = TYPE_ICON[p.provider_type] || Shield;
            const color = STATUS_COLOR[p.verification_status] || 'rgba(255,255,255,0.4)';
            return (
              <div key={p.id}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}30` }}>
                <Icon className="w-3 h-3" style={{ color }} />
                <span className="text-[11px] font-medium text-white/80">{p.provider_name}</span>
                <span className="text-[10px]" style={{ color }}>
                  {STATUS_LABEL[p.verification_status] || p.verification_status}
                </span>
              </div>
            );
          })}
          {providers.length > 6 && (
            <span className="text-[11px] self-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              +{providers.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Empty-state reassurance */}
      {providers.length === 0 && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Add your own doctor, driver, or travel agent and M-Care will verify them for you.
          </span>
        </div>
      )}
    </div>
  );
}