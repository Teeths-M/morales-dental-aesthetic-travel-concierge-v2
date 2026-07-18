import React, { useState } from 'react';
import { MapPin, ShieldCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  LOCATION_CONSENT_VERSION,
  LOCATION_CONSENT_POINTS,
  hasLocationConsent,
  grantLocationConsentLocally,
  revokeLocationConsentLocally,
} from '@/lib/locationConsent';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

/**
 * LocationSharingCard — the patient's control over live location sharing.
 *
 * Continuous GPS on a medical patient is the most sensitive data the platform
 * holds, so it is opt-in, always visible, and revocable in one tap. This card
 * is the only place tracking gets switched on: the beacon reads the consent it
 * writes, and refuses to run without it.
 *
 * Deliberately not a toggle buried in settings. If tracking is running the
 * patient can see that it is, on the same screen as their journey.
 *
 * Revocation is applied locally FIRST so that turning it off works instantly
 * and offline — a patient withdrawing consent must not have to wait on a
 * network round trip to be obeyed.
 */
export default function LocationSharingCard({ caseRecord, onChange }) {
  const caseId = caseRecord?.id;
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(() => hasLocationConsent(caseId, caseRecord));

  if (!caseId) return null;

  const persist = async (granted) => {
    const now = new Date().toISOString();
    await base44.entities.CaseRecord.update(caseId, granted
      ? {
        location_tracking_consent: true,
        location_tracking_consent_at: now,
        location_tracking_consent_version: LOCATION_CONSENT_VERSION,
        location_tracking_revoked_at: null,
      }
      : {
        location_tracking_consent: false,
        location_tracking_revoked_at: now,
      });
  };

  const enable = async () => {
    setBusy(true);
    grantLocationConsentLocally(caseId);
    setOn(true);
    try {
      await persist(true);
    } catch (_) {
      // Local consent still governs this device; the record syncs on the next
      // successful write. Never block the patient on our persistence.
    }
    setBusy(false);
    onChange?.(true);
  };

  const disable = async () => {
    setBusy(true);
    // Local first — stops the beacon on the next render regardless of network.
    revokeLocationConsentLocally(caseId);
    setOn(false);
    try {
      await persist(false);
    } catch (_) { /* see above */ }
    setBusy(false);
    onChange?.(false);
  };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <MapPin className="w-4 h-4" style={{ color: on ? GOLD : '#64748b' }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>
          {on ? 'Sharing your location' : 'Share your location'}
        </p>
        {on && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            color: GOLD, background: 'rgba(212,175,55,0.12)',
            border: `1px solid ${GOLD}55`, borderRadius: 20, padding: '3px 9px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
            ON
          </span>
        )}
      </div>

      <ul style={{ margin: '0 0 16px', paddingLeft: 18, color: 'rgba(255,255,255,0.62)', fontSize: 12.5, lineHeight: 1.7 }}>
        {LOCATION_CONSENT_POINTS.map((point) => <li key={point}>{point}</li>)}
      </ul>

      <button
        type="button"
        onClick={on ? disable : enable}
        disabled={busy}
        style={{
          width: '100%', padding: '12px 18px', borderRadius: 999, border: 'none',
          cursor: busy ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 700,
          background: on ? 'transparent' : GOLD,
          color: on ? 'rgba(255,255,255,0.75)' : '#060B16',
          boxShadow: on ? `inset 0 0 0 1px ${BORDER}` : 'none',
        }}
      >
        {busy
          ? <Loader2 className="w-4 h-4 animate-spin" style={{ display: 'inline' }} />
          : on ? 'Stop sharing my location' : 'Start sharing my location'}
      </button>

      {!on && (
        <p style={{ margin: '10px 0 0', display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, color: 'rgba(255,255,255,0.4)' }}>
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ marginTop: 1 }} />
          Your journey works fine without this. It only changes whether your coordinator can see where you are.
        </p>
      )}
    </div>
  );
}
