/**
 * Public Routes — array of Route elements for use inside <Routes>.
 * Accessible without authentication. Wrapped in AppLayout.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy, Suspense } from 'react';
import { Route, Navigate, useLocation } from 'react-router-dom';

/* Requires visiting /demo first — blocks direct URL access to admin demo pages */
function DemoProtected({ children }) {
  const ok = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('morales_demo_session') === '1';
  return ok ? children : <Navigate to="/demo" replace />;
}

/* /consultation is retired — folded into the primary /intake funnel. This
   redirect preserves any ?doctor=&country=&procedure= params so old links,
   bookmarks, and the doctor-directory hand-off still land correctly (and the
   chosen doctor is now actually persisted, which /consultation never did). */
function ConsultationRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/intake${search}`} replace />;
}
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';

const Home          = lazy(() => import('@/pages/Home'));
const Discover      = lazy(() => import('@/pages/Discover'));
const Providers     = lazy(() => import('@/pages/Providers'));
const ProviderDetail = lazy(() => import('@/pages/ProviderDetail'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const About         = lazy(() => import('@/pages/About'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const RequestAccountDeletion = lazy(() => import('@/pages/RequestAccountDeletion'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const Procedures    = lazy(() => import('@/pages/Procedures'));
const PartnerDirectory = lazy(() => import('@/pages/PartnerDirectory'));
const Booking             = lazy(() => import('@/pages/Booking'));
const ConciergeIntake      = lazy(() => import('@/pages/ConciergeIntake'));
const TravelIntake          = lazy(() => import('@/pages/TravelIntake'));
const BringYourOwnJourney   = lazy(() => import('@/pages/BringYourOwnJourney'));
const Login                = lazy(() => import('@/pages/Login'));
// ConsultationForm retired (folded into /intake); route below now redirects.
const ConsultationSuccess = lazy(() => import('@/pages/ConsultationSuccess'));
const RegisterRole  = lazy(() => import('@/pages/RegisterRole'));
const DeepPerfection = lazy(() => import('@/pages/DeepPerfection'));
const OnboardingEducation = lazy(() => import('@/pages/OnboardingEducation'));
const TravelConcierge = lazy(() => import('@/pages/TravelConcierge'));
const EmergencyHub    = lazy(() => import('@/pages/EmergencyHub'));
const OfflineGuide    = lazy(() => import('@/pages/OfflineGuide'));
const DemoShowcase           = lazy(() => import('@/pages/DemoShowcase'));
const EmergencyScenarioDemo  = lazy(() => import('@/pages/EmergencyScenarioDemo'));
const NightlifeRobberyDemo   = lazy(() => import('@/pages/NightlifeRobberyDemo'));
const PublicRecoveryTracker  = lazy(() => import('@/pages/PublicRecoveryTracker'));
const MedGuardDemo           = lazy(() => import('@/pages/MedGuardDemo'));
const EmailShowcase          = lazy(() => import('@/pages/EmailShowcase'));
const RecoveryTrackerDemo    = lazy(() => import('@/pages/RecoveryTrackerDemo'));
const DemoCheatsheet         = lazy(() => import('@/pages/DemoCheatsheet'));
const RecoveryCheckIn        = lazy(() => import('@/pages/RecoveryCheckIn'));
const EVNiQ400Demo           = lazy(() => import('@/pages/EVNiQ400Demo'));
const JamesVoiceDemo         = lazy(() => import('@/pages/JamesVoiceDemo'));
const SilentModeDemo         = lazy(() => import('@/pages/SilentModeDemo'));
const PartnerTrustDemo       = lazy(() => import('@/pages/PartnerTrustDemo'));
const TapProtocolDemo        = lazy(() => import('@/pages/TapProtocolDemo'));
const MasterJourneyDemo      = lazy(() => import('@/pages/MasterJourneyDemo'));
const LanguageBridgeDemo     = lazy(() => import('@/pages/LanguageBridgeDemo'));
const WaitingRoomDemo        = lazy(() => import('@/pages/WaitingRoomDemo'));
const WeatherHealthDemo      = lazy(() => import('@/pages/WeatherHealthDemo'));
const FamilyEyeDemo          = lazy(() => import('@/pages/FamilyEyeDemo'));
const ArrivalIntelDemo         = lazy(() => import('@/pages/ArrivalIntelDemo'));
const IntelligenceScanDemo     = lazy(() => import('@/pages/IntelligenceScanDemo'));
const SituationRoom            = lazy(() => import('@/pages/SituationRoom'));
const AdminMissionControl      = lazy(() => import('@/pages/AdminMissionControl'));
const EmergencyMeshBeaconDemo  = lazy(() => import('@/pages/EmergencyMeshBeaconDemo'));
const CoverageMatrix           = lazy(() => import('@/pages/CoverageMatrix'));
const SiobhanDemo              = lazy(() => import('@/pages/SiobhanDemo'));
const RecoveryCascadeDemo      = lazy(() => import('@/pages/RecoveryCascadeDemo'));
const MemoryBankDemo           = lazy(() => import('@/pages/MemoryBankDemo'));
const MReconDemo               = lazy(() => import('@/pages/MReconDemo'));
const SignupLanding            = lazy(() => import('@/pages/SignupLanding'));
const NearbyHelp               = lazy(() => import('@/pages/NearbyHelp'));
const MSafeChatDemo            = lazy(() => import('@/pages/MSafeChatDemo'));

export const publicRoutes = (
  <Route key="public-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    <Route path="/"               element={<ErrorBoundary><Home /></ErrorBoundary>} />
    <Route path="/discover"       element={<ErrorBoundary><Discover /></ErrorBoundary>} />
    <Route path="/providers"      element={<ErrorBoundary><Providers /></ErrorBoundary>} />
    <Route path="/providers/:id"  element={<ErrorBoundary><ProviderDetail /></ErrorBoundary>} />
    <Route path="/how-it-works"   element={<ErrorBoundary><HowItWorksPage /></ErrorBoundary>} />
    <Route path="/partners"       element={<ErrorBoundary><PartnerDirectory /></ErrorBoundary>} />
    <Route path="/about"          element={<ErrorBoundary><About /></ErrorBoundary>} />
    <Route path="/privacy"        element={<ErrorBoundary><PrivacyPolicy /></ErrorBoundary>} />
    <Route path="/request-account-deletion" element={<ErrorBoundary><RequestAccountDeletion /></ErrorBoundary>} />
    <Route path="/terms"          element={<ErrorBoundary><TermsOfService /></ErrorBoundary>} />
    <Route path="/procedures"     element={<ErrorBoundary><Procedures /></ErrorBoundary>} />
    <Route path="/booking"        element={<ErrorBoundary><Booking /></ErrorBoundary>} />
    <Route path="/intake"         element={<ErrorBoundary><ConciergeIntake /></ErrorBoundary>} />
    <Route path="/travel-intake"  element={<ErrorBoundary><TravelIntake /></ErrorBoundary>} />
    <Route path="/protect"        element={<ErrorBoundary><BringYourOwnJourney /></ErrorBoundary>} />
    <Route path="/login"          element={<ErrorBoundary><Login /></ErrorBoundary>} />
    <Route path="/consultation"   element={<ConsultationRedirect />} />
    <Route path="/consultation-success" element={<ErrorBoundary><ConsultationSuccess /></ErrorBoundary>} />
    <Route path="/register-role"  element={<ErrorBoundary><RegisterRole /></ErrorBoundary>} />
    <Route path="/deep-perfection" element={<ErrorBoundary><DeepPerfection /></ErrorBoundary>} />
    <Route path="/onboarding"     element={<ErrorBoundary><OnboardingEducation /></ErrorBoundary>} />
    <Route path="/travel-concierge" element={<ErrorBoundary><TravelConcierge /></ErrorBoundary>} />
    <Route path="/emergency"        element={<ErrorBoundary><EmergencyHub /></ErrorBoundary>} />
    <Route path="/offline-guide"    element={<ErrorBoundary><OfflineGuide /></ErrorBoundary>} />
    <Route path="/demo"                element={<ErrorBoundary><DemoShowcase /></ErrorBoundary>} />
    <Route path="/demo/emergency"      element={<ErrorBoundary><EmergencyScenarioDemo /></ErrorBoundary>} />
    <Route path="/demo/nightlife"      element={<ErrorBoundary><NightlifeRobberyDemo /></ErrorBoundary>} />
    <Route path="/demo/medguard"       element={<ErrorBoundary><MedGuardDemo /></ErrorBoundary>} />
    <Route path="/demo/emails"          element={<ErrorBoundary><EmailShowcase /></ErrorBoundary>} />
    <Route path="/demo/recovery"        element={<ErrorBoundary><RecoveryTrackerDemo /></ErrorBoundary>} />
    <Route path="/demo/cheatsheet"      element={<ErrorBoundary><DemoCheatsheet /></ErrorBoundary>} />
    <Route path="/demo/evn"             element={<ErrorBoundary><EVNiQ400Demo /></ErrorBoundary>} />
    <Route path="/demo/james"           element={<ErrorBoundary><JamesVoiceDemo /></ErrorBoundary>} />
    <Route path="/demo/silent"          element={<ErrorBoundary><SilentModeDemo /></ErrorBoundary>} />
    <Route path="/demo/trust"           element={<ErrorBoundary><PartnerTrustDemo /></ErrorBoundary>} />
    <Route path="/demo/tap"             element={<ErrorBoundary><TapProtocolDemo /></ErrorBoundary>} />
    <Route path="/demo/journey"         element={<ErrorBoundary><MasterJourneyDemo /></ErrorBoundary>} />
    <Route path="/demo/language"        element={<ErrorBoundary><LanguageBridgeDemo /></ErrorBoundary>} />
    <Route path="/demo/waiting"         element={<ErrorBoundary><WaitingRoomDemo /></ErrorBoundary>} />
    <Route path="/demo/weather"         element={<ErrorBoundary><WeatherHealthDemo /></ErrorBoundary>} />
    <Route path="/demo/family"          element={<ErrorBoundary><FamilyEyeDemo /></ErrorBoundary>} />
    <Route path="/demo/arrival"         element={<ErrorBoundary><ArrivalIntelDemo /></ErrorBoundary>} />
    <Route path="/demo/intelligence"    element={<ErrorBoundary><IntelligenceScanDemo /></ErrorBoundary>} />
    <Route path="/demo/situation-room"  element={<DemoProtected><ErrorBoundary><SituationRoom /></ErrorBoundary></DemoProtected>} />
    <Route path="/demo/mission-control" element={<DemoProtected><ErrorBoundary><AdminMissionControl /></ErrorBoundary></DemoProtected>} />
    <Route path="/demo/mesh-beacon"     element={<ErrorBoundary><EmergencyMeshBeaconDemo /></ErrorBoundary>} />
    <Route path="/demo/coverage"        element={<ErrorBoundary><CoverageMatrix /></ErrorBoundary>} />
    <Route path="/demo/siobhan"         element={<ErrorBoundary><SiobhanDemo /></ErrorBoundary>} />
    <Route path="/demo/recovery-cascade" element={<ErrorBoundary><RecoveryCascadeDemo /></ErrorBoundary>} />
    <Route path="/demo/memory-bank"     element={<ErrorBoundary><MemoryBankDemo /></ErrorBoundary>} />
    <Route path="/demo/m-recon"         element={<ErrorBoundary><MReconDemo /></ErrorBoundary>} />
    <Route path="/signup"                element={<ErrorBoundary><SignupLanding /></ErrorBoundary>} />
    <Route path="/nearby"              element={<ErrorBoundary><NearbyHelp /></ErrorBoundary>} />
    <Route path="/msafe"               element={<ErrorBoundary><MSafeChatDemo /></ErrorBoundary>} />
    <Route path="/recovery-check-in/:token"  element={<ErrorBoundary><RecoveryCheckIn /></ErrorBoundary>} />
    {/* Public Recovery Tracker — zero-login viral share page */}
    <Route path="/track/:token"        element={<ErrorBoundary><PublicRecoveryTracker /></ErrorBoundary>} />
  </Route>
);