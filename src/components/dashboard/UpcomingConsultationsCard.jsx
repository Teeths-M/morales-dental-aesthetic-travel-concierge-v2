import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Video, Calendar } from 'lucide-react';

/**
 * UpcomingConsultationsCard — lists the patient's real VirtualConsultation
 * rows with Join/Decision-Room links. Mounted right after CaseControlCenter
 * in Dashboard.jsx, matching that panel's own self-contained pattern.
 */
export default function UpcomingConsultationsCard({ userEmail }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    base44.entities.VirtualConsultation.filter({ client_email: userEmail }, '-scheduled_at', 10)
      .then((rows) => { if (!cancelled) setConsultations(rows || []); })
      .catch(() => { if (!cancelled) setConsultations([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userEmail]);

  if (loading || consultations.length === 0) return null;

  return (
    <div style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 16, padding: 18, marginBottom: 20 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Virtual Consultations</p>
      {consultations.map((vc) => {
        const past = vc.status === 'completed';
        return (
          <div key={vc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, color: '#fff' }}>Dr. {vc.doctor_name || 'Your matched doctor'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                {vc.scheduled_at ? new Date(vc.scheduled_at).toLocaleString() : ''} — {vc.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(past ? `/consultation/${vc.id}/decision` : `/consultation/${vc.id}/room`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              {past ? <Calendar size="13" /> : <Video size="13" />} {past ? 'Decision Room' : 'Join'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
