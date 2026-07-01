/**
 * Public Routes — array of Route elements for use inside <Routes>.
 * Accessible without authentication. Wrapped in AppLayout.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';

const Home          = lazy(() => import('@/pages/Home'));
const Discover      = lazy(() => import('@/pages/Discover'));
const Providers     = lazy(() => import('@/pages/Providers'));
const ProviderDetail = lazy(() => import('@/pages/ProviderDetail'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const About         = lazy(() => import('@/pages/About'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const Procedures    = lazy(() => import('@/pages/Procedures'));
const PartnerDirectory = lazy(() => import('@/pages/PartnerDirectory'));
const Booking             = lazy(() => import('@/pages/Booking'));
const ConsultationForm = lazy(() => import('@/pages/ConsultationForm'));
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

export const publicRoutes = (
  <Route key="public-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    <Route path="/"               element={<Home />} />
    <Route path="/discover"       element={<Discover />} />
    <Route path="/providers"      element={<Providers />} />
    <Route path="/providers/:id"  element={<ProviderDetail />} />
    <Route path="/how-it-works"   element={<HowItWorksPage />} />
    <Route path="/partners"       element={<PartnerDirectory />} />
    <Route path="/about"          element={<About />} />
    <Route path="/privacy"        element={<PrivacyPolicy />} />
    <Route path="/terms"          element={<TermsOfService />} />
    <Route path="/procedures"     element={<Procedures />} />
    <Route path="/booking"        element={<ErrorBoundary><Booking /></ErrorBoundary>} />
    <Route path="/consultation"   element={<ConsultationForm />} />
    <Route path="/consultation-success" element={<ConsultationSuccess />} />
    <Route path="/register-role"  element={<RegisterRole />} />
    <Route path="/deep-perfection" element={<DeepPerfection />} />
    <Route path="/onboarding"     element={<OnboardingEducation />} />
    <Route path="/travel-concierge" element={<TravelConcierge />} />
    <Route path="/emergency"        element={<EmergencyHub />} />
    <Route path="/offline-guide"    element={<OfflineGuide />} />
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
    <Route path="/recovery-check-in/:token"  element={<RecoveryCheckIn />} />
    {/* Public Recovery Tracker — zero-login viral share page */}
    <Route path="/track/:token"        element={<PublicRecoveryTracker />} />
  </Route>
);