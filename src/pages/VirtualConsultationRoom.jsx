import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SecureVideoRoom from '@/components/care-team/SecureVideoRoom';
import ConsentManager from '@/components/care-team/ConsentManager';

/**
 * VirtualConsultationRoom — /consultation/:consultationId/room. Re-confirms
 * (or lets the patient re-confirm) the 4 typed consents just before joining
 * the call, then hands off to SecureVideoRoom.
 */
export default function VirtualConsultationRoom() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [vc, setVc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consentsReady, setConsentsReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const record = await base44.entities.VirtualConsultation.get(consultationId);
      setVc(record);
      setConsentsReady(!!record?.telehealth_consent);
    } catch (_) { /* honest empty state below */ }
    setLoading(false);
  }, [consultationId]);

  useEffect(() => { load(); }, [load]);

  const handleConsentChange = async (type, granted) => {
    setVc((prev) => ({ ...prev, [`${type === 'telehealth' ? 'telehealth' : type}_consent`]: granted }));
    try {
      await base44.functions.invoke('recordVirtualConsultationConsent', {
        virtual_consultation_id: consultationId, consent_type: type, granted,
      });
    } catch (_) { /* best-effort */ }
  };

  if (loading) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>Loading…</div>;
  if (!vc) return <div style={{ padding: 40, color: 'rgba(255,255,255,0.5)' }}>This consultation couldn't be loaded.</div>;

  if (!consentsReady) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Before you join</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>
          Please confirm these before your consultation begins.
        </p>
        <ConsentManager
          consents={{
            telehealth: vc.telehealth_consent, ai_notes: vc.ai_notes_consent,
            translation_captions: vc.translation_captions_consent, recording: vc.recording_consent,
          }}
          onChange={handleConsentChange}
        />
        <button
          type="button"
          disabled={!vc.telehealth_consent}
          onClick={() => setConsentsReady(true)}
          style={{
            marginTop: 18, background: vc.telehealth_consent ? '#D4AF37' : 'rgba(212,175,55,0.3)',
            color: '#060B16', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700,
            fontSize: 13.5, cursor: vc.telehealth_consent ? 'pointer' : 'not-allowed',
          }}
        >
          Continue to consultation
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px' }}>
      <SecureVideoRoom
        virtualConsultation={vc}
        onLeave={() => navigate(`/consultation/${consultationId}/decision`)}
        onReportConcern={() => navigate('/dashboard')}
      />
    </div>
  );
}
