import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Upload, MessageCircle, HeartPulse, Users,
  Shield, Bell, ArrowRight, CheckCircle2, Clock, AlertTriangle, Star, Lock, FileText
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
import HandshakeButton from '@/components/journey/HandshakeButton';
import GoldenMCelebration from '@/components/journey/GoldenMCelebration';
import JourneyStatusTimeline from '@/components/dashboard/JourneyStatusTimeline';
import WelcomeCountryModal from '@/components/journey/WelcomeCountryModal';
import ArrivalActivityPrompt from '@/components/activity/ArrivalActivityPrompt';
import SoloCheckInBanner from '@/components/solo/SoloCheckInBanner';
import { useLiveLocationBeacon } from '@/hooks/useLiveLocationBeacon';
import { useLocationHistory } from '@/hooks/useLocationHistory';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import LoadingState from '@/components/ui-system/LoadingState';
import ErrorState from '@/components/ui-system/ErrorState';
import EmptyState from '@/components/ui-system/EmptyState';
import { formatDate } from '@/lib/format';

const notifications = [
  { type: 'warning', text: 'Lab work still required for medical clearance', time: '2h ago' },
  { type: 'info', text: 'Dr. Ramirez left a note on your consultation', time: '5h ago' },
  { type: 'success', text: 'Your hotel booking is confirmed for June 12', time: 'Yesterday' },
];

const quickActions = [
  { icon: Lock, label: 'My Vault', to: '/passport-vault', color: 'emerald' },
  { icon: Upload, label: 'Upload Documents', to: '/dashboard/documents', color: 'emerald' },
  { icon: MessageCircle, label: 'Message Coordinator', to: '/dashboard/messages', color: 'blue' },
  { icon: HeartPulse, label: 'View Recovery Plan', to: '/safe-t', color: 'sky' },
  { icon: Users, label: 'Companion Package', to: '/dashboard/bookings', color: 'pink' },
  { icon: Star, label: 'My Case Status', to: '/dashboard/case-status', color: 'violet' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-700', hover: 'hover:bg-emerald-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-700', hover: 'hover:bg-blue-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-700', hover: 'hover:bg-violet-100' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-700', hover: 'hover:bg-sky-100' },
  pink: { bg: 'bg-pink-50', icon: 'text-pink-600', hover: 'hover:bg-pink-100' },
};

function DashboardHome({ user, consultations, language }) {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const [showGoldenM,       setShowGoldenM]       = useState(false);
  const [showWelcomeCountry, setShowWelcomeCountry] = useState(false);
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
  const isSolo = latestActive && (!latestActive.requires_companion || latestActive.companion_requirement_status === 'companion_required_pending');
  // Auto-start live beacon for solo travelers with an active journey
  const { status: locationStatus, currentLocation } = useLiveLocationBeacon({
    caseId: latestActive?.id,
    caseStatus: latestActive?.status,
    enabled: !!isSolo,
  });

  // GPS breadcrumb trail — captures every 30s or 50m; syncs to Base44 when online
  useLocationHistory({ caseId: latestActive?.id, enabled: !!isSolo });

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
      <ArrivalActivityPrompt caseId={latestConsultation?.id} />
      <SoloCheckInBanner />

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

      {/* Journey Status Timeline — Stripe/Apple order-status model
          Shows payment, flight, hotel, transfers, doctor, companion as live status.
          Visible as soon as patient has a case (even pre-travel). */}
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

      {showGoldenM && (
        <GoldenMCelebration
          visible
          trip={activeTrip}
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
            <Button size="sm" className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8">
              View All Specialists <ArrowRight className="w-3 h-3 ml-1" />
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
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-blue-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-lg">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            {language === 'es' ? 'Tu Coordinador Asignado' : language === 'fr' ? 'Votre Coordinateur Assigné' : 'Your Assigned Coordinator'}
          </p>
          <p className="text-sm font-semibold text-slate-800">Ana Morales — {language === 'es' ? 'Especialista en Cuidado del Paciente' : language === 'fr' ? 'Spécialiste des Soins Patients' : 'Patient Care Specialist'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[11px] text-emerald-600 font-medium">
              {language === 'es' ? 'En línea ahora' : language === 'fr' ? 'En ligne maintenant' : 'Online now'}
            </span>
          </div>
        </div>
        <Link to="/dashboard/messages">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9 gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> {language === 'es' ? 'Mensaje' : language === 'fr' ? 'Message' : 'Message'}
          </Button>
        </Link>
      </div>

      {/* SAFE-T Status */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">SAFE-T 4LIFE™ {language === 'es' ? 'Estado' : language === 'fr' ? 'Statut' : 'Status'}</p>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {language === 'es' ? 'Riesgo Bajo' : language === 'fr' ? 'Risque Faible' : 'Low Risk'}
            </span>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {[
            { label: language === 'es' ? 'Puntuación de Seguridad' : language === 'fr' ? 'Score de Sécurité' : 'Safety Score', val: 82, color: '#047857' },
            { label: language === 'es' ? 'Progreso de Preparación' : language === 'fr' ? 'Progrès de Préparation' : 'Prep Progress', val: 60, color: '#1d4ed8' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-semibold" style={{ color: s.color }}>{s.val}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>
        <Link to="/safe-t">
          <Button size="sm" variant="outline" className="w-full text-xs h-8">
            {language === 'es' ? 'Evaluación Completa' : language === 'fr' ? 'Évaluation Complète' : 'Full Assessment'} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
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
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.28em] mb-5">
          {language === 'es' ? 'Acciones Rápidas' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color }) => {
            const c = colorMap[color];
            return (
              <Link key={label} to={to}>
                <div className={`flex flex-col items-center gap-2 rounded-xl p-3.5 border border-slate-100 ${c.bg} ${c.hover} transition-all cursor-pointer text-center`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-4 h-4 text-slate-500" />
          <p className="text-[15px] font-semibold text-slate-800" style={{ letterSpacing: '-0.01em' }}>
            {language === 'es' ? 'Notificaciones' : language === 'fr' ? 'Notifications' : 'Notifications'}
          </p>
          <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
        </div>
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-3 border
              ${n.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                n.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
              {n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> :
               n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> :
               <Bell className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`text-xs font-medium ${n.type === 'warning' ? 'text-amber-800' : n.type === 'success' ? 'text-emerald-800' : 'text-blue-800'}`}>{n.text}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
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
    if (p === '/dashboard') return <FeatureHub />;
    if (loadingConsultations) return <LoadingState rows={4} dark={false} label="Loading your dashboard" className="mt-4" />;
    if (errorConsultations) return <ErrorState dark={false} title="Couldn't load your journey" message="We had trouble fetching your data. Please try again." onRetry={refetchConsultations} className="mt-8" />;
    if (consultations.length === 0) return <EmptyState dark={false} title="No active journey yet" message="Start a consultation to begin your medical travel journey." action={<a href="/booking" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Start a Consultation</a>} className="mt-8" />;
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