/**
 * Admin Routes — array of Route elements for use inside <Routes>.
 * All /admin/* paths. Protected by ADMIN_ROLES.
 * All paths preserved exactly as in the original App.jsx.
 */
import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ADMIN_ROLES } from '@/lib/roles';

const SimpleAdminDashboard      = lazy(() => import('@/pages/SimpleAdminDashboard'));
const AdminPartners             = lazy(() => import('@/pages/AdminPartners'));
const AdminImports              = lazy(() => import('@/pages/AdminImports'));
const DoctorLicenseVerification = lazy(() => import('@/pages/DoctorLicenseVerification'));
const DoctorVerificationAdmin   = lazy(() => import('@/pages/DoctorVerificationAdmin'));
const AdminPortalViewer         = lazy(() => import('@/pages/AdminPortalViewer'));
const AdminSms                  = lazy(() => import('@/pages/AdminSms'));
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

export const adminRoutes = (
  <Route key="admin-layout" element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
    <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={ADMIN_ROLES} /></ErrorBoundary>}>
      <Route path="/admin"                           element={<SimpleAdminDashboard />} />
      <Route path="/admin/partners"                  element={<AdminPartners />} />
      <Route path="/admin/imports"                   element={<AdminImports />} />
      <Route path="/admin/doctor-verification"       element={<DoctorLicenseVerification />} />
      <Route path="/admin/doctor-verification-queue" element={<DoctorVerificationAdmin />} />
      <Route path="/admin/procedure-requests"        element={<AdminProcedureRequests />} />
      <Route path="/admin/portal-viewer"             element={<AdminPortalViewer />} />
      <Route path="/admin/sms"                       element={<AdminSms />} />
      <Route path="/admin/dispatch-monitor"          element={<AdminDispatchMonitor />} />
      <Route path="/admin/iq200"                     element={<IQ200AdminCenter />} />
      <Route path="/admin/pricing"                   element={<AdminPricingDashboard />} />
      <Route path="/admin/analytics"                 element={<AdminAnalyticsDashboard />} />
      <Route path="/admin/provider-verification"     element={<AdminProviderVerification />} />
      <Route path="/admin/companions"                element={<AdminCompanions />} />
      <Route path="/admin/monetization"              element={<MonetizationDashboard />} />
      <Route path="/admin/payments"                  element={<PaymentsPayoutsDashboard />} />
      <Route path="/admin/risk-optimization"         element={<RiskOptimizationDashboard />} />
      <Route path="/admin/partner-verification"      element={<PartnerVerificationHub />} />
      <Route path="/admin/partner-verification/:id"  element={<PartnerVerificationHub />} />
      <Route path="/admin/audit-log"                 element={<AdminAuditLog />} />
      <Route path="/admin/provider-performance"      element={<ProviderPerformanceDashboard />} />
      <Route path="/admin/config-approvals"          element={<AdminConfigApprovals />} />
      <Route path="/admin/audit-chain"               element={<AdminAuditChain />} />
      <Route path="/admin/travel-requests"           element={<AdminTravelRequests />} />
      {/* Dev/test tools */}
      <Route path="/test-portal-link"                element={<TestPortalLink />} />
      <Route path="/portal-test-hub"                 element={<PortalTestHub />} />
    </Route>
  </Route>
);