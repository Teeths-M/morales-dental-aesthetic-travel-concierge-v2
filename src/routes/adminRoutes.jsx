/**
 * Admin Routes — array of Route elements for use inside <Routes>.
 * All /admin/* paths. Protected by ADMIN_ROLES.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ADMIN_ROLES } from '@/lib/roles';

const SimpleAdminDashboard      = lazy(() => import('@/pages/SimpleAdminDashboard'));
const AdminPartners             = lazy(() => import('@/pages/AdminPartners'));
const AdminImports              = lazy(() => import('@/pages/AdminImports'));
const DoctorLicenseVerification = lazy(() => import('@/pages/DoctorLicenseVerification'));
const DoctorVerificationAdmin   = lazy(() => import('@/pages/DoctorVerificationAdmin'));
const AdminPortalViewer         = lazy(() => import('@/pages/AdminPortalViewer'));
const AdminSms                  = lazy(() => import('@/pages/AdminSms'));
const AdminSmsHandshake         = lazy(() => import('@/pages/AdminSmsHandshake'));
const AdminDispatchMonitor      = lazy(() => import('@/pages/AdminDispatchMonitor'));
const IQ200AdminCenter          = lazy(() => import('@/pages/IQ200AdminCenter'));
const AdminPricingDashboard     = lazy(() => import('@/pages/AdminPricingDashboard'));
const AdminAnalyticsDashboard   = lazy(() => import('@/pages/AdminAnalytics'));
const AdminProcedureRequests    = lazy(() => import('@/pages/AdminProcedureRequests'));
const AdminProviderVerification = lazy(() => import('@/pages/AdminProviderVerification'));
const AdminAuditLog             = lazy(() => import('@/pages/AdminAuditLog'));
const ProviderPerformanceDashboard = lazy(() => import('@/pages/ProviderPerformanceDashboard'));
const AdminConfigApprovals      = lazy(() => import('@/pages/AdminConfigApprovals'));
const AdminCompanions           = lazy(() => import('@/pages/AdminCompanions'));
const MonetizationDashboard     = lazy(() => import('@/pages/MonetizationDashboard'));
const PaymentsPayoutsDashboard  = lazy(() => import('@/pages/PaymentsPayoutsDashboard'));
const RiskOptimizationDashboard = lazy(() => import('@/pages/RiskOptimizationDashboard'));
const PartnerVerificationHub    = lazy(() => import('@/pages/PartnerVerificationHub'));
const AdminAuditChain           = lazy(() => import('@/pages/AdminAuditChain'));
const AdminTravelRequests       = lazy(() => import('@/pages/AdminTravelRequests'));
const TestPortalLink            = lazy(() => import('@/pages/TestPortalLink'));
const PortalTestHub             = lazy(() => import('@/pages/PortalTestHub'));
const AdminSoloMonitor          = lazy(() => import('@/pages/AdminSoloMonitor'));
const AdminWildernessRescue     = lazy(() => import('@/pages/AdminWildernessRescue'));
const AdminSosSyncMonitor       = lazy(() => import('@/pages/AdminSosSyncMonitor'));
const AdminMissionControl       = lazy(() => import('@/pages/AdminMissionControl'));
const AdminDataFreshness        = lazy(() => import('@/pages/AdminDataFreshness'));
const AdminClinics              = lazy(() => import('@/pages/AdminClinics'));
const SituationRoom             = lazy(() => import('@/pages/SituationRoom'));
const AdminMonitorAction        = lazy(() => import('@/pages/AdminMonitorAction'));

export const adminRoutes = (
  <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={ADMIN_ROLES} /></ErrorBoundary>}>
      <Route path="/admin"                           element={<ErrorBoundary><SimpleAdminDashboard /></ErrorBoundary>} />
      <Route path="/admin/partners"                  element={<ErrorBoundary><AdminPartners /></ErrorBoundary>} />
      <Route path="/admin/imports"                   element={<ErrorBoundary><AdminImports /></ErrorBoundary>} />
      <Route path="/admin/doctor-verification"       element={<ErrorBoundary><DoctorLicenseVerification /></ErrorBoundary>} />
      <Route path="/admin/doctor-verification-queue" element={<ErrorBoundary><DoctorVerificationAdmin /></ErrorBoundary>} />
      <Route path="/admin/procedure-requests"        element={<ErrorBoundary><AdminProcedureRequests /></ErrorBoundary>} />
      <Route path="/admin/portal-viewer"             element={<ErrorBoundary><AdminPortalViewer /></ErrorBoundary>} />
      <Route path="/admin/sms"                       element={<ErrorBoundary><AdminSms /></ErrorBoundary>} />
      <Route path="/admin/sms-handshake"             element={<ErrorBoundary><AdminSmsHandshake /></ErrorBoundary>} />
      <Route path="/admin/dispatch-monitor"          element={<ErrorBoundary><AdminDispatchMonitor /></ErrorBoundary>} />
      <Route path="/admin/iq200"                     element={<ErrorBoundary><IQ200AdminCenter /></ErrorBoundary>} />
      <Route path="/admin/pricing"                   element={<ErrorBoundary><AdminPricingDashboard /></ErrorBoundary>} />
      <Route path="/admin/analytics"                 element={<ErrorBoundary><AdminAnalyticsDashboard /></ErrorBoundary>} />
      <Route path="/admin/provider-verification"     element={<ErrorBoundary><AdminProviderVerification /></ErrorBoundary>} />
      <Route path="/admin/companions"                element={<ErrorBoundary><AdminCompanions /></ErrorBoundary>} />
      <Route path="/admin/monetization"              element={<ErrorBoundary><MonetizationDashboard /></ErrorBoundary>} />
      <Route path="/admin/payments"                  element={<ErrorBoundary><PaymentsPayoutsDashboard /></ErrorBoundary>} />
      <Route path="/admin/risk-optimization"         element={<ErrorBoundary><RiskOptimizationDashboard /></ErrorBoundary>} />
      <Route path="/admin/partner-verification"      element={<ErrorBoundary><PartnerVerificationHub /></ErrorBoundary>} />
      <Route path="/admin/partner-verification/:id"  element={<ErrorBoundary><PartnerVerificationHub /></ErrorBoundary>} />
      <Route path="/admin/audit-log"                 element={<ErrorBoundary><AdminAuditLog /></ErrorBoundary>} />
      <Route path="/admin/data-freshness"            element={<ErrorBoundary><AdminDataFreshness /></ErrorBoundary>} />
      <Route path="/admin/clinics"                   element={<ErrorBoundary><AdminClinics /></ErrorBoundary>} />
      <Route path="/admin/mission-control"          element={<ErrorBoundary><AdminMissionControl /></ErrorBoundary>} />
      <Route path="/admin/situation-room"           element={<ErrorBoundary><SituationRoom /></ErrorBoundary>} />
      <Route path="/admin/provider-performance"      element={<ErrorBoundary><ProviderPerformanceDashboard /></ErrorBoundary>} />
      <Route path="/admin/config-approvals"          element={<ErrorBoundary><AdminConfigApprovals /></ErrorBoundary>} />
      <Route path="/admin/audit-chain"               element={<ErrorBoundary><AdminAuditChain /></ErrorBoundary>} />
      <Route path="/admin/travel-requests"           element={<ErrorBoundary><AdminTravelRequests /></ErrorBoundary>} />
      <Route path="/admin/solo-monitor"              element={<ErrorBoundary><AdminSoloMonitor /></ErrorBoundary>} />
      <Route path="/admin/wilderness-rescue"         element={<ErrorBoundary><AdminWildernessRescue /></ErrorBoundary>} />
      <Route path="/admin/sos-sync-monitor"          element={<ErrorBoundary><AdminSosSyncMonitor /></ErrorBoundary>} />
      <Route path="/admin/monitor-action"            element={<ErrorBoundary><AdminMonitorAction /></ErrorBoundary>} />
      {/* Dev/test tools */}
      <Route path="/test-portal-link"                element={<ErrorBoundary><TestPortalLink /></ErrorBoundary>} />
      <Route path="/portal-test-hub"                 element={<ErrorBoundary><PortalTestHub /></ErrorBoundary>} />
  </Route>
);