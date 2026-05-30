import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { decodePortalToken, getTokenFromUrl } from '@/lib/portalToken';

const USD = (val) => `$${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RISK_COLORS = {
  low: { bg: '#D1FAE5', text: '#065F46', label: 'Low Risk' },
  medium: { bg: '#FEF3C7', text: '#92400E', label: 'Medium Risk' },
  high: { bg: '#FEE2E2', text: '#991B1B', label: 'High Risk' },
};

const STEPS = ['Request Received', 'Reviewing Availability', 'Quote Submitted', 'Confirmed'];

export default function PortalTravelAgency() {
  const [tokenData, setTokenData] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [flightCost, setFlightCost] = useState('');
  const [hotelCost, setHotelCost] = useState('');
  const [flightItinerary, setFlightItinerary] = useState('');
  const [hotelSelection, setHotelSelection] = useState('');
  const [taxiServiceId, setTaxiServiceId] = useState('');

  useEffect(() => {
    const token = getTokenFromUrl();
    if (!token) {
      setTokenError('No access token provided. Please use the link sent to you.');
      setLoading(false);
      return;
    }
    const decoded = decodePortalToken(token);
    if (!decoded.valid) {
      setTokenError(decoded.error || 'Invalid or expired access link.');
      setLoading(false);
      return;
    }
    setTokenData(decoded);
    loadConsultation(decoded.consultation_id);
  }, []);

  const loadConsultation = async (id) => {
    try {
      const results = await base44.entities.Consultation.filter({ id });
      const c = results[0];
      if (!c) { setError('Case not found.'); setLoading(false); return; }
      if (c.status !== 'Travel-Pending') {
        setError(`This portal is only accessible when the case status is "Travel-Pending". Current status: ${c.status}`);
        setLoading(false);
        return;
      }
      setConsultation(c);
      // Pre-fill taxi service from case
      if (c.taxi_service_id) setTaxiServiceId(c.taxi_service_id);
    } catch (e) {
      setError('Failed to load case data.');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!flightCost || !hotelCost) { setError('Please enter both flight and hotel costs.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await base44.functions.invoke('sendTravelQuoteEmail', {
        consultation_id: tokenData.consultation_id,
        flight_cost_usd: parseFloat(flightCost),
        hotel_cost_usd: parseFloat(hotelCost),
        flight_itinerary_summary: flightItinerary,
        hotel_selection: hotelSelection,
        taxi_service_id: taxiServiceId,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  const risk = RISK_COLORS[consultation?.risk_level] || RISK_COLORS.low;
  const packageTotal = (parseFloat(flightCost) || 0) + (parseFloat(hotelCost) || 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #0F3A20', borderTopColor: '#C5A059', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#555', fontSize: 14 }}>Loading case data…</p>
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
        <h2 style={{ color: '#0F3A20', fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 8 }}>Quote Submitted Successfully</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>Your travel package quote of <strong>{USD(packageTotal)}</strong> has been received. The chauffeur coordination team has been notified. We'll follow up within 24 hours.</p>
        <div style={{ marginTop: 28, padding: '14px 20px', background: '#f8faf8', borderRadius: 8, display: 'inline-block' }}>
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
          Morales Dental & Aesthetics | TRAVEL REQUEST
        </p>
        <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, color: '#fff', fontWeight: 400 }}>
          Patient ready for travel quotation
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)', maxWidth: 560 }}>
          A patient has completed medical review and is ready for travel coordination. Please confirm travel availability and package pricing.
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

        {/* Case Details Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>Patient & Case Details</span>
            {consultation?.risk_level && (
              <span style={{ background: risk.bg, color: risk.text, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {risk.label}
              </span>
            )}
          </div>
          {[
            ['Patient Name', consultation?.patient_name],
            ['Procedure Type', (consultation?.procedure_interest || '').replace(/_/g, ' ')],
            ['Travel Dates Requested', consultation?.preferred_date || 'Flexible'],
            ['Duration of Stay', consultation?.duration_of_stay || 'Not specified'],
            ['Destination', consultation?.destination_country || 'Not specified'],
          ].map(([label, value], i) => (
            <div key={label} style={{ display: 'flex', padding: '12px 20px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ width: '42%', fontSize: 13, color: '#888' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111', textTransform: label === 'Procedure Type' ? 'capitalize' : 'none' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Quote Form */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>Travel Package Quote</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>FLIGHT COST (USD)</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', background: '#f9fafb', color: '#555', fontSize: 14, borderRight: '1px solid #d1d5db' }}>$</span>
                  <input type="number" min="0" step="0.01" value={flightCost} onChange={e => setFlightCost(e.target.value)}
                    placeholder="0.00" style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, color: '#111' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>HOTEL COST (USD)</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', background: '#f9fafb', color: '#555', fontSize: 14, borderRight: '1px solid #d1d5db' }}>$</span>
                  <input type="number" min="0" step="0.01" value={hotelCost} onChange={e => setHotelCost(e.target.value)}
                    placeholder="0.00" style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, color: '#111' }} />
                </div>
              </div>
            </div>

            {/* Reactive Total */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>Travel Package Price</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#0F3A20' }}>{USD(packageTotal)}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>FLIGHT ITINERARY SUMMARY</label>
              <textarea value={flightItinerary} onChange={e => setFlightItinerary(e.target.value)}
                placeholder="e.g. Departs DEN 08:00 Jun 15, arrives MCO 14:30. Return Jun 22."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111', resize: 'vertical', minHeight: 72, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>HOTEL SELECTION</label>
              <input type="text" value={hotelSelection} onChange={e => setHotelSelection(e.target.value)}
                placeholder="e.g. Grand Hyatt Playa del Carmen"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>CHAUFFEUR SERVICE ID (for transfer dispatch)</label>
              <input type="text" value={taxiServiceId} onChange={e => setTaxiServiceId(e.target.value)}
                placeholder="TaxiService record ID"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991B1B', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          style={{ width: '100%', padding: '16px 24px', background: submitting ? '#888' : '#0F3A20', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.5px' }}>
          {submitting ? 'Submitting…' : '✈ Submit Travel Quote'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 16 }}>
          Morales Dental & Aesthetics · Secure Vendor Portal · Powered by SAFE-T 4LIFE™
        </p>
      </div>
    </div>
  );
}