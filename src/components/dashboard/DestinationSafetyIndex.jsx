/**
 * DestinationSafetyIndex — proprietary Morales safety score for the patient's destination.
 *
 * Shows on the patient dashboard during active travel. The score is derived
 * from our own SOS event history + live Morales patient count in-country.
 * No competitor has this data. It becomes more accurate with every patient.
 *
 * Props:
 *   country     string — patient's destination country
 *   caseId      string — for patient count context
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const GOLD = '#D4AF37';

function getScoreColor(score) {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Elevated';
}

export default function DestinationSafetyIndex({ country, caseId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    if (!country) { setLoad(false); return; }
    base44.functions.invoke('getDestinationSafetyIndex', { country, case_id: caseId })
      .then(res => { if (res.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [country, caseId]);

  if (!country || loading) return null;
  if (!data) return null;

  const score = data.safety_index ?? 90;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div style={{
      background:    '#0C1A1D',
      border:        `1px solid ${GOLD}20`,
      borderRadius:  16,
      padding:       '14px 18px',
      display:       'flex',
      alignItems:    'center',
      gap:           14,
      flexWrap:      'wrap',
    }}>
      {/* Score circle */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${color} ${score}%, rgba(255,255,255,0.06) 0%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 16px ${color}30`,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#0C1A1D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 900, color }}>{score}</span>
        </div>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
            Morales Safety Index
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${color}15`, color, fontWeight: 700 }}>
            {label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          <strong style={{ color: '#fff' }}>{country}</strong>
          {data.active_patients > 0 && (
            <> · <strong style={{ color }}>{data.active_patients}</strong> active Morales patient{data.active_patients !== 1 ? 's' : ''} in-country</>
          )}
          {data.incidents_this_week === 0 && (
            <> · <span style={{ color: '#22c55e' }}>0 incidents this week</span></>
          )}
          {data.incidents_this_week > 0 && (
            <> · <span style={{ color: '#f97316' }}>{data.incidents_this_week} incident{data.incidents_this_week !== 1 ? 's' : ''} this week</span></>
          )}
        </p>
      </div>

      {/* Verified badge */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>PROPRIETARY DATA</p>
        <p style={{ margin: 0, fontSize: 9, color: GOLD, fontWeight: 700 }}>MORALES INTELLIGENCE™</p>
      </div>
    </div>
  );
}
