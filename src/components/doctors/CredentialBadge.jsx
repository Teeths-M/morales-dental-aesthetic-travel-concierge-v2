import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function CredentialBadge({ doctor }) {
  if (!doctor) return null;

  if (doctor.verification_status === 'verified') {
    const isGov = doctor.verification_method === 'government_registry';
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
        {doctor.credential_verified_date && (
          <span style={{ opacity: 0.75 }}>
            · {new Date(doctor.credential_verified_date).toLocaleDateString()}
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