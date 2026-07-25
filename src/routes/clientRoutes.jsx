/**
 * Client Routes — array of Route elements for use inside <Routes>.
 * Authenticated routes for patients/users/clients.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { CLIENT_PORTAL_ROLES, ROLES } from '@/lib/roles';

const SafeT               = lazy(() => import('@/pages/SafeT'));
const Dashboard           = lazy(() => import('@/pages/Dashboard'));
const ClientSignup        = lazy(() => import('@/pages/ClientSignup'));
const PassportVault       = lazy(() => import('@/pages/PassportVault'));
const InsuranceCoverage   = lazy(() => import('@/pages/InsuranceCoverage'));
const TravelServices      = lazy(() => import('@/pages/TravelServices'));
const TripOverview        = lazy(() => import('@/pages/TripOverview'));
const WalkieTalkie        = lazy(() => import('@/pages/WalkieTalkie'));
const BaggageTrackerPage  = lazy(() => import('@/pages/BaggageTrackerPage'));
const AdventureSafetyCenter = lazy(() => import('@/pages/AdventureSafetyCenter'));
const SoloCheckInSettings = lazy(() => import('@/pages/SoloCheckInSettings'));
const PatientReviews      = lazy(() => import('@/pages/PatientReviews'));
const VisaAssist          = lazy(() => import('@/pages/VisaAssist'));
const PaymentCheckout     = lazy(() => import('@/pages/PaymentCheckout'));
const EstimateDashboard      = lazy(() => import('@/pages/EstimateDashboard'));
const NightlifeSafetyMode    = lazy(() => import('@/pages/NightlifeSafetyMode'));
const WildernessSafetyMode   = lazy(() => import('@/pages/WildernessSafetyMode'));
const MedicalIntakeForm      = lazy(() => import('@/pages/MedicalIntakeForm'));
const EmergencyMedCard       = lazy(() => import('@/pages/EmergencyMedCard'));
const DischargePaperReader   = lazy(() => import('@/pages/DischargePaperReader'));
const MyQuotes               = lazy(() => import('@/pages/MyQuotes'));
const NominateDoctor         = lazy(() => import('@/pages/NominateDoctor'));

const CHECKOUT_ROLES = [
  ROLES.CLIENT, ROLES.USER, ROLES.PLATFORM_ADMIN, ROLES.ADMIN,
  ROLES.TRAVEL_AGENCY, ROLES.DOCTOR, ROLES.TAXI_SERVICE,
];

export const clientRoutes = (
  <Route key="client-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    {/* Core dashboard routes */}
    <Route element={<ProtectedRoute allowedRoles={CLIENT_PORTAL_ROLES} />}>
      <Route path="/safe-t"                     element={<ErrorBoundary><SafeT /></ErrorBoundary>} />
      <Route path="/dashboard"                  element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/features"         element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/consultations"    element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/profile"          element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/documents"        element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/bookings"         element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/messages"         element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/emergency-card"   element={<ErrorBoundary><EmergencyMedCard /></ErrorBoundary>} />
      <Route path="/dashboard/journey"          element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/case-status"      element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/support"          element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/settings"         element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
      <Route path="/dashboard/adventure"        element={<ErrorBoundary><AdventureSafetyCenter /></ErrorBoundary>} />
      <Route path="/dashboard/solo-checkin"     element={<ErrorBoundary><SoloCheckInSettings /></ErrorBoundary>} />
      <Route path="/client-signup"              element={<ErrorBoundary><ClientSignup /></ErrorBoundary>} />
      <Route path="/my-reviews"                 element={<ErrorBoundary><PatientReviews /></ErrorBoundary>} />
      <Route path="/insurance"                  element={<ErrorBoundary><InsuranceCoverage /></ErrorBoundary>} />
      <Route path="/travel-services"            element={<ErrorBoundary><TravelServices /></ErrorBoundary>} />
      <Route path="/trip-overview"              element={<ErrorBoundary><TripOverview /></ErrorBoundary>} />
      <Route path="/walkie-talkie"              element={<ErrorBoundary><WalkieTalkie /></ErrorBoundary>} />
      <Route path="/baggage-tracker"            element={<ErrorBoundary><BaggageTrackerPage /></ErrorBoundary>} />
      <Route path="/nightlife-safety"           element={<ErrorBoundary><NightlifeSafetyMode /></ErrorBoundary>} />
      <Route path="/wilderness-safety"           element={<ErrorBoundary><WildernessSafetyMode /></ErrorBoundary>} />
      <Route path="/medical-intake"              element={<ErrorBoundary><MedicalIntakeForm /></ErrorBoundary>} />
      <Route path="/discharge-reader"            element={<ErrorBoundary><DischargePaperReader /></ErrorBoundary>} />
      <Route path="/my-quotes"                   element={<ErrorBoundary><MyQuotes /></ErrorBoundary>} />
      <Route path="/nominate-doctor"             element={<ErrorBoundary><NominateDoctor /></ErrorBoundary>} />
    </Route>
    {/* Payment / estimate — shared with some partner roles */}
    <Route element={<ProtectedRoute allowedRoles={CHECKOUT_ROLES} />}>
      <Route path="/portal-hub/checkout/:case_id" element={<ErrorBoundary><PaymentCheckout /></ErrorBoundary>} />
      <Route path="/estimate/:estimate_id"         element={<ErrorBoundary><EstimateDashboard /></ErrorBoundary>} />
      <Route path="/visa-assist"                   element={<ErrorBoundary><VisaAssist /></ErrorBoundary>} />
      <Route path="/pay-now"                       element={<ErrorBoundary><PaymentCheckout /></ErrorBoundary>} />
      <Route path="/passport-vault"                element={<ErrorBoundary><PassportVault /></ErrorBoundary>} />
    </Route>
  </Route>
);