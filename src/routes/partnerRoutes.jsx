/**
 * Partner Routes — array of Route elements for use inside <Routes>.
 * Authenticated routes for partner types + token-gated vendor portals.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  DOCTOR_PORTAL_ROLES,
  TRAVEL_AGENCY_PORTAL_ROLES,
  TAXI_SERVICE_PORTAL_ROLES,
  COMPANION_PORTAL_ROLES,
} from '@/lib/roles';

const DoctorDashboard        = lazy(() => import('@/pages/DoctorDashboard'));
const DoctorCasesDashboard   = lazy(() => import('@/pages/DoctorCasesDashboard'));
const TravelAgencyDashboard  = lazy(() => import('@/pages/TravelAgencyDashboard'));
const TaxiServiceDashboard   = lazy(() => import('@/pages/TaxiServiceDashboard'));
const CompanionDashboard     = lazy(() => import('@/pages/CompanionDashboard'));
const SecurityAgencyDashboard = lazy(() => import('@/pages/SecurityAgencyDashboard'));
const PartnerPortal          = lazy(() => import('@/pages/PartnerPortal'));
const PartnerReviews         = lazy(() => import('@/pages/PartnerReviews'));
const DoctorSignup           = lazy(() => import('@/pages/DoctorSignup'));
const TravelAgencySignup     = lazy(() => import('@/pages/TravelAgencySignup'));
const TaxiServiceSignup      = lazy(() => import('@/pages/TaxiServiceSignup'));
const CompanionSignup        = lazy(() => import('@/pages/CompanionSignup'));
const SecurityAgencySignup   = lazy(() => import('@/pages/SecurityAgencySignup'));
const PartnerSignup          = lazy(() => import('@/pages/PartnerSignup'));
const PortalTravelAgency     = lazy(() => import('@/pages/PortalTravelAgency'));
const PortalChauffeur        = lazy(() => import('@/pages/PortalChauffeur'));
const PortalDoctor           = lazy(() => import('@/pages/PortalDoctor'));
const ClientProposalPortal   = lazy(() => import('@/pages/ClientProposalPortal'));

const PARTNER_REVIEW_ROLES = [
  'travel_agency', 'taxi_service', 'companion', 'doctor', 'platform_admin', 'admin'
];

export const partnerRoutes = (
  <>
    {/* Token-gated vendor portals — NO AppLayout, NO auth */}
    <Route key="portal-travel"    path="/portal/travel"          element={<ErrorBoundary><PortalTravelAgency /></ErrorBoundary>} />
    <Route key="portal-transfer"  path="/portal/transfer"        element={<ErrorBoundary><PortalChauffeur /></ErrorBoundary>} />
    <Route key="portal-doctor"    path="/portal/doctor/:token"   element={<ErrorBoundary><PortalDoctor /></ErrorBoundary>} />
    <Route key="portal-proposal"  path="/portal/proposal/:token" element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />
    <Route key="portal-proposal-w" path="/portal/proposal/*"    element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />

    {/* Partner signup + dashboards inside AppLayout */}
    <Route key="partner-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
      <Route path="/partner-signup"               element={<PartnerSignup />} />
      <Route path="/partner-signup/travel-agency" element={<TravelAgencySignup />} />
      <Route path="/partner-signup/taxi-service"  element={<TaxiServiceSignup />} />
      <Route path="/companion-signup"             element={<CompanionSignup />} />
      <Route path="/security-signup"              element={<SecurityAgencySignup />} />
      <Route path="/doctor-signup"                element={<DoctorSignup />} />

      <Route element={<ProtectedRoute allowedRoles={DOCTOR_PORTAL_ROLES} />}>
        <Route path="/doctor-dashboard"            element={<DoctorDashboard />} />
        <Route path="/portal/doctor/dashboard"     element={<DoctorCasesDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={TRAVEL_AGENCY_PORTAL_ROLES} />}>
        <Route path="/travel-agency-dashboard"     element={<TravelAgencyDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={TAXI_SERVICE_PORTAL_ROLES} />}>
        <Route path="/taxi-service-dashboard"      element={<TaxiServiceDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={COMPANION_PORTAL_ROLES} />}>
        <Route path="/companion-dashboard"         element={<CompanionDashboard />} />
      </Route>

      {/* Security agency — no strict role guard (matches original) */}
      <Route path="/security-agency-dashboard"     element={<SecurityAgencyDashboard />} />

      <Route element={<ProtectedRoute allowedRoles={PARTNER_REVIEW_ROLES} />}>
        <Route path="/partner-portal"              element={<PartnerPortal />} />
        <Route path="/partner-reviews"             element={<PartnerReviews />} />
      </Route>
    </Route>
  </>
);