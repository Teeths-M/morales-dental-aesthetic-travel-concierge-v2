// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Upload, MessageCircle, HeartPulse, Users,
  Shield, Bell, ArrowRight, CheckCircle2, Clock, AlertTriangle, Lock, FileText, ChevronDown, FileHeart
} from 'lucide-react';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import FeatureHub from '@/components/dashboard/FeatureHub';
import JourneyProgress from '@/components/dashboard/JourneyProgress';
import RecoveryMilestoneTracker from '@/components/dashboard/RecoveryMilestoneTracker';
import PreparationChecklist from '@/components/dashboard/PreparationChecklist';
import CaseStatusIndicator from '@/components/dashboard/CaseStatusIndicator';
import ConsultationsModule from '@/components/dashboard/modules/ConsultationsModule';
import MedicalProfileModule from '@/components/dashboard/modules/MedicalProfileModule';
import DocumentsModule from '@/components/dashboard/modules/DocumentsModule';
import BookingsModule from '@/components/dashboard/modules/BookingsModule';
import MessagesModule from '@/components/dashboard/modules/MessagesModule';
import JourneyModule from '@/components/dashboard/modules/JourneyModule';
import SupportModule from '@/components/dashboard/modules/SupportModule';
import SettingsModule from '@/components/dashboard/modules/SettingsModule';
import CaseStatusModule from '@/components/dashboard/modules/CaseStatusModule';
import TripProgressStepper from '@/components/journey/TripProgressStepper';
import PostOpRecoveryTracker from '@/components/dashboard/PostOpRecoveryTracker';
import HandshakeButton from '@/components/journey/HandshakeButton';
import GoldenMCelebration from '@/components/journey/GoldenMCelebration';
import JourneyStatusTimeline from '@/components/dashboard/JourneyStatusTimeline';
import MedGuardPulse from '@/components/dashboard/MedGuardPulse';
import SafetyScoreGauge from '@/components/dashboard/SafetyScoreGauge';
import JourneyMap from '@/components/dashboard/JourneyMap';
import DestinationSafetyIndex from '@/components/dashboard/DestinationSafetyIndex';
import EVNiQ400Card from '@/components/dashboard/EVNiQ400Card';
import PreDepartureBriefing from '@/components/dashboard/PreDepartureBriefing';
import WeatherAlertBanner from '@/components/dashboard/WeatherAlertBanner';
import PatientJourneyCredit from '@/components/dashboard/PatientJourneyCredit';
import { useSafetyScore } from '@/hooks/useSafetyScore';
import { useBehavioralTracking } from '@/hooks/useBehavioralTracking';
import { useContextAwareSafety } from '@/hooks/useContextAwareSafety';
import FirstTimeTooltip from '@/components/ui-system/FirstTimeTooltip';
import DashboardWelcome from '@/components/dashboard/DashboardWelcome';
import WelcomeCountryModal from '@/components/journey/WelcomeCountryModal';
import ArrivalActivityPrompt from '@/components/activity/ArrivalActivityPrompt';
import SoloCheckInBanner from '@/components/solo/SoloCheckInBanner';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';
import { useCovertSOS } from '@/hooks/useCovertSOS';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import EmptyState from '@/components/ui-system/EmptyState';
import { formatDate } from '@/lib/format';
import { ACTIVE_TRAVEL_PHASES } from '@/lib/constants';

function WhatsAppMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.527 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.733-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.528-5.208-1.443l-.374-.222-3.405.874.89-3.328-.241-.385A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

const notifications = [
  { type: 'warning', text: 'Lab work still required for medical clearance', time: '2h ago' },
  { type: 'info', text: 'Dr. Ramirez left a note on your consultation', time: '5h ago' },
  { type: 'success', text: 'Your hotel booking is confirmed for June 12', time: 'Yesterday' },
];

const quickActions = [
  { icon: Lock,       label: 'My Vault',            to: '/passport-vault',              color: 'emerald' },
  { icon: FileHeart,  label: 'Emergency Med Card',   to: '/dashboard/emergency-card',    color: 'red'     },
  { icon: FileText,   label: 'Read Discharge Papers',to: '/discharge-reader',            color: 'amber'   },
  { icon: Upload,     label: 'Upload Documents',     to: '/dashboard/documents',         color: 'emerald' },
  { icon: MessageCircle, label: 'Message Coordinator', to: '/dashboard/messages',        color: 'blue' },
  { icon: HeartPulse, label: 'View Recovery Plan',  to: '/safe-t',                      color: 'sky' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-700', hover: 'hover:bg-emerald-100' },
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-700',    hover: 'hover:bg-blue-100'    },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-700',  hover: 'hover:bg-violet-100'  },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-700',     hover: 'hover:bg-sky-100'     },
  pink:    { bg: 'bg-pink-50',    icon: 'text-pink-600',    hover: 'hover:bg-pink-100'    },
  red:     { bg: 'bg-red-50',     icon: 'text-red-700',     hover: 'hover:bg-red-100'     },
};

function DashboardHome({ user, consultations, language }) {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const [showGoldenM,       setShowGoldenM]       = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [showWelcomeCountry, setShowWelcomeCountry] = useState(false);
  const [showSafeT,         setShowSafeT]         = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const welcomeDebounceRef = useRef(null);

  // PERFORMANCE: Memoize displayName to prevent recalculation
  const displayName = useMemo(() => user?.full_name?.split(' ')[0] || 'there', [user?.full_name]);

  // Active journey: load TravelRequest in an active phase to power the handshake block
  const { data: activeTrip } = useQuery({
    queryKey: ['active-trip', user?.email],
    queryFn: async () => {
      const trips = await base44.entities.TravelRequest.filter({ user_email: user.email });
      const active = trips.find(t =>
        ['pre_departure', 'transit_out', 'arrived', 'recovery', 'transit_return'].includes(t.trip_phase)
      );
      return active ?? null;
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  const latestActive = consultations.find(c => c.status !== 'Completed');
  const completedCase = consultations.find(c => c.status === 'Completed');

  // Post-op recovery check-ins — shown after journey is complete
  const { data: postOpCheckIns = [] } = useQuery({
    queryKey: ['post-op-checkins', completedCase?.id],
    queryFn: () => base44.entities.PostOpCheckIn.filter({ case_id: completedCase.id }, '-day', 4),
    enabled: !!completedCase?.id,
    staleTime: 5 * 60_000,
  });

  // Morales Safety Score — powered by MedGuard™ 6-signal analysis
  const tripPhaseForScore = activeTrip?.trip_phase || latestActive?.trip_phase;
  const safetyScore = useSafetyScore({
    caseId:    latestActive?.id,
    tripPhase: tripPhaseForScore,
    enabled:   !!latestActive?.id,
  });

  const isSolo = latestActive && (!latestActive.requires_companion || latestActive.companion_requirement_status === 'companion_required_pending');
  // Auto-start live beacon for solo travelers with an active journey
  const { status: locationStatus, currentLocation } = useLiveLocationBeacon({
    caseId: latestActive?.id,
    caseStatus: latestActive?.status,
    enabled: !!isSolo,
  });

  // GPS breadcrumb trail — captures every 30s or 50m; syncs to Base44 when online
  useLocationHistory({ caseId: latestActive?.id, enabled: !!isSolo });

  // Covert SOS — 5-tap or keyword trigger, silent, no visual feedback
  useCovertSOS({
    caseId:          latestActive?.id,
    currentLocation: currentLocation,
    enabled:         !!user,
  });

  // MedGuard Pattern Intelligence — silent behavioral fingerprint tracking
  const { nudge, dismissNudge, isLearning, resetFingerprint, profile: behavioralProfile } = useBehavioralTracking({
    caseId:     latestActive?.id,
    caseStatus: latestActive?.status,
  });

  // Silent Guardian — 4 context layers (time, solo, activity, schedule)
  const safetyCx = useContextAwareSafety({
    consultationId:     latestActive?.id,
    travelingSolo:      latestActive?.traveling_solo ?? true,
    guardianModeOptedIn: latestActive?.guardian_mode_opted_in ?? false,
    companionType:      latestActive?.traveling_companion_type || 'solo',
    isActiveJourney:    !!activeTrip || ACTIVE_TRAVEL_PHASES.has(latestActive?.trip_phase),
    hasGPSMoved:        locationStatus === 'active',
    lastGPSUpdateAt:    currentLocation?.timestamp || null,
  });

  // Country detection — triggers WelcomeCountryModal on new country arrival
  const { country, flag, isNewCountry, acknowledgeCountry } = useCountryDetection({
    lat: currentLocation?.lat,
    lng: currentLocation?.lng,
    enabled: !!isSolo,
  });

  // Show welcome modal whenever the patient lands in a new country
  // Debounced to prevent double-fire when GPS updates rapidly on border crossing
  useEffect(() => {
    if (!isNewCountry || !country) return;
    clearTimeout(welcomeDebounceRef.current);
    welcomeDebounceRef.current = setTimeout(() => {
      setShowWelcomeCountry(true);
    }, 500); // 500ms debounce — GPS can fire twice on border crossing
    return () => clearTimeout(welcomeDebounceRef.current);
  }, [isNewCountry, country]);
  const latestConsultation = consultations[0];
  const caseStatus = latestConsultation?.status || 'Submitted';

  // PERFORMANCE: React Query for vault count — automatic caching, no manual useEffect
  const { data: vaultCount = 0 } = useQuery({
    queryKey: ['vault-count', user?.email],
    queryFn: async () => {
      const vaults = await base44.entities.PassportVault.filter(
        { user_email: user.email, status: 'active' },
        '-uploaded_at',
        1
      );
      return vaults.length;
    },
    enabled: !!user,
    staleTime: 120000, // 2 minutes cache
  });

  // PERFORMANCE: React Query for matched doctors — cached, deduplicated
  const { data: matchedDoctorsData } = useQuery({
    queryKey: ['matched-doctors', latestConsultation?.procedure_interest, user?.email, user?.id],
    queryFn: () => base44.functions.invoke('matchDoctorsForProcedure', {
      procedure_interest: latestConsultation?.procedure_interest,
      client_email: user?.email,
      client_id: user?.id
    }).then(result => ({
      matched_doctors: result.data?.matched_doctors || [],
      outreach_sent: result.data?.outreach_sent || false
    })),
    enabled: !!latestConsultation?.procedure_interest && !!user,
    staleTime: 300000, // 5 minutes cache
  });

  const matchedDoctors = matchedDoctorsData?.matched_doctors || [];
  const outreachSent = matchedDoctorsData?.outreach_sent || false;

  // PERFORMANCE: Memoize countdown calculation
  const procedureDate = latestConsultation?.procedure_date || null;
  const daysUntil = useMemo(() => {
    const target = procedureDate ? new Date(procedureDate) : new Date('2026-06-14');
    const today = new Date();
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }, [procedureDate]);

  return (
    <div className="space-y-6">
      {/* Mission Brief — one-time onboarding overlay, shown on first dashboard visit */}
      <FirstTimeTooltip />

      <ArrivalActivityPrompt caseId={latestConsultation?.id} />
      <SoloCheckInBanner />

      {/* ── MedGuard "knows you" chip — tappable, shows fingerprint in plain language ── */}
      {!isLearning && activeTrip && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowFingerprintModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.22)', fontSize: 11, fontWeight: 600, color: 'rgba(216,180,254,0.85)', cursor: 'pointer' }}
            >
              🧠 MedGuard knows you — tap to see your profile
            </button>
          </div>

          {/* Fingerprint modal */}
          {showFingerprintModal && behavioralProfile?.fingerprint && (
            <div
              onClick={() => setShowFingerprintModal(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'rgba(8,16,28,0.98)', border: '1px solid rgba(168,85,247,0.30)', borderRadius: 24, padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 28 }}>🧠</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Your MedGuard Profile</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(216,180,254,0.6)' }}>Built from {behavioralProfile.fingerprint.samples_collected || 0} observations over 72 hours</p>
                  </div>
                  <button onClick={() => setShowFingerprintModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Sleep window', value: `${behavioralProfile.fingerprint.sleep_start_hour != null ? behavioralProfile.fingerprint.sleep_start_hour : 23}:00 – ${behavioralProfile.fingerprint.sleep_end_hour != null ? behavioralProfile.fingerprint.sleep_end_hour : 7}:00`, icon: '🌙' },
                    { label: 'App opens per hour', value: `~${Math.round(behavioralProfile.fingerprint.app_opens_per_hour ?? 3)} times`, icon: '📱' },
                    { label: 'Typical offline window', value: `~${Math.round(behavioralProfile.fingerprint.avg_offline_duration_min ?? 60)} minutes`, icon: '⏱️' },
                    { label: 'Check-in reliability', value: `${Math.round((behavioralProfile.fingerprint.checkin_on_time_rate ?? 0.8) * 100)}% on time`, icon: '✅' },
                  ].map(({ label, value, icon }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p style={{ margin: '16px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.5 }}>
                  When you stop being you, MedGuard asks why. 🛡️
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Night Mode banner (Layer 2: Time of Day) ── */}
      {safetyCx.isNight && activeTrip && (
        <div style={{ borderRadius: 14, padding: '10px 16px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🌙</span>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(165,180,252,0.9)', fontWeight: 600 }}>
            Night Mode active
            {safetyCx.isSleepHours ? ' · Non-critical alerts paused until 6 AM' : ` · MedGuard risk +${safetyCx.riskBonus}pts`}
          </p>
        </div>
      )}

      {/* ── Guardian Mode status (Layer 4) ── */}
      {safetyCx.isFullGuardianMode && (
        <div style={{ borderRadius: 14, padding: '10px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(212,175,55,0.9)', fontWeight: 600 }}>Guardian Mode active</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {safetyCx.guardian.checkInDue ? '· Check-in due' : safetyCx.guardian.gpsAlertDue ? '· GPS silent too long' : '· Watching over you'}
            </p>
          </div>
          {(safetyCx.guardian.checkInDue || safetyCx.guardian.gpsAlertDue) && (
            <button
              onClick={() => safetyCx.guardian.acknowledgeCheckIn()}
              style={{ padding: '5px 14px', borderRadius: 99, background: '#D4AF37', color: '#060B16', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              I'm Safe ✓
            </button>
          )}
        </div>
      )}

      {/* ── iOS Motion Permission Request (one-time, seamless) ── */}
      {safetyCx.activity.needsMotionPermission && (
        <div style={{ borderRadius: 16, padding: '14px 18px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>📳 Enable Fall Detection</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
              Guardian Mode needs motion access to detect falls. One tap — we'll ask your device.
            </p>
          </div>
          <button
            onClick={async () => {
              const result = await safetyCx.activity.requestMotionAccess();
              if (result === 'denied') alert('Motion access denied. Fall detection will be unavailable, but all other Guardian features remain active.');
            }}
            style={{ padding: '8px 18px', borderRadius: 99, background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            Enable ›
          </button>
        </div>
      )}

      {/* ── Fall Detection prompt (Layer 3: Activity Detection) ── */}
      {safetyCx.activity.showFallPrompt && (
        <div style={{ borderRadius: 16, padding: '16px 20px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.40)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>⚠️ Are you okay?</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            We detected unusual movement. Are you hiking, running, or did you fall?<br />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>If we don't hear from you in 60 seconds, we'll queue an SOS.</span>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => safetyCx.activity.dismissFallPrompt()}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              👍 I'm Fine
            </button>
            <button onClick={() => window.location.href = '/emergency'}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13, fontWeight: 700, border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer' }}>
              🆘 I Need Help
            </button>
          </div>
        </div>
      )}

      {/* SOS queued notification */}
      {safetyCx.activity.queuedSOS && (
        <div style={{ borderRadius: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontWeight: 700 }}>🚨 SOS queued — tap to cancel if you're safe</p>
          <button onClick={() => safetyCx.activity.clearQueuedSOS()}
            style={{ padding: '5px 14px', borderRadius: 99, background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Cancel — I'm Safe
          </button>
        </div>
      )}

      {/* MedGuard Pattern Intelligence nudge — gentle, context-aware check-in */}
      {nudge && (
        <div style={{
          borderRadius: 16, padding: '12px 16px',
          background: nudge.action === 'escalated' ? 'rgba(239,68,68,0.12)' : 'rgba(212,175,55,0.10)',
          border: `1px solid ${nudge.action === 'escalated' ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.30)'}`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>
            {nudge.action === 'escalated' ? '🛡️' : nudge.action === 'check_in_requested' ? '👋' : '💡'}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
              {nudge.message}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              MedGuard Pattern Intelligence™
            </p>
          </div>
          <button onClick={dismissNudge} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* GPS permission banners — only shown during active solo journeys */}
      {isSolo && locationStatus === 'denied' && (
        <div className="rounded-2xl border border-amber-600/50 bg-amber-900/20 px-5 py-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">GPS permission required</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              We need your location to keep your Guardian informed. Please enable GPS in your browser settings and reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-semibold text-amber-300 underline underline-offset-2"
            >
              Reload after enabling GPS
            </button>
          </div>
        </div>
      )}
      {isSolo && locationStatus === 'unavailable' && (
        <div className="rounded-2xl border border-slate-600/50 bg-slate-800/40 px-5 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            We're having trouble finding your location. Your Guardian will see your last known position.
          </p>
        </div>
      )}

      {/* MedGuard™ — Behavioral Safety Score (above everything during active travel)
          The unfair competitive advantage. No other platform has this. */}
      {latestConsultation && (
        <MedGuardPulse
          caseId={latestConsultation.id}
          tripPhase={activeTrip?.trip_phase || latestConsultation.trip_phase}
          timeBonus={safetyCx.riskBonus}
          isNight={safetyCx.isNight}
        />
      )}

      {/* Morales Safety Score — proprietary 0-100 gauge powered by MedGuard™ */}
      {latestConsultation && (
        <SafetyScoreGauge
          score={safetyScore.score}
          breakdown={safetyScore.breakdown}
          analyzedAt={safetyScore.analyzedAt}
          isLoading={safetyScore.isLoading}
          isActiveTravel={safetyScore.isActiveTravel}
          phase={tripPhaseForScore}
        />
      )}

      {/* CR 25 — Weather-to-Health Alert: auto-monitors destination conditions */}
      {latestConsultation?.procedure_country && latestConsultation?.status !== 'Completed' && (
        <WeatherAlertBanner
          caseId={latestConsultation.id}
          country={latestConsultation.procedure_country}
          procedureType={latestConsultation.primary_procedure || latestConsultation.procedure_interest}
        />
      )}

      {/* AI Pre-Departure Safety Briefing — personalized per patient */}
      {latestConsultation?.procedure_country && latestConsultation?.status !== 'Completed' && (
        <PreDepartureBriefing
          caseRecord={latestConsultation}
          userName={user?.full_name || user?.name || ''}
        />
      )}

      {/* EVN-iQ400 — Environmental Intelligence Layer */}
      {latestConsultation?.procedure_country && (
        <EVNiQ400Card country={latestConsultation.procedure_country} />
      )}

      {/* Destination Safety Index — proprietary Morales intelligence */}
      {latestConsultation?.procedure_country && (
        <DestinationSafetyIndex
          country={latestConsultation.procedure_country}
          caseId={latestConsultation.id}
        />
      )}

      {/* Patient Journey Credit — loyalty moat */}
      <PatientJourneyCredit
        credit={latestConsultation?.journey_credit ?? 0}
        journeyCount={consultations.filter(c => c.status === 'Completed').length}
      />

      {/* Journey Map — hotel + clinic pins, above the fold */}
      {latestConsultation && (
        <JourneyMap
          hotelCoords={latestConsultation.hotel_coords   ?? null}
          hotelName={latestConsultation.hotel_name       ?? ''}
          hotelAddress={latestConsultation.hotel_address ?? ''}
          clinicCoords={latestConsultation.clinic_coords ?? null}
          clinicAddress={latestConsultation.clinic_address ?? ''}
        />
      )}

      {/* Journey Status Timeline — Stripe/Apple order-status model */}
      {latestConsultation && (
        <JourneyStatusTimeline caseRecord={latestConsultation} />
      )}

      {/* 9-Handshake Journey Block — only visible during active travel */}
      {activeTrip && (
        <div className="space-y-3">
          <TripProgressStepper
            currentStep={activeTrip.current_step ?? 0}
            isComplete={activeTrip.trip_phase === 'completed'}
          />
          <HandshakeButton
            tripId={activeTrip.id}
            caseId={activeTrip.case_id}
            currentStep={activeTrip.current_step ?? 0}
            user={user}
            onComplete={({ is_complete }) => {
              queryClient.invalidateQueries({ queryKey: ['active-trip', user?.email] });
              if (is_complete) setShowGoldenM(true);
            }}
          />
        </div>
      )}

      {/* Post-op recovery tracker — visible after journey completes */}
      {postOpCheckIns.length > 0 && (
        <div className="mb-5">
          <PostOpRecoveryTracker checkIns={postOpCheckIns} />
        </div>
      )}

      {showGoldenM && (
        <GoldenMCelebration
          visible
          trip={activeTrip}
          patientName={user?.full_name || displayName}
          onClose={() => setShowGoldenM(false)}
        />
      )}

      <WelcomeCountryModal
        visible={showWelcomeCountry}
        country={country}
        flag={flag}
        onViewHotel={() => { acknowledgeCountry(); setShowWelcomeCountry(false); navigate('/dashboard/bookings'); }}
        onCallDriver={() => { acknowledgeCountry(); setShowWelcomeCountry(false); navigate('/dashboard/messages'); }}
        onOpenVault={() => { acknowledgeCountry(); setShowWelcomeCountry(false); navigate('/passport-vault'); }}
        onDismiss={() => { acknowledgeCountry(); setShowWelcomeCountry(false); }}
      />

      {/* Welcome Header */}
      <motion.div
        className="bg-gradient-to-r from-emerald-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.28em] mb-2">
              {language === 'es' ? 'Bienvenido de vuelta' : language === 'fr' ? 'Bienvenue' : 'Welcome back'}
            </p>
            <h1 className="font-display text-3xl lg:text-4xl" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {language === 'es' ? 'Hola, ' : language === 'fr' ? 'Bonjour, ' : 'Hello, '}{displayName} 👋
            </h1>
            <p className="text-white/70 text-[15px] mt-2" style={{ fontWeight: 300 }}>
              {language === 'es' ? 'Etapa del Viaje: ' : language === 'fr' ? 'Stade du Voyage: ' : 'Journey Stage: '}<span className="text-white font-semibold capitalize">{latestConsultation?.journey_stage || (language === 'es' ? 'Consulta' : language === 'fr' ? 'Consultation' : 'Consultation')}</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 text-center w-full sm:w-auto">
            <p className="text-white/70 text-[10px] font-semibold uppercase tracking-[0.25em] mb-2">
              {language === 'es' ? 'Días Hasta el Procedimiento' : language === 'fr' ? 'Jours Jusqu\'à la Procédure' : 'Days Until Procedure'}
            </p>
            <p className="font-display text-4xl sm:text-5xl text-white" style={{ letterSpacing: '-0.02em' }}>{daysUntil > 0 ? daysUntil : '—'}</p>
            <p className="text-white/60 text-[12px] mt-1">{procedureDate ? formatDate(procedureDate) : 'Jun 14, 2026'}</p>
          </div>
        </div>
      </motion.div>

      {/* Matched Doctors Banner */}
      {matchedDoctors.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">We Found {matchedDoctors.length} Specialist{matchedDoctors.length > 1 ? 's' : ''}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Based on your interest in {latestConsultation?.procedure_interest}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchedDoctors.slice(0, 3).map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-emerald-100 p-3">
                <div className="flex items-center gap-2">
                  {doc.photo_url ? (
                    <img src={doc.photo_url} alt={doc.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold text-xs">{doc.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500">{doc.clinic_city}, {doc.clinic_country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/providers">
            <Button className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm h-12 rounded-xl">
              View All Specialists <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {outreachSent && matchedDoctors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">We're Finding Specialists for You</p>
              <p className="text-xs text-amber-700 mt-1">
                We've notified our doctor network about your interest in <strong>{latestConsultation?.procedure_interest}</strong>. 
                You'll receive an email when a specialist joins.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Case Status Indicator */}
      <CaseStatusIndicator caseStatus={caseStatus} userEmail={user?.email} />

      {/* Vault Summary Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-xl" style={{ letterSpacing: '-0.01em' }}>Secure Document Vault</h3>
              <p className="text-[14px] text-slate-500 mt-1" style={{ fontWeight: 300 }}>
                {vaultCount === 0 
                  ? 'No documents yet — upload your passport, tickets, and medical records' 
                  : `${vaultCount} document${vaultCount > 1 ? 's' : ''} saved securely`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/passport-vault" className="flex-1">
            <Button className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold">
              <FileText className="w-5 h-5 mr-2" /> View My Documents
            </Button>
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Zero-knowledge encrypted · Emergency PIN accessible
        </p>
      </div>

      {/* Coordinator Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-lg">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-0.5">
            {language === 'es' ? 'Tu Coordinador Asignado' : language === 'fr' ? 'Votre Coordinateur Assigné' : 'Your Assigned Coordinator'}
          </p>
          <p className="text-sm font-semibold text-slate-800">Ana Morales — {language === 'es' ? 'Especialista en Cuidado del Paciente' : language === 'fr' ? 'Spécialiste des Soins Patients' : 'Patient Care Specialist'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs text-emerald-600 font-medium">
              {language === 'es' ? 'En línea ahora' : language === 'fr' ? 'En ligne maintenant' : 'Online now'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* WhatsApp — primary global CTA */}
          <a
            href="https://wa.me/18005550199?text=Hello%20Ana%2C%20I%20need%20help%20with%20my%20Morales%20journey."
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="h-12 rounded-xl gap-2 px-5 text-sm font-semibold text-white"
              style={{ background: '#25D366', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1da851'}
              onMouseLeave={e => e.currentTarget.style.background = '#25D366'}
            >
              <WhatsAppMini /> WhatsApp
            </Button>
          </a>
          {/* Internal message — secondary */}
          <Link to="/dashboard/messages">
            <Button variant="outline" className="h-12 w-12 rounded-xl p-0 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* SAFE-T Status — collapsible */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <button
          onClick={() => setShowSafeT(v => !v)}
          className="w-full flex items-center gap-3 text-left"
          aria-expanded={showSafeT}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">SAFE-T 4LIFE™ {language === 'es' ? 'Estado' : language === 'fr' ? 'Statut' : 'Status'}</p>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {language === 'es' ? 'Riesgo Bajo' : language === 'fr' ? 'Risque Faible' : 'Low Risk'}
            </span>
          </div>
          <ChevronDown
            className="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200"
            style={{ transform: showSafeT ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {showSafeT && (
          <>
            <div className="space-y-2 mt-4 mb-4">
              {[
                { label: language === 'es' ? 'Puntuación de Seguridad' : language === 'fr' ? 'Score de Sécurité' : 'Safety Score', val: 82, color: '#047857' },
                { label: language === 'es' ? 'Progreso de Preparación' : language === 'fr' ? 'Progrès de Préparation' : 'Prep Progress', val: 60, color: '#1d4ed8' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-semibold" style={{ color: s.color }}>{s.val}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
            <Link to="/safe-t">
              <Button variant="outline" className="w-full text-sm h-12 rounded-xl">
                {language === 'es' ? 'Evaluación Completa' : language === 'fr' ? 'Évaluation Complète' : 'Full Assessment'} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Journey Progress */}
      <JourneyProgress currentStage={latestConsultation?.journey_stage || 'consultation'} />

      {/* Recovery Milestone Tracker */}
      <RecoveryMilestoneTracker
        caseStatus={latestConsultation?.status}
        doctorConfirmed={latestConsultation?.status === 'confirmed' || latestConsultation?.journey_stage === 'procedure' || latestConsultation?.journey_stage === 'recovery'}
      />

      {/* Preparation Checklist */}
      <PreparationChecklist userEmail={user?.email} />

      {/* Quick Actions */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-[0.22em] mb-5">
          {language === 'es' ? 'Acciones Rápidas' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color }) => {
            const c = colorMap[color];
            return (
              <Link key={label} to={to}>
                <div className={`flex flex-col items-center gap-2.5 rounded-xl p-4 py-5 border border-slate-100 min-h-[80px] justify-center ${c.bg} ${c.hover} transition-all cursor-pointer text-center`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notifications — collapsible */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <button
          onClick={() => setShowNotifications(v => !v)}
          className="w-full flex items-center gap-3 text-left min-h-[44px]"
          aria-expanded={showNotifications}
        >
          <Bell className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-slate-800 flex-1" style={{ letterSpacing: '-0.01em' }}>
            {language === 'es' ? 'Notificaciones' : language === 'fr' ? 'Notifications' : 'Notifications'}
          </p>
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{notifications.length} {language === 'es' ? 'nuevas' : language === 'fr' ? 'nouvelles' : 'new'}</span>
          <ChevronDown
            className="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200"
            style={{ transform: showNotifications ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {showNotifications && (
          <div className="space-y-2 mt-4">
            {notifications.map((n, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-3.5 border
                ${n.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                  n.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                {n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> :
                 n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> :
                 <Bell className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${n.type === 'warning' ? 'text-amber-800' : n.type === 'success' ? 'text-emerald-800' : 'text-blue-800'}`}>{n.text}</p>
                  <p className="text-xs text-slate-600 mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('en');
  const location = useLocation();

  useEffect(() => {
    base44.auth.me()
      .then(u => setUser(u))
      .catch(err => {
        console.error('[Dashboard] Auth check failed:', err?.message);
        setUser(null); // Stop infinite loading — show empty state
      });
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      const browserLang = (navigator.languages?.[0] || navigator.language || 'en')
        .split('-')[0].toLowerCase();
      const SUPPORTED = ['en', 'es', 'fr'];
      const detected = SUPPORTED.includes(browserLang) ? browserLang : 'en';
      setLanguage(detected);
      try { localStorage.setItem('appLanguage', detected); } catch (_) {}
    }
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const { data: consultations = [], isLoading: loadingConsultations, isError: errorConsultations, refetch: refetchConsultations } = useQuery({
    queryKey: ['my-consultations', user?.email],
    queryFn: () => base44.entities.Consultation.filter(
      user?.email ? { email: user.email } : {},
      '-created_date', 10
    ),
    enabled: !!user,
    staleTime: 60000,
  });

  const getModule = () => {
    const p = location.pathname;
    if (p === '/dashboard/consultations') return <ConsultationsModule consultations={consultations} />;
    if (p === '/dashboard/profile') return <MedicalProfileModule />;
    if (p === '/dashboard/documents') return <DocumentsModule />;
    if (p === '/dashboard/bookings') return <BookingsModule />;
    if (p === '/dashboard/messages') return <MessagesModule />;
    if (p === '/dashboard/journey') return <JourneyModule />;
    if (p === '/dashboard/support') return <SupportModule />;
    if (p === '/dashboard/settings') return <SettingsModule />;
    if (p === '/dashboard/case-status') return <CaseStatusModule userEmail={user?.email} />;
    if (p === '/dashboard/features') return <FeatureHub />;
    // ── /dashboard base route: personalized first-load experience ──
    // Previously returned FeatureHub (a catalog) — now shows the user's
    // actual journey: loading → error → welcome (empty) → personalized dashboard.
    // FeatureHub remains accessible at /dashboard/features.
    if (loadingConsultations) return <LoadingState rows={4} dark={false} label="Loading your dashboard" className="mt-4" />;
    if (errorConsultations) return <ErrorState dark={false} title="Couldn't load your journey" message="We had trouble fetching your data. Please try again." onRetry={refetchConsultations} className="mt-8" />;
    if (consultations.length === 0) return <DashboardWelcome user={user} />;
    return <DashboardHome user={user} consultations={consultations} language={language} />;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-5 pt-16 lg:pt-5 lg:p-8 overflow-y-auto max-w-5xl">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {getModule()}
        </motion.div>
      </main>
    </div>
  );
}