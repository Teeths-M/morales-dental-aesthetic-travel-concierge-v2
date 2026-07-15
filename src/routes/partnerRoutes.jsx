/**
 * Partner Routes — array of Route elements for use inside <Routes>.
 * Authenticated routes for partner types + token-gated vendor portals.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  ROLES,
  DOCTOR_PORTAL_ROLES,
  LOCAL_DOCTOR_PORTAL_ROLES,
  TRAVEL_AGENCY_PORTAL_ROLES,
  TAXI_SERVICE_PORTAL_ROLES,
  COMPANION_PORTAL_ROLES,
  SECURITY_AGENCY_PORTAL_ROLES,
  ADMIN_ROLES,
} from '@/lib/roles';

const DoctorDashboard        = lazy(() => import('@/pages/DoctorDashboard'));
const DoctorCasesDashboard   = lazy(() => import('@/pages/DoctorCasesDashboard'));
const LocalDoctorSignup      = lazy(() => import('@/pages/LocalDoctorSignup'));
const LocalDoctorDashboard   = lazy(() => import('@/pages/LocalDoctorDashboard'));
const PortalLocalDoctor      = lazy(() => import('@/pages/PortalLocalDoctor'));
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
  ROLES.TRAVEL_AGENCY, ROLES.TAXI_SERVICE, ROLES.COMPANION,
  ROLES.DOCTOR, ROLES.LOCAL_DOCTOR, ...ADMIN_ROLES,
];

export const partnerRoutes = (
  <>
    {/* Token-gated vendor portals — NO AppLayout, NO auth */}
    <Route key="portal-travel"    path="/portal/travel"               element={<ErrorBoundary><PortalTravelAgency /></ErrorBoundary>} />
    <Route key="portal-transfer"  path="/portal/transfer"             element={<ErrorBoundary><PortalChauffeur /></ErrorBoundary>} />
    <Route key="portal-doctor"    path="/portal/doctor/:token"        element={<ErrorBoundary><PortalDoctor /></ErrorBoundary>} />
    <Route key="portal-local-dr"  path="/portal/local-doctor/:token"  element={<ErrorBoundary><PortalLocalDoctor /></ErrorBoundary>} />
    <Route key="portal-proposal"  path="/portal/proposal/:token"      element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />
    <Route key="portal-proposal-w" path="/portal/proposal/*"          element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />

    {/* Common case-variant redirects — /PartnerSignup → /partner-signup */}
    <Route key="redirect-partner-signup-pascal" path="/PartnerSignup" element={<Navigate to="/partner-signup" replace />} />

    {/* Partner signup + dashboards inside AppLayout */}
    <Route key="partner-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
      <Route path="/partner-signup"               element={<ErrorBoundary><PartnerSignup /></ErrorBoundary>} />
      <Route path="/partner-signup/travel-agency" element={<ErrorBoundary><TravelAgencySignup /></ErrorBoundary>} />
      <Route path="/partner-signup/taxi-service"  element={<ErrorBoundary><TaxiServiceSignup /></ErrorBoundary>} />
      <Route path="/companion-signup"             element={<ErrorBoundary><CompanionSignup /></ErrorBoundary>} />
      <Route path="/security-signup"              element={<ErrorBoundary><SecurityAgencySignup /></ErrorBoundary>} />
      <Route path="/doctor-signup"                element={<ErrorBoundary><DoctorSignup /></ErrorBoundary>} />
      <Route path="/local-doctor-signup"          element={<ErrorBoundary><LocalDoctorSignup /></ErrorBoundary>} />

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={LOCAL_DOCTOR_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/local-doctor-dashboard"     element={<ErrorBoundary><LocalDoctorDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={DOCTOR_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/doctor-dashboard"            element={<ErrorBoundary><DoctorDashboard /></ErrorBoundary>} />
        <Route path="/portal/doctor/dashboard"     element={<ErrorBoundary><DoctorCasesDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={TRAVEL_AGENCY_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/travel-agency-dashboard"     element={<ErrorBoundary><TravelAgencyDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={TAXI_SERVICE_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/taxi-service-dashboard"      element={<ErrorBoundary><TaxiServiceDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={COMPANION_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/companion-dashboard"         element={<ErrorBoundary><CompanionDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={SECURITY_AGENCY_PORTAL_ROLES} /></ErrorBoundary>}>
        <Route path="/security-agency-dashboard"   element={<ErrorBoundary><SecurityAgencyDashboard /></ErrorBoundary>} />
      </Route>

      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={PARTNER_REVIEW_ROLES} /></ErrorBoundary>}>
        <Route path="/partner-portal"              element={<ErrorBoundary><PartnerPortal /></ErrorBoundary>} />
        <Route path="/partner-reviews"             element={<ErrorBoundary><PartnerReviews /></ErrorBoundary>} />
      </Route>
    </Route>
  </>
);