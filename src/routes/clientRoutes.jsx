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
import { CLIENT_PORTAL_ROLES } from '@/lib/roles';

const SafeT               = lazy(() => import('@/pages/SafeT'));
const Booking             = lazy(() => import('@/pages/Booking'));
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

const CHECKOUT_ROLES = [
  'client', 'user', 'platform_admin', 'admin',
  'travel_agency', 'doctor', 'taxi_service'
];

export const clientRoutes = (
  <Route key="client-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    {/* Core dashboard routes */}
    <Route element={<ProtectedRoute allowedRoles={CLIENT_PORTAL_ROLES} />}>
      <Route path="/safe-t"                     element={<SafeT />} />
      <Route path="/booking"                    element={<Booking />} />
      <Route path="/dashboard"                  element={<Dashboard />} />
      <Route path="/dashboard/consultations"    element={<Dashboard />} />
      <Route path="/dashboard/profile"          element={<Dashboard />} />
      <Route path="/dashboard/documents"        element={<Dashboard />} />
      <Route path="/dashboard/bookings"         element={<Dashboard />} />
      <Route path="/dashboard/messages"         element={<Dashboard />} />
      <Route path="/dashboard/journey"          element={<Dashboard />} />
      <Route path="/dashboard/case-status"      element={<Dashboard />} />
      <Route path="/dashboard/support"          element={<Dashboard />} />
      <Route path="/dashboard/settings"         element={<Dashboard />} />
      <Route path="/dashboard/adventure"        element={<AdventureSafetyCenter />} />
      <Route path="/dashboard/solo-checkin"     element={<SoloCheckInSettings />} />
      <Route path="/client-signup"              element={<ClientSignup />} />
      <Route path="/my-reviews"                 element={<PatientReviews />} />
      <Route path="/insurance"                  element={<InsuranceCoverage />} />
      <Route path="/travel-services"            element={<TravelServices />} />
      <Route path="/trip-overview"              element={<TripOverview />} />
      <Route path="/walkie-talkie"              element={<WalkieTalkie />} />
      <Route path="/baggage-tracker"            element={<BaggageTrackerPage />} />
      <Route path="/nightlife-safety"           element={<NightlifeSafetyMode />} />
      <Route path="/wilderness-safety"           element={<WildernessSafetyMode />} />
      <Route path="/medical-intake"              element={<MedicalIntakeForm />} />
    </Route>
    {/* Payment / estimate — shared with some partner roles */}
    <Route element={<ProtectedRoute allowedRoles={CHECKOUT_ROLES} />}>
      <Route path="/portal-hub/checkout/:case_id" element={<PaymentCheckout />} />
      <Route path="/estimate/:estimate_id"         element={<EstimateDashboard />} />
      <Route path="/visa-assist"                   element={<VisaAssist />} />
      <Route path="/pay-now"                       element={<PaymentCheckout />} />
      <Route path="/passport-vault"                element={<PassportVault />} />
    </Route>
  </Route>
);