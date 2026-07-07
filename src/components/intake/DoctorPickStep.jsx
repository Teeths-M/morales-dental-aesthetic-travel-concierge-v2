import React, { useState } from 'react';
import { UNSPECIFIED } from '@/lib/intakeFlow/questionGraph';

const GOLD = '#D4AF37';
const BORDER = '#2A3F4A';
const TOP_N = 5;

const NOT_SURE = { id: UNSPECIFIED, name: UNSPECIFIED };

function sortByRealSignal(doctors) {
  return [...doctors].sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.years_experience || 0) - (a.years_experience || 0);
  });
}

/**
 * Real, tappable doctor recommendations during intake — not just background
 * checklist text. `matchDoctorsForProcedure` matches globally (no country
 * filter), so this partitions its already-fetched results client-side:
 * doctors in the chosen destination first, falling back to the full ranked
 * list only if none matched there. Only cites fields the function actually
 * returns — never a fabricated stat. Picking is opt-in; "let my care team
 * recommend" is always available and behaves exactly like today's default
 * (post-submission care-team assignment) via the same UNSPECIFIED sentinel
 * pattern used for procedure/destination.
 */
export default function DoctorPickStep({ doctorSearch, destinationCountry, onContinue }) {
  const [showAll, setShowAll] = useState(false);

  const handlePick = (doc) => {
    onContinue({
      rawText: doc.name === UNSPECIFIED ? 'Recommend one for me' : doc.name,
      extracted: { preferred_doctor_id: doc.id, preferred_doctor_name: doc.name },
    });
  };

  if (doctorSearch?.status === 'loading' || doctorSearch?.status === 'idle') {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
          Finding your matched doctors...
        </p>
        <SkipButton onClick={() => handlePick(NOT_SURE)} />
      </div>
    );
  }

  const matched = doctorSearch?.data?.matched_doctors ?? [];

  if (doctorSearch?.status === 'unavailable' || matched.length === 0) {
    return (
      <div>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
          {doctorSearch?.data?.message || "We're expanding our network for this procedure — your care team will personally match you with the right specialist."}
        </p>
        <button
          type="button"
          onClick={() => handlePick(NOT_SURE)}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 999, cursor: 'pointer',
            background: GOLD, border: 'none', color: '#060B16', fontSize: 14, fontWeight: 700,
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  const hasDestination = !!destinationCountry && destinationCountry !== UNSPECIFIED;
  const inDestination = hasDestination ? matched.filter((d) => d.clinic_country === destinationCountry) : [];
  const primary = inDestination.length > 0 ? sortByRealSignal(inDestination) : sortByRealSignal(matched);
  const bucketLabel = inDestination.length > 0 ? `Matched in ${destinationCountry}` : null;

  const top = primary.slice(0, TOP_N);
  const rest = primary.slice(TOP_N);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bucketLabel && (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>
          {bucketLabel}
        </span>
      )}

      {top.map((doc, i) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => handlePick(doc)}
          style={{
            textAlign: 'left',
            padding: '13px 16px',
            borderRadius: 14,
            background: 'rgba(212,175,55,0.06)',
            border: `1px solid ${i === 0 ? GOLD + '80' : BORDER}`,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {i === 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: GOLD }}>
              Top Match
            </span>
          )}
          <span style={{ fontWeight: 600 }}>{doc.name}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
            {[doc.clinic_city, doc.clinic_country].filter(Boolean).join(', ')}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
            {[
              doc.rating ? `${doc.rating}★` : null,
              doc.years_experience ? `${doc.years_experience}+ years experience` : null,
              doc.review_count ? `${doc.review_count} reviews` : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </button>
      ))}

      <SkipButton onClick={() => handlePick(NOT_SURE)} />

      {!showAll && rest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            textAlign: 'center', padding: '10px 16px', background: 'none', border: 'none',
            color: GOLD, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Show More Doctors ({rest.length} more)
        </button>
      )}

      {showAll && rest.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => handlePick(doc)}
          style={{
            textAlign: 'left', padding: '11px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
            color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 600 }}>{doc.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {[doc.clinic_city, doc.clinic_country].filter(Boolean).join(', ')}
          </div>
        </button>
      ))}
    </div>
  );
}

function SkipButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'center',
        padding: '12px 16px',
        borderRadius: 14,
        background: 'transparent',
        border: `1px dashed ${BORDER}`,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      Not sure — let my care team recommend
    </button>
  );
}
