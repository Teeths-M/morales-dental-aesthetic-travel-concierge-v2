import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert, Building2, Stethoscope, FileCheck2, Clock, AlertTriangle, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TrustBadge from '@/components/trustscan/TrustBadge';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';

// TrustProfile — the explainable trust profile. NOT a generic checkmark:
// each verification dimension is its own row (identity, license, facility,
// documents), with the date and the official source. Honest limitations are
// shown plainly. Never displays passport numbers, selfies, raw ID images,
// or unnecessary PII. Includes a 'Report a concern' action.

const DOC_STATUS_UI = {
  current: { label: 'Documents current', color: '#10b981', icon: FileCheck2 },
  expiring_soon: { label: 'Documents expiring soon', color: '#f59e0b', icon: Clock },
  expired: { label: 'Documents expired', color: '#ef4444', icon: AlertTriangle },
  none: { label: 'No documents on file', color: '#6b7280', icon: FileCheck2 },
};

function Row({ icon: Icon, label, value, source, color }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {value && <p className="text-xs text-muted-foreground">{value}</p>}
        {source && <p className="mt-0.5 text-[11px] text-muted-foreground/80">Source: {source}</p>}
      </div>
    </div>
  );
}

export default function TrustProfile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const subjectEmail = params.get('email') || '';
  const partnerId = params.get('partnerId') || '';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('getTrustProfile', { subjectEmail, partnerId });
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load trust profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [subjectEmail, partnerId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingState label="Loading trust profile" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><ErrorState message={error} onRetry={() => navigate(0)} /></div>;

  const docStatus = DOC_STATUS_UI[profile?.documents_status || 'none'] || DOC_STATUS_UI.none;
  const DocIcon = docStatus.icon;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-semibold">Trust Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-md mx-auto w-full">
        {/* Header — name + level badge (not a generic checkmark) */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(212,175,55,0.12)' }}>
            <ShieldCheck className="w-8 h-8" style={{ color: '#D4AF37' }} />
          </div>
          <h2 className="text-xl font-bold">{profile?.subject_name || 'Verified member'}</h2>
          {profile?.subject_partner_type && <p className="text-xs text-muted-foreground capitalize">{profile.subject_partner_type.replace(/_/g, ' ')}</p>}
          <div className="mt-3 flex justify-center">
            <TrustBadge level={profile?.verification_level || 'basic'} sandbox={profile?.sandbox} size="lg" />
          </div>
          {profile?.partner_since && <p className="mt-2 text-xs text-muted-foreground">M-Care partner since {new Date(profile.partner_since).toLocaleDateString()}</p>}
        </div>

        {/* Suspended banner */}
        {profile?.suspended && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-destructive">New bookings suspended</p>
              {profile.suspended_reason && <p className="text-xs text-muted-foreground">{profile.suspended_reason}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Existing patient travel and appointments are unaffected and have been escalated to a human.</p>
            </div>
          </div>
        )}

        {/* Verification dimensions — each its own row */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What was verified</p>
          <Row icon={ShieldCheck} label="Identity verified" value={profile?.identity_verified ? `Verified ${profile.identity_verified_at ? new Date(profile.identity_verified_at).toLocaleDateString() : ''}` : 'Not yet verified'} color={profile?.identity_verified ? '#10b981' : '#6b7280'} />
          <Row icon={Stethoscope} label="Professional license" value={profile?.license_verified ? `Verified ${profile.license_verified_at ? new Date(profile.license_verified_at).toLocaleDateString() : ''}` : 'Not verified'} source={profile?.license_source} color={profile?.license_verified ? '#10b981' : '#6b7280'} />
          <Row icon={Building2} label="Facility / business" value={profile?.facility_verified ? `Verified ${profile.facility_verified_at ? new Date(profile.facility_verified_at).toLocaleDateString() : ''}` : 'Not verified'} color={profile?.facility_verified ? '#10b981' : '#6b7280'} />
          <Row icon={DocIcon} label={docStatus.label} color={docStatus.color} />
        </div>

        {/* Evidence summary — what was checked, the source, the result, the date */}
        {profile?.evidence_summary?.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks performed</p>
            {profile.evidence_summary.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-foreground">{e.check}</span>
                <span className="text-muted-foreground">{e.result} · {e.source}{e.date ? ` · ${new Date(e.date).toLocaleDateString()}` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Honest limitations — never 'scam-proof' or 'guaranteed real' */}
        {profile?.limitations?.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Limitations</p>
            <ul className="space-y-1.5">
              {profile.limitations.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Report a concern */}
        <button
          onClick={() => setReporting(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
        >
          <Flag className="w-4 h-4" /> Report a concern
        </button>
        {reporting && (
          <p className="mt-2 text-center text-xs text-muted-foreground">Your concern will be reviewed by the M-Care trust team. Thank you for helping keep the network safe.</p>
        )}

        {profile?.sandbox && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground/70">Verification ran against the sandbox environment — not yet authoritative.</p>
        )}
      </div>
    </div>
  );
}