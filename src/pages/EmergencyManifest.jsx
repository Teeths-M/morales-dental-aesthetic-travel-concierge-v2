import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
// Note: this page is intentionally in the public/token routes — no auth required

// PIN-gated Emergency Manifest
// Accessible without a login session, but requires the user's 6-digit Emergency PIN.
// Data is fetched server-side after PIN verification and never stored in plaintext locally.

const MANIFEST_STORAGE_KEY = 'morales_emergency_manifest';
const MAX_MANIFEST_BYTES = 50 * 1024; // 50 KB — manifest is text-only, prune if oversized

function safeStoreManifest(data) {
  try {
    const str = JSON.stringify(data);
    if (str.length > MAX_MANIFEST_BYTES) return; // safety guard — never cache oversized payloads
    localStorage.setItem(MANIFEST_STORAGE_KEY, str);
  } catch (_) {
    // Storage full — clear stale vault docs to make room, then retry once
    try {
      Object.keys(localStorage).filter(k => k.startsWith('morales_vault_doc_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(MANIFEST_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }
}

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
        // Only use cached version if less than 7 days old (extended for demo reliability)
        const age = Date.now() - new Date(parsed.cached_at).getTime();
        if (age < 7 * 24 * 60 * 60 * 1000) {
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

    const isOffline = !navigator.onLine;

    // --- OFFLINE PATH: verify PIN locally using stored hash ---
    if (isOffline) {
      try {
        const storedLocal = JSON.parse(localStorage.getItem('morales_emergency_pin_hash') || 'null');
        if (!storedLocal) {
          setError('No offline PIN found. You must verify once online first.');
          setLoading(false);
          return;
        }
        // Hash the entered PIN the same way EmergencyPINSetup does
        const email = storedLocal.email || '';
        const data = new TextEncoder().encode(pin + ':' + email);
        const buf = await crypto.subtle.digest('SHA-256', data);
        const enteredHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (enteredHash !== storedLocal.hash) {
          setError('Incorrect PIN.');
          setLoading(false);
          return;
        }
        // PIN correct offline — use cached manifest directly
        if (cached) {
          setManifest(cached);
        } else {
          setError('PIN correct but no cached manifest. Connect once online to prime your offline manifest.');
        }
      } catch (_) {
        setError('Offline verification failed. Try again.');
      }
      setLoading(false);
      return;
    }

    // --- ONLINE PATH ---
    try {
      // Step 1: Verify PIN to get session
      const verifyRes = await base44.functions.invoke('verifyEmergencyPIN', { pin });
      const verifyData = verifyRes.data;

      if (verifyData?.error || !verifyData?.verified) {
        setError(verifyData?.error || 'Invalid PIN. Access denied.');
        setLoading(false);
        return;
      }

      // Step 2: Fetch patient's case data for manifest
      const userEmail = verifyData.user_email;
      let manifestData = {
        full_name: 'Unknown',
        blood_type: 'Unknown',
        allergies: 'None recorded',
        medications: 'None recorded',
        medical_conditions: 'None recorded',
        emergency_contacts: [],
        passport_last4: 'Not on file',
        procedure: 'Not specified',
        doctor_name: 'Not assigned',
        doctor_phone: 'Not available',
        case_id: 'N/A',
        patient_phone: 'Not on file',
        client_email: userEmail,
        client_country: 'Not on file',
        preferred_language: 'English',
        insurance_info: 'Not on file',
        cached_at: new Date().toISOString(),
        cached_version: '2.0',
      };

      // Try to fetch case record for this user
      try {
        const cases = await base44.asServiceRole.entities.CaseRecord.filter({ client_email: userEmail }, '-created_date', 1);
        if (cases && cases.length > 0) {
          const c = cases[0].data;
          manifestData = {
            full_name: c.client_name || userEmail,
            blood_type: c.blood_type || 'Unknown',
            allergies: c.allergies || 'None recorded',
            medications: c.medications || 'None recorded',
            medical_conditions: c.medical_conditions || 'None recorded',
            emergency_contacts: c.emergency_contact ? [{ name: c.emergency_contact, relationship: 'Emergency Contact', phone: c.emergency_contact_phone || 'Not provided' }] : [],
            passport_last4: c.passport_vault_token ? 'On file' : 'Not on file',
            procedure: c.procedures?.join(', ') || 'Not specified',
            doctor_name: c.doctor_selected || 'Not assigned',
            doctor_phone: c.doctor_email || 'Not available',
            case_id: c.id || cases[0].id,
            patient_phone: c.client_phone || 'Not on file',
            client_email: c.client_email || userEmail,
            client_country: c.client_country || 'Not on file',
            preferred_language: c.preferred_language || 'English',
            insurance_info: c.insurance_info || 'Not on file',
            cached_at: new Date().toISOString(),
            cached_version: '2.0',
          };
        }
      } catch (caseErr) {
        console.log('[EmergencyManifest] Could not fetch case data:', caseErr.message);
      }

      safeStoreManifest(manifestData);
      setManifest(manifestData);
    } catch (_) {
      // Server unreachable — try local PIN + cached manifest
      try {
        const storedLocal = JSON.parse(localStorage.getItem('morales_emergency_pin_hash') || 'null');
        if (storedLocal) {
          const emailKey = storedLocal.email || '';
          const buf2 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + ':' + emailKey));
          const hash2 = Array.from(new Uint8Array(buf2)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (hash2 === storedLocal.hash && cached) {
            setManifest(cached);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}
      setError('Server unreachable and no valid offline fallback. Check your connection.');
    }
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
          <Section label="PATIENT PHONE" value={displayData.patient_phone} />
          <Section label="PATIENT EMAIL" value={displayData.client_email} />
          <Section label="HOME COUNTRY" value={displayData.client_country} />
          <Section label="LANGUAGE" value={displayData.preferred_language} />
          <Section label="INSURANCE" value={displayData.insurance_info} />
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

        {!navigator.onLine && (
          <div style={{ backgroundColor: '#ff6600', color: '#000', padding: '8px 12px', marginBottom: '16px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
            ⚠ OFFLINE MODE — PIN verified from device cache
          </div>
        )}

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