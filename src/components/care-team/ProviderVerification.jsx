import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import TrustTimeline from './TrustTimeline';

/**
 * ProviderVerification — the spec's Provider Trust Profile module. Shows
 * real facts (legal identity, license number/authority/last verified date,
 * facility/accreditation, price, cancellation policy, escalation contact,
 * source links) instead of a vague badge. Fed by getProviderTrustProfile.
 */

const STATUS_META = {
  verified: { label: 'Verified', color: '#22C55E', Icon: ShieldCheck },
  pending_verification: { label: 'Pending verification', color: '#D4AF37', Icon: ShieldQuestion },
  not_available: { label: 'Not available', color: '#DC2626', Icon: ShieldAlert },
};

export default function ProviderVerification({ doctorId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!doctorId) return;
    setLoading(true);
    base44.functions.invoke('getProviderTrustProfile', { doctor_id: doctorId })
      .then((res) => { if (!cancelled) setProfile(res?.data || res); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctorId]);

  if (loading) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading provider verification…</div>;
  }
  if (!profile) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Provider verification isn't available right now.</div>;
  }

  const meta = STATUS_META[profile.trust_status] || STATUS_META.not_available;

  const Row = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ color: '#fff', textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <meta.Icon size="18" color={meta.color} />
        <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
      </div>

      {!profile.can_book && profile.booking_notes?.length > 0 && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#FCA5A5' }}>
          {profile.booking_notes.join(' ')}
        </div>
      )}

      <Row label="Legal business" value={profile.identity?.legal_business_name} />
      <Row label="Country" value={profile.identity?.legal_business_country} />
      <Row label="Specialty" value={profile.identity?.specialty} />
      <Row label="License number" value={profile.license?.number} />
      <Row label="License authority" value={profile.license?.authority} />
      <Row label="Last verified" value={profile.license?.last_verified_at ? new Date(profile.license.last_verified_at).toLocaleDateString() : null} />
      <Row label="Clinic" value={[profile.facility?.clinic_name, profile.facility?.clinic_city].filter(Boolean).join(', ')} />
      <Row label="Languages" value={(profile.languages || []).join(', ')} />
      <Row label="Consultation price" value={profile.consultation?.price_amount ? `${profile.consultation.price_currency} ${profile.consultation.price_amount}` : null} />
      <Row label="Cancellation policy" value={profile.consultation?.cancellation_policy} />
      <Row label="Escalation contact" value={profile.escalation?.contact_email || profile.escalation?.contact_name} />

      {profile.source_links?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {profile.source_links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: '#D4AF37', marginBottom: 4 }}>
              {l.label || l.url}
            </a>
          ))}
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.35)' }}>
        {profile.disclosure}
      </p>

      <button
        type="button"
        onClick={() => setShowTimeline((v) => !v)}
        style={{ marginTop: 12, background: 'none', border: 'none', color: '#D4AF37', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        {showTimeline ? 'Hide verification history' : 'Show verification history'}
      </button>
      {showTimeline && <div style={{ marginTop: 10 }}><TrustTimeline doctorId={doctorId} /></div>}
    </div>
  );
}
