/**
 * PatientJourneyCredit — Morales loyalty credit score.
 *
 * Built from completed journey behavior. Patients with higher credit get:
 *   - Lower deposit required on next booking
 *   - Priority doctor matching
 *   - VIP companion tier access
 *
 * Reads from CaseRecord.journey_credit (computed after each journey).
 * Shows progress bar + tier + benefits unlocked.
 *
 * This is the Starbucks Stars / airline miles model for medical tourism.
 * A competitor cannot give historical Morales credit to their customers.
 */
import React from 'react';

const GOLD = '#D4AF37';

const TIERS = [
  { name: 'Member',    min: 0,   max: 249,  color: '#94a3b8', icon: '⬜', deposit_reduction: '0%',   perk: 'Standard access' },
  { name: 'Silver',   min: 250,  max: 499,  color: '#94a3b8', icon: '🥈', deposit_reduction: '5%',   perk: 'Priority response' },
  { name: 'Gold',     min: 500,  max: 749,  color: GOLD,      icon: '🥇', deposit_reduction: '10%',  perk: '10% deposit discount + priority doctors' },
  { name: 'Platinum', min: 750,  max: 999,  color: '#e2e8f0', icon: '💎', deposit_reduction: '15%',  perk: 'VIP companion + 15% deposit discount' },
  { name: 'Golden M', min: 1000, max: 99999,color: GOLD,      icon: '🏆', deposit_reduction: '20%',  perk: 'Golden M — 20% discount, lifetime VIP' },
];

function getTier(credit) {
  return TIERS.find(t => credit >= t.min && credit < t.max) || TIERS[0];
}

function getNextTier(credit) {
  const idx = TIERS.findIndex(t => credit >= t.min && credit < t.max);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

/**
 * Props:
 *   credit       number (from CaseRecord.journey_credit, default 0)
 *   journeyCount number (how many completed journeys)
 */
export default function PatientJourneyCredit({ credit = 0, journeyCount = 0 }) {
  const tier     = getTier(credit);
  const nextTier = getNextTier(credit);
  const progress = nextTier
    ? Math.round(((credit - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  if (credit === 0 && journeyCount === 0) return null;

  return (
    <div style={{
      background:   '#0C1A1D',
      border:       `1px solid ${tier.color}28`,
      borderRadius: 16,
      padding:      '16px 18px',
      overflow:     'hidden',
      position:     'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 140, height: 140,
        background: `radial-gradient(circle, ${tier.color}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
            Journey Credit
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 14 }}>{tier.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: tier.color }}>{tier.name}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: tier.color, lineHeight: 1 }}>{credit}</p>
          <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>CREDITS</p>
        </div>
      </div>

      {/* Progress bar */}
      {nextTier && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: `linear-gradient(90deg, ${tier.color}, ${nextTier.color})`,
              borderRadius: 999,
              transition: 'width 0.8s ease',
              boxShadow: `0 0 6px ${tier.color}60`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{tier.name}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
              {nextTier.min - credit} credits to {nextTier.name}
            </span>
          </div>
        </div>
      )}

      {/* Current perk */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 8,
        background: `${tier.color}10`, border: `1px solid ${tier.color}20`,
      }}>
        <span style={{ fontSize: 11, color: tier.color }}>✓</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{tier.perk}</span>
        {tier.deposit_reduction !== '0%' && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700,
            color: tier.color, background: `${tier.color}15`,
            padding: '2px 7px', borderRadius: 999,
          }}>
            -{tier.deposit_reduction} deposit
          </span>
        )}
      </div>

      {journeyCount > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          {journeyCount} completed journey{journeyCount !== 1 ? 's' : ''} · Credit never expires
        </p>
      )}
    </div>
  );
}
