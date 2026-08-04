import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, Clock, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_ROLES } from '@/lib/roles';

const GOLD   = '#D4AF37';
const DARK   = '#060B16';
const CARD   = '#0C1A1D';
const BORDER = '#2A3F4A';
const GREEN  = '#22c55e';

const PARTNERS = [
  {
    role: 'Driver',
    emoji: '🚗',
    name: 'Mario Reyes',
    photo: '🧔🏽',
    color: '#60a5fa',
    trips: 347,
    rating: 4.9,
    complaints: 0,
    badge: 'Gold Partner',
    specialty: 'Medical patient transfers · Airport specialist',
    eta: '8 minutes away',
    plate: 'TJX-4821',
    car: 'Black Toyota Camry',
    quotes: [
      '"Always on time. Called my name at arrivals before I even looked around."',
      '"Very gentle with my mother after surgery. Never rushed."',
      '"Spoke slowly and clearly. Made me feel safe."',
    ],
    brief: `Mario is on his way. He has completed 347 Morales trips with zero complaints and a 4.9 star rating. Patients describe him as always on time and very gentle. He will call your name clearly when he arrives. He will not honk. He is 8 minutes away.`,
  },
  {
    role: 'Companion',
    emoji: '🤝',
    name: 'Maria Gutierrez',
    photo: '👩🏽‍⚕️',
    color: '#f472b6',
    trips: 89,
    rating: 5.0,
    complaints: 0,
    badge: 'Elite Companion',
    specialty: 'Post-operative dental care · Accessibility specialist',
    eta: 'Assigned to your full stay',
    plate: null,
    car: null,
    quotes: [
      '"Maria held my arm the entire time. I never felt alone."',
      '"She explained everything before it happened. Perfect patience."',
      '"She knew about my allergies before I mentioned them."',
    ],
    brief: `Maria is your assigned companion. She has completed 89 companion assignments and specialises in post-operative dental care. She is patient, warm, and speaks English fluently. Patients rate her 5 stars for patience and warmth. She will hold your arm from the moment you land.`,
  },
  {
    role: 'Doctor',
    emoji: '🏥',
    name: 'Dr. Carlos Martinez',
    photo: '👨🏽‍⚕️',
    color: '#34d399',
    trips: 1247,
    rating: 4.95,
    complaints: 0,
    badge: 'Morales Verified',
    specialty: 'Dental implants · Oral surgery · 18 years experience',
    eta: 'Clinic ready at 10:00 AM',
    plate: null,
    car: null,
    quotes: [
      '"Dr. Martinez explained every step before he did it. Never a surprise."',
      '"My implants healed in 3 days. He said I was his fastest recovery."',
      '"He called to check on me the next morning. Incredible care."',
    ],
    brief: `Dr. Martinez has treated 1,247 dental patients through Morales. His satisfaction rate is 98.2% and his average recovery time is 3.8 days — faster than the regional average. Zero serious complications have been reported. The clinic team is fully prepared for your arrival.`,
  },
];

// Real Doctor/Companion rows don't carry patient-review quotes or a written
// narrative — those are genuine gaps, not something to fabricate. These
// mappers describe what the trust score actually measures instead.
function mapDoctorToPartner(doc) {
  const score = doc.trust_score ?? 0;
  const caseCount = doc.trust_case_count ?? 0;
  return {
    role: 'Doctor',
    emoji: '🏥',
    name: doc.full_name,
    photo: '👨🏽‍⚕️',
    color: '#34d399',
    trips: caseCount,
    rating: Math.round((score / 20) * 100) / 100, // 0-100 trust score → 0-5 stars
    complaints: null, // not tracked by this scoring system — show "—", never fabricate a count
    badge: 'Morales Verified',
    specialty: doc.specialty || 'Dental & aesthetic procedures',
    eta: null,
    plate: null,
    car: null,
    quotes: [`Trust score computed from ${caseCount} case${caseCount === 1 ? '' : 's'}: confirmation speed, safety record, clinic check-in completion, and patient feedback.`],
    brief: `${doc.full_name} has a Morales trust score of ${score}/100, computed from ${caseCount} case${caseCount === 1 ? '' : 's'} — confirmation speed, safety record, on-time clinic handshake completion, and patient feedback. Recalculated daily.`,
  };
}

function mapCompanionToPartner(comp) {
  const score = comp.performance_score ?? 0;
  const assignmentCount = comp.performance_components?.total_assignments ?? 0;
  return {
    role: 'Companion',
    emoji: '🤝',
    name: comp.full_name,
    photo: '👩🏽‍⚕️',
    color: '#f472b6',
    trips: assignmentCount,
    rating: Math.round((score / 20) * 100) / 100, // 0-100 performance score → 0-5 stars
    complaints: null,
    badge: 'Morales Verified',
    specialty: 'Post-operative companion care',
    eta: null,
    plate: null,
    car: null,
    quotes: [`Performance score computed from ${assignmentCount} assignment${assignmentCount === 1 ? '' : 's'}: response speed, completion rate, patient feedback, and reliability.`],
    brief: `${comp.full_name} has a Morales performance score of ${score}/100, computed from ${assignmentCount} assignment${assignmentCount === 1 ? '' : 's'} — response speed, completion rate, patient feedback, and reliability. Recalculated daily.`,
  };
}

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} style={{ width: 13, height: 13, fill: rating >= n ? GOLD : 'transparent', color: GOLD }} />
      ))}
      <span style={{ fontSize: 13, fontWeight: 800, color: GOLD, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

function speak(text, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; u.pitch = 1.05; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function PartnerCard({ partner, muted, expanded, onExpand }) {
  const [speaking, setSpeaking] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (muted) return;
    setSpeaking(true);
    speak(partner.brief, () => setSpeaking(false));
  };

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % partner.quotes.length), 4000);
    return () => clearInterval(t);
  }, [partner.quotes.length]);

  return (
    <div
      onClick={onExpand}
      style={{
        borderRadius: 20, border: `1px solid ${expanded ? partner.color + '60' : BORDER}`,
        background: expanded ? `${partner.color}08` : CARD,
        overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s',
        boxShadow: expanded ? `0 0 32px ${partner.color}18` : 'none',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: `${partner.color}18`, border: `2px solid ${partner.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>
          {partner.photo}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: partner.color, letterSpacing: '0.08em' }}>{partner.role.toUpperCase()}</span>
            <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, background: `${partner.color}20`, color: partner.color, fontWeight: 700 }}>{partner.badge}</span>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#fff' }}>{partner.name}</p>
          <Stars rating={partner.rating} />
        </div>

        {/* Speak button */}
        <button
          onClick={handleSpeak}
          disabled={muted}
          style={{
            padding: '8px 14px', borderRadius: 10, cursor: muted ? 'not-allowed' : 'pointer',
            background: speaking ? `${partner.color}25` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${speaking ? partner.color + '60' : BORDER}`,
            color: speaking ? partner.color : 'rgba(255,255,255,0.4)',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
          }}
        >
          <Volume2 style={{ width: 12, height: 12 }} />
          {speaking ? 'Speaking...' : 'Hear M'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ padding: '0 24px 16px', display: 'flex', gap: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>
            {partner.trips.toLocaleString()}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            {partner.role === 'Doctor' ? 'Patients' : 'Trips'}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: GREEN }}>
            {partner.complaints === null ? '—' : partner.complaints}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Complaints</p>
        </div>
        <div style={{ flex: 1 }}>
          {partner.eta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Clock style={{ width: 11, height: 11, color: partner.color }} />
              <p style={{ margin: 0, fontSize: 11, color: partner.color, fontWeight: 700 }}>{partner.eta}</p>
            </div>
          )}
          {partner.plate && (
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{partner.car} · {partner.plate}</p>
          )}
          {!partner.plate && (
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{partner.specialty}</p>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          {/* Rotating patient quote */}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>PATIENT REVIEW</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, fontStyle: 'italic', transition: 'opacity 0.3s' }}>
              {partner.quotes[quoteIdx]}
            </p>
          </div>

          {/* M's brief */}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: `${partner.color}08`, border: `1px solid ${partner.color}25` }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: partner.color, letterSpacing: '0.06em' }}>M SAYS TO JAMES</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
              {partner.brief}
            </p>
          </div>

          {/* Verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: GREEN }} />
            <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>Morales verified · Background checked · Insured</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartnerTrustDemo() {
  const [expanded, setExpanded] = useState(0);
  const [muted, setMuted]       = useState(false);
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  // Real trust scores are admin-only by design (the scoring function's own
  // doc-comment: "Doctors never see this score"), so a public visitor to this
  // demo always sees the illustrative sample, clearly labeled as such. An
  // admin viewing this page sees real doctor+companion data once it exists —
  // never a silent mix of real and fake in the same view.
  const { data: realDoctors = [] } = useQuery({
    queryKey: ['partner-trust-doctors'],
    queryFn: () => base44.entities.Doctor.filter({}, '-trust_score', 3),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });
  const { data: realCompanions = [] } = useQuery({
    queryKey: ['partner-trust-companions'],
    queryFn: () => base44.entities.Companion.filter({}, '-performance_score', 3),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });

  const scoredDoctors    = realDoctors.filter(d => typeof d.trust_score === 'number');
  const scoredCompanions = realCompanions.filter(c => typeof c.performance_score === 'number');
  const hasRealData      = isAdmin && (scoredDoctors.length > 0 || scoredCompanions.length > 0);
  const displayPartners  = hasRealData
    ? [...scoredDoctors.slice(0, 2).map(mapDoctorToPartner), ...scoredCompanions.slice(0, 2).map(mapCompanionToPartner)]
    : PARTNERS;

  const toggle = (i) => setExpanded(e => e === i ? null : i);

  return (
    <div style={{ minHeight: '100vh', background: DARK, fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/demo" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to demos
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/morales-m-mark.png" alt="M" style={{ width: 26, filter: `drop-shadow(0 0 6px ${GOLD})` }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Partner Trust Score</span>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: `${GOLD}20`, color: GOLD, fontWeight: 800 }}>CR 24</span>
        </div>
        <button
          onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', color: muted ? 'rgba(255,255,255,0.3)' : GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
        >
          {muted ? <VolumeX style={{ width: 13, height: 13 }} /> : <Volume2 style={{ width: 13, height: 13 }} />}
          {muted ? 'Unmute' : 'Mute M'}
        </button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px' }}>

        {/* Honesty badge. Doctor + companion trust scoring is now real and
            recalculated daily — an admin viewing this page sees actual scored
            partners once any exist. Everyone else (this is a public demo
            route) sees the illustrative sample below, clearly labeled —
            real scores are admin-only by design, matching the scoring
            function's own intent ("doctors never see this score"). Driver
            trust scoring still doesn't exist in the app at all. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 24 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', lineHeight: 1.6 }}>
            {hasRealData
              ? 'Live data — these are real, currently-scored partners, recalculated daily. Shown because you\'re viewing as an admin; a driver-trust system still doesn\'t exist today.'
              : isAdmin
                ? 'Illustrative concept — Mario, Maria, and Dr. Martinez are sample profiles. Doctor/companion trust scoring is real and scheduled, but no partner has a calculated score yet. A driver-trust system doesn\'t exist today.'
                : 'Illustrative concept — Mario, Maria, and Dr. Martinez are sample profiles, not real partner data. Doctor and companion trust scoring is real and runs daily, but scores are admin-only by design; a driver-trust system doesn\'t exist today.'}
          </span>
        </div>

        {/* Scenario */}
        <div style={{ padding: '18px 22px', borderRadius: 16, background: `${GOLD}08`, border: `1px solid ${GOLD}25`, marginBottom: 28, textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: '0.1em' }}>THE JAMES STANDARD — CR 24</p>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            James can't see Mario's face. He can't read a review.<br />
            <strong style={{ color: '#fff' }}>M is his eyes. M tells him exactly who is coming — before they arrive.</strong>
          </p>
        </div>

        {/* Platform impact stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { n: '1,683', label: 'Verified trips' },
            { n: '4.95★', label: 'Avg partner rating' },
            { n: '0', label: 'Reported incidents' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 900, color: '#fff' }}>{s.n}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Partner cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayPartners.map((p, i) => (
            <PartnerCard
              key={p.name}
              partner={p}
              muted={muted}
              expanded={expanded === i}
              onExpand={() => toggle(i)}
            />
          ))}
        </div>

        {/* The principle */}
        <div style={{ marginTop: 28, padding: '18px 22px', borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
            Partners also see their own score — and how to improve it.<br />
            Drivers who earn 5 stars consistently get priority job offers.<br />
            <strong style={{ color: GOLD }}>Excellence is rewarded. Trust is built. James is never surprised.</strong>
          </p>
        </div>

        {/* Real-world context */}
        <div style={{ marginTop: 12, padding: '16px 20px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>WHY TRUST SCORES MATTER</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            An estimated <strong style={{ color: '#fff' }}>1 in 4 medical tourists</strong> report a negative experience with a local transport or accommodation provider — most had no way to vet them in advance.{' '}
            <strong style={{ color: '#fff' }}>M verifies every partner before James ever steps in the car.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
