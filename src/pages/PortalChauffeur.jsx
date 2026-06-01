import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { decodePortalToken, getTokenFromUrl } from '@/lib/portalToken';

const USD = (val) => `$${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STEPS = ['Request Received', 'Route Review', 'Quote Submitted', 'Confirmed'];

export default function PortalChauffeur() {
  const [tokenData, setTokenData] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [taxiService, setTaxiService] = useState(null);
  const [driverType, setDriverType] = useState(null); // 'origin' | 'destination' | 'unknown'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Origin legs
  const [leg1, setLeg1] = useState('');
  const [leg2, setLeg2] = useState('');
  // Destination legs
  const [leg3, setLeg3] = useState('');
  const [leg4, setLeg4] = useState('');
  const [leg5, setLeg5] = useState('');
  const [leg6, setLeg6] = useState('');

  useEffect(() => {
    const token = getTokenFromUrl();
    console.log('Raw token from URL:', token);
    if (!token) { setTokenError('No access token provided. Please use the link sent to you.'); setLoading(false); return; }
    const decoded = decodePortalToken(token);
    console.log('Decoded token result:', decoded);
    if (!decoded.valid) { setTokenError(decoded.error || 'Invalid or expired access link.'); setLoading(false); return; }
    setTokenData(decoded);
    loadData(decoded.consultation_id, decoded.partner_id);
  }, []);

  const loadData = async (consultationId, partnerId) => {
    try {
      const [consultations, taxiServices] = await Promise.all([
        base44.entities.Consultation.filter({ id: consultationId }),
        partnerId ? base44.entities.TaxiService.filter({ id: partnerId }) : Promise.resolve([]),
      ]);

      const c = consultations[0];
      if (!c) { setError('Case not found.'); setLoading(false); return; }
      const blockedStatuses = ['cancelled', 'completed'];
      if (blockedStatuses.includes(c.status)) {
        setError(`This transfer request is no longer active. Current status: ${c.status}`);
        setLoading(false);
        return;
      }

      const taxi = taxiServices[0] || null;
      setConsultation(c);
      setTaxiService(taxi);

      // IQ200 Logic: Determine driver type
      if (taxi?.operating_country) {
        const driverCountry = (taxi.operating_country || '').toLowerCase().trim();
        const clientCountry = (c.client_country || '').toLowerCase().trim();
        const procedureCountry = (c.procedure_country || c.destination_country || '').toLowerCase().trim();

        if (driverCountry && clientCountry && driverCountry === clientCountry) {
          setDriverType('origin');
        } else if (driverCountry && procedureCountry && driverCountry === procedureCountry) {
          setDriverType('destination');
        } else {
          setDriverType('unknown');
        }
      } else {
        setDriverType('unknown');
      }
    } catch (e) {
      setError('Failed to load case data.');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const isOrigin = driverType === 'origin';
    const isDestination = driverType === 'destination';

    if (isOrigin && (!leg1 || !leg2)) { setError('Please enter pricing for both origin legs.'); return; }
    if (isDestination && (!leg3 || !leg4 || !leg5 || !leg6)) { setError('Please enter pricing for all four destination legs.'); return; }
    if (!isOrigin && !isDestination) { setError('Driver region could not be determined. Please contact support.'); return; }

    setError(null);
    setSubmitting(true);
    try {
      await base44.functions.invoke('sendChauffeurQuoteAlert', {
        consultation_id: tokenData.consultation_id,
        driver_type: driverType,
        leg_1_cost_usd: parseFloat(leg1) || 0,
        leg_2_cost_usd: parseFloat(leg2) || 0,
        leg_3_cost_usd: parseFloat(leg3) || 0,
        leg_4_cost_usd: parseFloat(leg4) || 0,
        leg_5_cost_usd: parseFloat(leg5) || 0,
        leg_6_cost_usd: parseFloat(leg6) || 0,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  const originTotal = (parseFloat(leg1) || 0) + (parseFloat(leg2) || 0);
  const destTotal = (parseFloat(leg3) || 0) + (parseFloat(leg4) || 0) + (parseFloat(leg5) || 0) + (parseFloat(leg6) || 0);
  const transferTotal = driverType === 'origin' ? originTotal : destTotal;

  const LegInput = ({ label, sublabel, value, onChange }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 2 }}>{label}</label>
      {sublabel && <p style={{ margin: '0 0 6px', fontSize: 11, color: '#999' }}>{sublabel}</p>}
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
        <span style={{ padding: '10px 12px', background: '#f9fafb', color: '#555', fontSize: 14, borderRight: '1px solid #d1d5db' }}>$</span>
        <input type="number" min="0" step="0.01" value={value} onChange={e => onChange(e.target.value)}
          placeholder="0.00" style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, color: '#111' }} />
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #0F3A20', borderTopColor: '#C5A059', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#555', fontSize: 14 }}>Loading transfer request…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (tokenError || (error && !consultation)) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 12, padding: '32px 28px', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2 style={{ color: '#991B1B', fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{tokenError || error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #D1FAE5', borderRadius: 12, padding: '40px 32px', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
        <h2 style={{ color: '#0F3A20', fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 8 }}>Transfer Quote Submitted</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>Your transfer pricing of <strong>{USD(transferTotal)}</strong> has been logged. The admin team has been notified for markup approval.</p>
        <div style={{ marginTop: 24, padding: '14px 20px', background: '#f8faf8', borderRadius: 8, display: 'inline-block' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>CASE REFERENCE</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F3A20' }}>{consultation?.patient_name}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0F3A20', padding: '24px 32px' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#C5A059', marginBottom: 6 }}>
          Morales Dental & Aesthetics | TRANSIT LOGISTICS REQUEST
        </p>
        <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, color: '#fff', fontWeight: 400 }}>
          Patient ready for transport coordination
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)', maxWidth: 560 }}>
          A patient travel schedule has been logged. Please provide flat-rate pricing for your assigned regional transit legs.
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        {/* Progress Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
          {STEPS.map((step, i) => {
            const active = i === 2;
            const done = i < 2;
            return (
              <React.Fragment key={step}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: done ? '#0F3A20' : active ? '#C5A059' : '#e5e7eb', color: done || active ? '#fff' : '#9ca3af', marginBottom: 6 }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 11, color: active ? '#C5A059' : done ? '#0F3A20' : '#9ca3af', fontWeight: active ? 700 : 500, textAlign: 'center', whiteSpace: 'nowrap' }}>{step}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < 2 ? '#0F3A20' : '#e5e7eb', minWidth: 20 }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Driver Region Badge */}
        {driverType && driverType !== 'unknown' && (
          <div style={{ background: driverType === 'origin' ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${driverType === 'origin' ? '#BFDBFE' : '#BBF7D0'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{driverType === 'origin' ? '🏠' : '✈️'}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: driverType === 'origin' ? '#1D4ED8' : '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {driverType === 'origin' ? 'Origin Driver — Home Country Legs' : 'Destination Driver — Procedure Country Legs'}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#666', marginTop: 2 }}>
                {driverType === 'origin'
                  ? `Your operating country matches the patient's home country (${taxiService?.operating_country}). Price the 2 departure/return legs.`
                  : `Your operating country matches the procedure country (${taxiService?.operating_country}). Price all 4 destination legs.`}
              </p>
            </div>
          </div>
        )}

        {driverType === 'unknown' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>⚠️ Your operating region could not be automatically matched. Contact admin to confirm your assigned legs before submitting pricing.</p>
          </div>
        )}

        {/* Case Details Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>Patient & Logistics Details</span>
          </div>
          {[
            ['Patient Name', consultation?.patient_name],
            ['Flight Details', consultation?.flight_itinerary_summary || 'TBD by travel agency'],
            ['Target Hotel', consultation?.hotel_selection || 'TBD by travel agency'],
            ['Logistics Notes', consultation?.transfer_notes || 'None'],
          ].map(([label, value], i) => (
            <div key={label} style={{ display: 'flex', padding: '12px 20px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ width: '42%', fontSize: 13, color: '#888' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* IQ200 Dynamic Leg Pricing */}
        {driverType !== 'unknown' && driverType !== null && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#0F3A20' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#C5A059' }}>
                {driverType === 'origin' ? '🏠 Origin Leg Pricing (2 Legs)' : '✈️ Destination Leg Pricing (4 Legs)'}
              </span>
            </div>
            <div style={{ padding: 20 }}>
              {driverType === 'origin' && (
                <>
                  <LegInput label="LEG 1 — OUTBOUND DEPARTURE (USD)" sublabel="Client Home → Local Airport" value={leg1} onChange={setLeg1} />
                  <LegInput label="LEG 2 — INBOUND RETURN (USD)" sublabel="Local Airport → Client Home" value={leg2} onChange={setLeg2} />
                </>
              )}
              {driverType === 'destination' && (
                <>
                  <LegInput label="LEG 3 — ARRIVAL GREETING (USD)" sublabel="Destination Airport → Hotel" value={leg3} onChange={setLeg3} />
                  <LegInput label="LEG 4 — CLINICAL OUTBOUND (USD)" sublabel="Hotel → Clinic" value={leg4} onChange={setLeg4} />
                  <LegInput label="LEG 5 — POST-OP RETURN (USD)" sublabel="Clinic → Hotel" value={leg5} onChange={setLeg5} />
                  <LegInput label="LEG 6 — FINAL DEPARTURE (USD)" sublabel="Hotel → Destination Airport" value={leg6} onChange={setLeg6} />
                </>
              )}

              {/* Reactive Transfer Total */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Transfer Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0F3A20' }}>{USD(transferTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991B1B', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting || driverType === 'unknown'}
          style={{ width: '100%', padding: '16px 24px', background: (submitting || driverType === 'unknown') ? '#888' : '#0F3A20', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: (submitting || driverType === 'unknown') ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.5px' }}>
          {submitting ? 'Submitting…' : '🚗 Submit Transfer Quote'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 16 }}>
          Morales Dental & Aesthetics · Secure Vendor Portal
        </p>
      </div>
    </div>
  );
}