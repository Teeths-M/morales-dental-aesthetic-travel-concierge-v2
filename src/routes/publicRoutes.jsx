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
const Procedures    = lazy(() => import('@/pages/Procedures'));
const PartnerDirectory = lazy(() => import('@/pages/PartnerDirectory'));
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

export const publicRoutes = (
  <Route key="public-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    <Route path="/"               element={<Home />} />
    <Route path="/discover"       element={<Discover />} />
    <Route path="/providers"      element={<Providers />} />
    <Route path="/providers/:id"  element={<ProviderDetail />} />
    <Route path="/how-it-works"   element={<HowItWorksPage />} />
    <Route path="/partners"       element={<PartnerDirectory />} />
    <Route path="/about"          element={<About />} />
    <Route path="/procedures"     element={<Procedures />} />
    <Route path="/consultation"   element={<ConsultationForm />} />
    <Route path="/consultation-success" element={<ConsultationSuccess />} />
    <Route path="/register-role"  element={<RegisterRole />} />
    <Route path="/deep-perfection" element={<DeepPerfection />} />
    <Route path="/onboarding"     element={<OnboardingEducation />} />
    <Route path="/travel-concierge" element={<TravelConcierge />} />
    <Route path="/emergency"        element={<EmergencyHub />} />
    <Route path="/offline-guide"    element={<OfflineGuide />} />
    <Route path="/demo"                element={<DemoShowcase />} />
    <Route path="/demo/emergency"      element={<EmergencyScenarioDemo />} />
    <Route path="/demo/nightlife"      element={<NightlifeRobberyDemo />} />
    <Route path="/demo/medguard"       element={<MedGuardDemo />} />
    <Route path="/demo/emails"          element={<EmailShowcase />} />
    <Route path="/demo/recovery"        element={<RecoveryTrackerDemo />} />
    <Route path="/demo/cheatsheet"           element={<DemoCheatsheet />} />
    <Route path="/recovery-check-in/:token"  element={<RecoveryCheckIn />} />
    {/* Public Recovery Tracker — zero-login viral share page */}
    <Route path="/track/:token"        element={<PublicRecoveryTracker />} />
  </Route>
);