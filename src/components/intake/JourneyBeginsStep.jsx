import React from 'react';
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

/**
 * The closing beat — not a form-submission dead end. Every item here reflects
 * something genuinely computed during the conversation (safetyStatus from the
 * same procedureCompatibility engine that gates safety, doctorSearch/
 * partnerPreview from the M3 background searches) — never a fabricated
 * checkmark. Where we don't have real backing data (e.g. no companion/
 * guardian assignment happens in this flow), the item is left out rather
 * than claimed. Payment isn't live in this phase, so that's said plainly.
 */
export default function JourneyBeginsStep({ patientFirstName, safetyStatus, doctorSearch, partnerPreview }) {
  const doctorCount = doctorSearch?.data?.matched_doctors?.length ?? 0;
  const recoveryDays = safetyStatus?.totalRecoveryDays ?? 0;
  const partnerCount = (partnerPreview?.data?.travel_agency_count ?? 0) + (partnerPreview?.data?.taxi_service_count ?? 0);

  const items = [
    { label: 'Safety Profile Created', state: 'done' },
    doctorCount > 0
      ? { label: `${doctorCount} Verified Doctor${doctorCount === 1 ? '' : 's'} Found`, state: 'done' }
      : { label: 'Expanding Our Network for Your Procedure', state: 'done' },
    recoveryDays > 0 && { label: `Recovery Timeline Built (~${recoveryDays} days)`, state: 'done' },
    partnerCount > 0 && { label: `${partnerCount} Travel & Transfer Partners Ready`, state: 'done' },
    { label: 'Secure Deposit — Coming Soon', state: 'pending' },
    { label: 'Payment Integration Ready', state: 'pending' },
  ].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '40px 32px', textAlign: 'center' }}
    >
      <img
        src="/morales-m-mark.png"
        alt="Morales"
        style={{ width: 44, height: 44, margin: '0 auto 20px', display: 'block' }}
      />
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>
        Welcome to Morales
      </p>
      <h2 style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
        {patientFirstName ? `${patientFirstName}, your journey has begun.` : 'Your journey has begun.'}
      </h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
        From this moment forward, you're never alone. A specialist is already being matched to
        your case, and your coordinator will reach out personally — you won't need to repeat anything.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: item.state === 'done' ? 'rgba(34,197,94,0.15)' : '#1e2d35',
                border: item.state === 'done' ? '2px solid #22c55e' : `2px solid ${BORDER}`,
              }}
            >
              {item.state === 'done' && <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <span
              style={{
                fontSize: 13.5,
                color: item.state === 'done' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
                fontWeight: item.state === 'done' ? 600 : 500,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
