import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HandshakeButton from '@/components/journey/HandshakeButton';
import GoldenMCelebration from '@/components/journey/GoldenMCelebration';
import { IdentityCard, IdentityUpload } from '@/components/ThisIsMe';

const GOLD = '#D4AF37';

// ── Safety state config — the ONLY thing the patient sees ────────────────────
const PULSE = {
  SAFE: {
    color:    '#22c55e',
    glow:     'rgba(34,197,94,0.4)',
    ring:     'rgba(34,197,94,0.12)',
    bg:       'rgba(34,197,94,0.06)',
    border:   'rgba(34,197,94,0.20)',
    icon:     '🛡️',
    headline: 'You are safe.',
    sub:      'We are watching.',
  },
  WATCH: {
    color:    '#f59e0b',
    glow:     'rgba(245,158,11,0.4)',
    ring:     'rgba(245,158,11,0.12)',
    bg:       'rgba(245,158,11,0.06)',
    border:   'rgba(245,158,11,0.20)',
    icon:     '⚠️',
    headline: 'We notice something unusual.',
    sub:      'We are checking in.',
  },
  ALERT: {
    color:    '#ef4444',
    glow:     'rgba(239,68,68,0.4)',
    ring:     'rgba(239,68,68,0.12)',
    bg:       'rgba(239,68,68,0.06)',
    border:   'rgba(239,68,68,0.20)',
    icon:     '🚨',
    headline: 'We are acting.',
    sub:      'Help is on the way.',
  },
};
PULSE.CRITICAL = PULSE.ALERT; // Patient sees same message for both

// ── "Your Safety Net" — 3 cards, plain language, no jargon ──────────────────
const SAFETY_NET = [
  {
    icon:  '🛡️',
    title: 'Missed a checkpoint?',
    body:  'We automatically reroute your itinerary and alert your security team. You never have to figure it out alone.',
  },
  {
    icon:  '📡',
    title: 'No signal?',
    body:  'We switch to SMS, satellite backup, and QR code fallbacks so you are never unreachable — even in remote areas.',
  },
  {
    icon:  '🧠',
    title: 'We watch for patterns.',
    body:  'MedGuard™ detects unusual behaviour before you need to ask for help — and our team is notified immediately.',
  },
];

export default function SafeT() {
  const [user,                 setUser]                 = useState(null);
  const [showGoldenM,          setShowGoldenM]          = useState(false);
  const [uploadingPatientPhoto, setUploadingPatientPhoto] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  // Latest consultation — for case_id lookup
  const { data: consultation } = useQuery({
    queryKey: ['safet-consultation', user?.email],
    queryFn:  () => base44.entities.Consultation.filter(
      { email: user.email }, '-created_date', 1
    ).then(r => r[0] ?? null),
    enabled:   !!user?.email,
    staleTime: 60_000,
  });

  // Active journey — drives "your next step" section
  const { data: activeTrip } = useQuery({
    queryKey: ['safet-active-trip', user?.email],
    queryFn:  async () => {
      const trips = await base44.entities.TravelRequest.filter({ user_email: user.email });
      return trips.find(t =>
        ['pre_departure','transit_out','arrived','recovery','transit_return'].includes(t.trip_phase)
      ) ?? null;
    },
    enabled:   !!user?.email,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  // Case record — for stored MedGuard risk level
  const caseId = activeTrip?.case_id || consultation?.case_id;
  const { data: caseRecord } = useQuery({
    queryKey: ['safet-case', caseId],
    queryFn:  () => base44.entities.CaseRecord.get(caseId),
    enabled:   !!caseId,
    staleTime: 120_000,
  });

  // Pre-compute next step so partner queries can gate on it
  const _ns = (activeTrip?.current_step ?? 0) + 1;

  // Partner identity photos — fetched only for the relevant upcoming step
  const { data: chauffeur } = useQuery({
    queryKey: ['safet-chauffeur', activeTrip?.chauffeur_id],
    queryFn:  () => base44.entities.TaxiService.get(activeTrip.chauffeur_id),
    enabled:   !!activeTrip?.chauffeur_id && (_ns === 1 || _ns === 7),
    staleTime: 300_000,
  });
  const { data: companion } = useQuery({
    queryKey: ['safet-companion', activeTrip?.companion_id],
    queryFn:  () => base44.entities.Companion.get(activeTrip.companion_id),
    enabled:   !!activeTrip?.companion_id && _ns === 6,
    staleTime: 300_000,
  });
  const { data: doctor } = useQuery({
    queryKey: ['safet-doctor', caseRecord?.doctor_id],
    queryFn:  () => base44.entities.Doctor.get(caseRecord.doctor_id),
    enabled:   !!caseRecord?.doctor_id && _ns === 5,
    staleTime: 300_000,
  });

  const uploadPatientPhoto = async (file) => {
    if (!activeTrip?.id) return;
    setUploadingPatientPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TravelRequest.update(activeTrip.id, { patient_identity_photo_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['safet-active-trip'] });
    } catch (_) {}
    setUploadingPatientPhoto(false);
  };

  // Derive safety state — no score, no math, only the outcome
  const storedLevel = caseRecord?.medguard_risk_level;
  const riskLevel   = (storedLevel && PULSE[storedLevel]) ? storedLevel : 'SAFE';
  const pulse       = PULSE[riskLevel];

  const currentStep      = activeTrip?.current_step ?? 0;
  const nextStep         = currentStep + 1;
  const isComplete       = activeTrip?.trip_phase === 'completed';
  const hasActiveJourney = !!activeTrip && !isComplete;
  const progressPct      = Math.round((currentStep / 9) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#060B16', color: '#fff' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 64px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <p style={{
            fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: GOLD, fontWeight: 700, margin: 0,
          }}>
            Safe-T 4Life™
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
            Morales Medical Travel Safety · Always On
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — THE PULSE
            "Am I safe right now?" — answered in 1 second
        ══════════════════════════════════════════════════════════════ */}
        <motion.div
          key={riskLevel}
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:    pulse.bg,
            border:        `1px solid ${pulse.border}`,
            borderRadius:  28,
            padding:       '44px 24px 36px',
            marginBottom:  20,
            textAlign:     'center',
          }}
        >
          {/* Orb */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 32px' }}>
            {/* Outer slow pulse */}
            <motion.div
              animate={{ scale: [1, 1.22, 1], opacity: [0.28, 0, 0.28] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: -28, borderRadius: '50%',
                background: `radial-gradient(circle, ${pulse.glow} 0%, transparent 68%)`,
              }}
            />
            {/* Mid ring */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.22, 0, 0.22] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
              style={{
                position: 'absolute', inset: -6, borderRadius: '50%',
                border: `2px solid ${pulse.color}45`,
              }}
            />
            {/* Core orb */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: `radial-gradient(circle at 36% 32%, ${pulse.color}bb 0%, ${pulse.color}66 50%, ${pulse.color}28 100%)`,
                boxShadow:  `0 0 48px ${pulse.glow}, 0 0 96px ${pulse.ring}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 60, filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.4))' }}>
                {pulse.icon}
              </span>
            </motion.div>
          </div>

          {/* Human language — no numbers, no scores */}
          <h1 style={{
            margin: '0 0 10px',
            fontFamily: 'Georgia, serif',
            fontSize: 30, fontWeight: 400,
            color: '#fff', lineHeight: 1.2,
          }}>
            {pulse.headline}
          </h1>
          <p style={{
            margin: 0, fontSize: 18,
            color: pulse.color, fontWeight: 600, letterSpacing: '0.01em',
          }}>
            {pulse.sub}
          </p>

          {/* Live indicator */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: pulse.color, display: 'inline-block' }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {hasActiveJourney ? 'Live · Monitoring now' : 'Ready · Monitoring begins when your journey starts'}
            </span>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — THE ONE ACTION
            What do I do next? — answered with one button
        ══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          style={{
            background:   '#0C1A1D',
            border:       '1px solid #2A3F4A',
            borderRadius: 24,
            padding:      '28px 24px',
            marginBottom: 20,
          }}
        >
          <p style={{
            margin: '0 0 18px', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD,
          }}>
            Your Next Step
          </p>

          {hasActiveJourney ? (
            <>
              <HandshakeButton
                tripId={activeTrip.id}
                caseId={activeTrip.case_id}
                currentStep={currentStep}
                user={user}
                shortcode={null}
                onComplete={({ is_complete }) => {
                  queryClient.invalidateQueries({ queryKey: ['safet-active-trip'] });
                  if (is_complete) setShowGoldenM(true);
                }}
              />

              {/* Progress bar */}
              <div style={{ marginTop: 22 }}>
                <div style={{
                  height: 5, borderRadius: 999,
                  background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    style={{ height: '100%', background: GOLD, borderRadius: 999 }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                  Step {currentStep} of 9 · Your Journey
                </p>
              </div>
            </>
          ) : isComplete ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 36 }}>⭐</span>
              <p style={{ margin: '12px 0 0', fontSize: 15, color: GOLD, fontWeight: 700 }}>Journey Complete</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                All 9 checkpoints confirmed. The Golden M is yours.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, textAlign: 'center' }}>
              No active journey yet.<br />
              When your journey begins, your next step will appear here.
            </p>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2.5 — THIS IS ME™
            Know who you're meeting — verified photos, protected display
        ══════════════════════════════════════════════════════════════ */}
        {hasActiveJourney && (nextStep === 1 || nextStep === 5 || nextStep === 6 || nextStep === 7) && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            style={{ background: '#0C1A1D', border: '1px solid #2A3F4A', borderRadius: 24, padding: '28px 24px', marginBottom: 20 }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>
              This Is Me™
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {(nextStep === 1 || nextStep === 7)
                ? 'Confirm your driver and vehicle before you get in the car.'
                : nextStep === 5
                ? 'Confirm your doctor and clinic before you walk in.'
                : 'Confirm your companion before they arrive.'}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(nextStep === 1 || nextStep === 7) && (
                <>
                  <IdentityCard
                    name={chauffeur?.driver_name || chauffeur?.service_name || 'Your Driver'}
                    role="Driver"
                    photoUrl={chauffeur?.driver_identity_photo_url}
                    sublabel={chauffeur?.vehicle_model}
                  />
                  <IdentityCard
                    name={chauffeur?.vehicle_plate || 'Your Vehicle'}
                    role="Vehicle"
                    photoUrl={chauffeur?.vehicle_photo_url}
                    sublabel={chauffeur?.vehicle_color}
                  />
                </>
              )}
              {nextStep === 5 && (
                <>
                  <IdentityCard
                    name={doctor?.full_name || doctor?.name || 'Your Doctor'}
                    role="Doctor"
                    photoUrl={doctor?.photo_url || doctor?.identity_photo_url}
                    sublabel={doctor?.specialty}
                  />
                  <IdentityCard
                    name={doctor?.clinic_name || 'Your Clinic'}
                    role="Clinic"
                    photoUrl={doctor?.clinic_exterior_photo_url}
                    sublabel={doctor?.clinic_country}
                  />
                </>
              )}
              {nextStep === 6 && (
                <IdentityCard
                  name={companion?.full_name || companion?.name || 'Your Companion'}
                  role="Companion"
                  photoUrl={companion?.identity_photo_url}
                  sublabel={null}
                />
              )}
            </div>

            {/* Patient's own photo upload */}
            <div style={{ marginTop: 20, borderTop: '1px solid rgba(42,63,74,0.5)', paddingTop: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <IdentityUpload
                label="My Photo"
                hint="Shown to your assigned partner only."
                photoUrl={activeTrip?.patient_identity_photo_url}
                onUpload={uploadPatientPhoto}
                uploading={uploadingPatientPhoto}
                capture="user"
              />
              <p style={{ flex: 2, minWidth: 160, margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.75 }}>
                Your photo is only visible to your assigned{' '}
                {nextStep === 5 ? 'doctor' : nextStep === 6 ? 'companion' : 'driver'}{' '}
                during this journey. It cannot be saved or shared. It disappears when your journey is complete.
              </p>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — THE SAFETY NET
            What if something goes wrong? — answered simply
        ══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.40, duration: 0.5 }}
          style={{
            background:   '#0C1A1D',
            border:       '1px solid #2A3F4A',
            borderRadius: 24,
            padding:      '28px 24px',
          }}
        >
          <p style={{
            margin: '0 0 20px', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD,
          }}>
            Your Safety Net — How We Protect You
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SAFETY_NET.map(({ icon, title, body }) => (
              <div
                key={title}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(42,63,74,0.7)',
                  borderRadius: 16, padding: '16px 18px',
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</span>
                <div>
                  <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{
            margin: '22px 0 0', fontSize: 12,
            color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 1.6,
          }}>
            Protected by MedGuard™ · Morales Medical Travel Safety · 24 / 7
          </p>
        </motion.div>

      </div>

      {showGoldenM && (
        <GoldenMCelebration
          visible
          trip={activeTrip}
          patientName={user?.full_name || user?.email || ''}
          onClose={() => setShowGoldenM(false)}
        />
      )}
    </div>
  );
}
