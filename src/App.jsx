import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PlatformModeProvider } from '@/context/PlatformModeContext'; // single provider — wraps App root below
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { usePushNotifications } from './hooks/usePushNotifications';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Providers from './pages/Providers';
import ProviderDetail from './pages/ProviderDetail';
import SafeT from './pages/SafeT';
import Booking from './pages/Booking';
import Dashboard from './pages/Dashboard';
import HowItWorksPage from './pages/HowItWorksPage';
import About from './pages/About';
import Procedures from './pages/Procedures';
import VisaAssist from './pages/VisaAssist';
import PaymentCheckout from './pages/PaymentCheckout';
import EstimateDashboard from './pages/EstimateDashboard';
import DoctorSignup from './pages/DoctorSignup';
import PartnerSignup from './pages/PartnerSignup';
import TravelAgencySignup from './pages/TravelAgencySignup';
import TaxiServiceSignup from './pages/TaxiServiceSignup';
import ClientSignup from './pages/ClientSignup';
import RegisterRole from './pages/RegisterRole';
import DoctorDashboard from './pages/DoctorDashboard';
import TravelAgencyDashboard from './pages/TravelAgencyDashboard';
import TaxiServiceDashboard from './pages/TaxiServiceDashboard';
import PortalTravelAgency from './pages/PortalTravelAgency';
import PortalChauffeur from './pages/PortalChauffeur';
import SimpleAdminDashboard from './pages/SimpleAdminDashboard';
import AdminPartners from './pages/AdminPartners';
import AdminImports from './pages/AdminImports';
import ClientProposalPortal from './pages/ClientProposalPortal';
import ConsultationForm from './pages/ConsultationForm';
import ConsultationSuccess from './pages/ConsultationSuccess';
import PortalDoctor from './pages/PortalDoctor';
import DoctorLicenseVerification from './pages/DoctorLicenseVerification';
import DoctorVerificationAdmin from './pages/DoctorVerificationAdmin';
import AdminPortalViewer from './pages/AdminPortalViewer';
import AdminSms from './pages/AdminSms';
import StandalonePayment from './pages/StandalonePayment';
import TestPortalLink from './pages/TestPortalLink';
import PortalTestHub from './pages/PortalTestHub';
import PassportVault from './pages/PassportVault';
import AdminDispatchMonitor from './pages/AdminDispatchMonitor';
import IQ200AdminCenter from './pages/IQ200AdminCenter';
import AdminPricingDashboard from './pages/AdminPricingDashboard';
import DoctorCasesDashboard from './pages/DoctorCasesDashboard';
import AdminAnalyticsDashboard from './pages/AdminAnalytics';
import AdminProcedureRequests from './pages/AdminProcedureRequests';
import AdminProviderVerification from './pages/AdminProviderVerification';
import AdminAuditLog from './pages/AdminAuditLog';
import ProviderPerformanceDashboard from './pages/ProviderPerformanceDashboard';
import AdminConfigApprovals from './pages/AdminConfigApprovals';
import AdminCompanions from './pages/AdminCompanions';
import CompanionSignup from './pages/CompanionSignup';
import SecurityAgencySignup from './pages/SecurityAgencySignup';
import SecurityAgencyDashboard from './pages/SecurityAgencyDashboard';
import PartnerPortal from './pages/PartnerPortal';
import CompanionDashboard from './pages/CompanionDashboard';
import DeepPerfection from './pages/DeepPerfection';
import SurveyPage from './pages/SurveyPage';
import OnboardingEducation from './pages/OnboardingEducation';
import MonetizationDashboard from './pages/MonetizationDashboard';
import PaymentsPayoutsDashboard from './pages/PaymentsPayoutsDashboard';
import RiskOptimizationDashboard from './pages/RiskOptimizationDashboard';
import LuggageFinderPortal from './pages/LuggageFinderPortal';
import InsuranceCoverage from './pages/InsuranceCoverage';
import OfflineMode from './pages/OfflineMode';
import PartnerVerificationHub from './pages/PartnerVerificationHub';
import TravelServices from './pages/TravelServices';
import EmergencyHub from './pages/EmergencyHub';
import AdventureSafetyCenter from './pages/AdventureSafetyCenter';
import SoloCheckInSettings from './pages/SoloCheckInSettings';
import PartnerDirectory from './pages/PartnerDirectory';
import PostSurgeryFeedback from './pages/PostSurgeryFeedback';
import GuardianView from './pages/GuardianView';
import EmergencyPINAccess from './pages/EmergencyPINAccess';
import ShareLinkViewer from './pages/ShareLinkViewer';
import CheckInConfirm from './pages/CheckInConfirm';
import PatientReviews from './pages/PatientReviews';
import PartnerReviews from './pages/PartnerReviews';
import AdminAuditChain from './pages/AdminAuditChain';
import EmergencyManifest from './pages/EmergencyManifest';
import AdminDoctorVerificationQueue from './pages/AdminDoctorVerificationQueue';
import TravelConcierge from './pages/TravelConcierge';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  usePushNotifications(user);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif text-lg font-bold">M</span>
          </div>
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Standalone vendor portals — no AppLayout, no auth wrapper */}
      <Route path="/portal/travel" element={<ErrorBoundary><PortalTravelAgency /></ErrorBoundary>} />
      <Route path="/portal/transfer" element={<ErrorBoundary><PortalChauffeur /></ErrorBoundary>} />
      <Route path="/portal/doctor/:token" element={<ErrorBoundary><PortalDoctor /></ErrorBoundary>} />
      <Route path="/portal/proposal/:token" element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />
      {/* Wildcard catch-all for proposal routes with trailing hashes/timestamps */}
      <Route path="/portal/proposal/*" element={<ErrorBoundary><ClientProposalPortal /></ErrorBoundary>} />

      <Route element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetail />} />
        <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
          <Route path="/safe-t" element={<SafeT />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/consultations" element={<Dashboard />} />
          <Route path="/dashboard/profile" element={<Dashboard />} />
          <Route path="/dashboard/documents" element={<Dashboard />} />
          <Route path="/dashboard/bookings" element={<Dashboard />} />
          <Route path="/dashboard/messages" element={<Dashboard />} />
          <Route path="/dashboard/journey" element={<Dashboard />} />
          <Route path="/dashboard/case-status" element={<Dashboard />} />
          <Route path="/dashboard/adventure" element={<AdventureSafetyCenter />} />
          <Route path="/dashboard/solo-checkin" element={<SoloCheckInSettings />} />
          <Route path="/dashboard/support" element={<Dashboard />} />
          <Route path="/dashboard/settings" element={<Dashboard />} />
          <Route path="/client-signup" element={<ClientSignup />} />
        </Route>
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/partners" element={<PartnerDirectory />} />
        <Route path="/about" element={<About />} />
        <Route path="/procedures" element={<Procedures />} />

        <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user", "travel_agency", "doctor", "taxi_service"]} />}>
          <Route path="/portal-hub/checkout/:case_id" element={<PaymentCheckout />} />
          <Route path="/estimate/:estimate_id" element={<EstimateDashboard />} />
          <Route path="/visa-assist" element={<VisaAssist />} />
        </Route>
        <Route path="/register-role" element={<RegisterRole />} />
        <Route path="/doctor-signup" element={<DoctorSignup />} />
        <Route path="/partner-signup" element={<PartnerSignup />} />
        <Route path="/partner-signup/travel-agency" element={<TravelAgencySignup />} />
        <Route path="/partner-signup/taxi-service" element={<TaxiServiceSignup />} />
        <Route path="/companion-signup" element={<CompanionSignup />} />
        <Route path="/security-signup" element={<SecurityAgencySignup />} />
        <Route path="/security-agency-dashboard" element={<SecurityAgencyDashboard />} />
      <Route path="/consultation" element={<ConsultationForm />} />
      <Route path="/consultation-success" element={<ConsultationSuccess />} />
        <Route element={<ProtectedRoute allowedRoles={["doctor", "platform_admin", "admin"]} />}>
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/portal/doctor/dashboard" element={<DoctorCasesDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["travel_agency", "platform_admin", "admin"]} />}>
          <Route path="/travel-agency-dashboard" element={<TravelAgencyDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["taxi_service", "platform_admin", "admin"]} />}>
          <Route path="/taxi-service-dashboard" element={<TaxiServiceDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["companion", "platform_admin", "admin"]} />}>
          <Route path="/companion-dashboard" element={<CompanionDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["travel_agency", "taxi_service", "companion", "doctor", "platform_admin", "admin"]} />}>
          <Route path="/partner-portal" element={<PartnerPortal />} />
          <Route path="/partner-reviews" element={<PartnerReviews />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
          <Route path="/my-reviews" element={<PatientReviews />} />
        </Route>
        {/* Demo/Test pages */}
        <Route path="/deep-perfection" element={<DeepPerfection />} />
        <Route path="/onboarding" element={<OnboardingEducation />} />
      </Route>
      {/* Public survey page — no auth required */}
      <Route path="/survey/:token" element={<SurveyPage />} />
      {/* Public post-surgery feedback — token-gated, no auth */}
      <Route path="/feedback/:token" element={<PostSurgeryFeedback />} />
      {/* Public luggage finder portal — QR scanned by stranger, no auth */}
      <Route path="/luggage/:token" element={<LuggageFinderPortal />} />
      {/* Insurance & Cancellation — requires auth */}
      <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
        <Route path="/insurance" element={<InsuranceCoverage />} />
      </Route>
      {/* Standalone payment page - requires auth same as /portal-hub/checkout */}
      <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user", "travel_agency", "doctor", "taxi_service"]} />}>
        <Route path="/pay-now" element={<PaymentCheckout />} />
        <Route path="/passport-vault" element={<PassportVault />} />
      </Route>
      {/* Dev/test tools — admin only */}
      <Route element={<ProtectedRoute allowedRoles={["platform_admin", "admin"]} />}>
        <Route path="/test-portal-link" element={<TestPortalLink />} />
        <Route path="/portal-test-hub" element={<PortalTestHub />} />
      </Route>
      <Route element={<ErrorBoundary><ProtectedRoute allowedRoles={["platform_admin", "admin"]} /></ErrorBoundary>}>
        <Route path="/admin" element={<SimpleAdminDashboard />} />
        <Route path="/admin/partners" element={<AdminPartners />} />
        <Route path="/admin/imports" element={<AdminImports />} />
        <Route path="/admin/doctor-verification" element={<DoctorLicenseVerification />} />
        <Route path="/admin/doctor-verification-queue" element={<DoctorVerificationAdmin />} />
        <Route path="/admin/procedure-requests" element={<AdminProcedureRequests />} />
        <Route path="/admin/portal-viewer" element={<AdminPortalViewer />} />
        <Route path="/admin/sms" element={<AdminSms />} />
        <Route path="/admin/dispatch-monitor" element={<AdminDispatchMonitor />} />
        <Route path="/admin/iq200" element={<IQ200AdminCenter />} />
        <Route path="/admin/pricing" element={<AdminPricingDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
        <Route path="/admin/provider-verification" element={<AdminProviderVerification />} />
        <Route path="/admin/companions" element={<AdminCompanions />} />
        <Route path="/admin/monetization" element={<MonetizationDashboard />} />
        <Route path="/admin/payments" element={<PaymentsPayoutsDashboard />} />
        <Route path="/admin/risk-optimization" element={<RiskOptimizationDashboard />} />
        <Route path="/admin/partner-verification" element={<PartnerVerificationHub />} />
        <Route path="/admin/partner-verification/:id" element={<PartnerVerificationHub />} />
        <Route path="/admin/audit-log" element={<AdminAuditLog />} />
        <Route path="/admin/provider-performance" element={<ProviderPerformanceDashboard />} />
        <Route path="/admin/config-approvals" element={<AdminConfigApprovals />} />
        <Route path="/admin/audit-chain" element={<AdminAuditChain />} />
        <Route path="/admin/doctor-verification" element={<AdminDoctorVerificationQueue />} />
      </Route>
      {/* Travel Concierge — public, no admin guard needed */}
      <Route element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
        <Route path="/travel-concierge" element={<TravelConcierge />} />
      </Route>
      {/* Public — Guardian View link (no auth, token-gated) */}
      <Route path="/guardian/:token" element={<GuardianView />} />
      {/* Public — Emergency PIN access (cross-device, no login) */}
      <Route path="/emergency-access" element={<EmergencyPINAccess />} />
      {/* Public — Solo traveler email check-in confirmation (no login, one-time token) */}
      <Route path="/check-in/:check_in_id" element={<CheckInConfirm />} />
      {/* Public — Secure share link viewer (no auth, token-gated) */}
      <Route path="/vault/share/:share_token" element={<ShareLinkViewer />} />
      {/* Emergency Hub — authenticated users */}
      <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
        <Route path="/emergency" element={<EmergencyHub />} />
      </Route>
      {/* Offline Mode — public accessible (works without internet) */}
      <Route path="/offline" element={<OfflineMode />} />
      {/* Emergency Manifest — PIN-gated, no login required, for first responders */}
      <Route path="/emergency-manifest" element={<EmergencyManifest />} />
      {/* Travel A La Carte Services */}
      <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
        <Route path="/travel-services" element={<TravelServices />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <QueryClientProvider client={queryClientInstance}>
            <PlatformModeProvider>
              <AuthenticatedApp />
              <Toaster />
            </PlatformModeProvider>
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App