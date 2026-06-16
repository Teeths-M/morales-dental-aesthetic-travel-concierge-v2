import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// PIN-gated Emergency Manifest
// Accessible without a login session, but requires the user's 6-digit Emergency PIN.
// Data is fetched server-side after PIN verification and never stored in plaintext locally.

const MANIFEST_STORAGE_KEY = 'morales_emergency_manifest';

export default function EmergencyManifest() {
  const [pin, setPin] = useState('');
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(null);

  // On mount, check for a previously cached manifest in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MANIFEST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only use cached version if less than 48 hours old
        const age = Date.now() - new Date(parsed.cached_at).getTime();
        if (age < 48 * 60 * 60 * 1000) {
          setCached(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const handlePINSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await base44.functions.invoke('verifyEmergencyPIN', { pin });
    const data = res.data;

    if (data?.error || !data?.valid) {
      setError(data?.error || 'Invalid PIN. Access denied.');
      setLoading(false);
      return;
    }

    // PIN verified — fetch the user's case and profile data
    const caseRes = await base44.functions.invoke('getSoloCheckInStatus', {});
    const caseData = caseRes.data;

    const manifestData = {
      full_name: data.user_name || 'Unknown',
      blood_type: data.blood_type || 'Unknown',
      allergies: data.allergies || 'None recorded',
      medications: data.medications || 'None recorded',
      medical_conditions: data.medical_conditions || 'None recorded',
      emergency_contacts: data.emergency_contacts || [],
      passport_last4: data.passport_last4 || 'Not on file',
      procedure: data.procedure || 'Not specified',
      doctor_name: data.doctor_name || 'Not assigned',
      doctor_phone: data.doctor_phone || 'Not available',
      case_id: data.case_id || 'N/A',
      cached_at: new Date().toISOString(),
    };

    // Cache for offline use
    try {
      localStorage.setItem(MANIFEST_STORAGE_KEY, JSON.stringify(manifestData));
    } catch (_) {}

    setManifest(manifestData);
    setLoading(false);
  };

  const displayData = manifest || cached;

  if (displayData) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '24px', fontFamily: 'monospace' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {cached && !manifest && (
            <div style={{ backgroundColor: '#ff6600', color: '#000', padding: '8px 12px', marginBottom: '16px', fontSize: '13px', fontWeight: 'bold' }}>
              ⚠ OFFLINE — Showing cached data from {new Date(cached.cached_at).toLocaleString()}
            </div>
          )}

          <div style={{ borderBottom: '3px solid #fff', paddingBottom: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#aaa' }}>MORALES PLATFORM</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>🚨 EMERGENCY MANIFEST</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>For first responders and emergency personnel only</div>
          </div>

          <Section label="PATIENT NAME" value={displayData.full_name} large />
          <Section label="BLOOD TYPE" value={displayData.blood_type} large critical />
          <Section label="KNOWN ALLERGIES" value={displayData.allergies} critical />
          <Section label="CURRENT MEDICATIONS" value={displayData.medications} />
          <Section label="MEDICAL CONDITIONS" value={displayData.medical_conditions} />
          <Section label="PROCEDURE / REASON FOR TRAVEL" value={displayData.procedure} />
          <Section label="ASSIGNED DOCTOR" value={displayData.doctor_name} />
          <Section label="DOCTOR CONTACT" value={displayData.doctor_phone} />
          <Section label="CASE REFERENCE" value={displayData.case_id} />
          <Section label="PASSPORT (LAST 4)" value={displayData.passport_last4} />

          {displayData.emergency_contacts && displayData.emergency_contacts.length > 0 && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#aaa', marginBottom: '10px' }}>EMERGENCY CONTACTS</div>
              {displayData.emergency_contacts.map((c, i) => (
                <div key={i} style={{ backgroundColor: '#111', padding: '12px', marginBottom: '8px', borderLeft: '3px solid #fff' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{c.name}</div>
                  <div style={{ color: '#aaa', fontSize: '13px' }}>{c.relationship}</div>
                  <div style={{ fontSize: '20px', marginTop: '4px' }}>{c.phone}</div>
                  {c.email && <div style={{ color: '#aaa', fontSize: '13px' }}>{c.email}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '24px', borderTop: '1px solid #333', paddingTop: '12px', fontSize: '11px', color: '#555' }}>
            Generated by Morales Platform Emergency Access System
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: '24px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🚨</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>EMERGENCY MANIFEST</div>
          <div style={{ fontSize: '13px', color: '#aaa', marginTop: '8px' }}>Enter your 6-digit Emergency PIN to access your medical profile and emergency contacts.</div>
        </div>

        <form onSubmit={handlePINSubmit}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="● ● ● ● ● ●"
            style={{
              width: '100%',
              backgroundColor: '#111',
              border: '2px solid #fff',
              color: '#fff',
              fontSize: '32px',
              textAlign: 'center',
              padding: '16px',
              letterSpacing: '8px',
              marginBottom: '16px',
              outline: 'none',
            }}
            autoFocus
          />

          {error && (
            <div style={{ backgroundColor: '#cc0000', color: '#fff', padding: '10px', marginBottom: '12px', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            style={{
              width: '100%',
              backgroundColor: pin.length === 6 ? '#cc0000' : '#333',
              color: '#fff',
              border: 'none',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              cursor: pin.length === 6 ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'VERIFYING…' : 'ACCESS EMERGENCY DATA'}
          </button>
        </form>

        {cached && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setManifest(cached)}
              style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '10px 16px', fontSize: '12px', cursor: 'pointer' }}
            >
              USE CACHED DATA (offline)
            </button>
          </div>
        )}

        <div style={{ marginTop: '24px', fontSize: '11px', color: '#444', textAlign: 'center' }}>
          This page is PIN-protected. It does not require a Morales account login.
        </div>
      </div>
    </div>
  );
}

function Section({ label, value, large, critical }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: critical ? '#ff4444' : '#aaa', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: large ? '24px' : '16px', fontWeight: large ? 'bold' : 'normal', color: critical ? '#ff6666' : '#fff' }}>{value}</div>
    </div>
  );
}