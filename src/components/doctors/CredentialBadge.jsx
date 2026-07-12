import React from 'react';
import { ShieldCheck } from 'lucide-react';

// All terminal "verified" states set by activateVerifiedDoctor — each should show
// the credential badge + last-verified date so freshness is never hidden.
const VERIFIED_STATES = ['verified', 'manually_approved', 'auto_verified'];

export default function CredentialBadge({ doctor }) {
  if (!doctor) return null;

  if (VERIFIED_STATES.includes(doctor.verification_status)) {
    const isGov = doctor.verification_method === 'government_registry';
    const verifiedDate = doctor.credential_verified_date || doctor.verified_at;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: isGov ? 'rgba(212,168,67,0.12)' : 'rgba(20,148,148,0.12)',
        border: `1px solid ${isGov ? 'rgba(212,168,67,0.4)' : 'rgba(20,148,148,0.4)'}`,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 600,
        color: isGov ? '#b8860b' : '#149494'
      }}>
        <ShieldCheck style={{ width: 12, height: 12 }} />
        {isGov ? 'Gov. Registry Verified' : 'Advisory Team Verified'}
        {verifiedDate && (
          <span style={{ opacity: 0.75 }}>
            · verified {new Date(verifiedDate).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  if (doctor.verification_status === 'pending_manual') {
    return (
      <div style={{ fontSize: 11, color: '#854F0B' }}>
        ⏳ Verification in Progress (est. 48 hours)
      </div>
    );
  }

  if (doctor.verification_status === 'suspended') {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(220,38,38,0.08)',
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 600,
        color: '#dc2626'
      }}>
        ⚠️ Credential Review Required
      </div>
    );
  }

  return null;
}