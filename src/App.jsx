import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/context/CartContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from './components/ProtectedRoute';

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    <Routes>
      <Route element={<AppLayout />}>
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
          <Route path="/dashboard/support" element={<Dashboard />} />
          <Route path="/dashboard/settings" element={<Dashboard />} />
          <Route path="/client-signup" element={<ClientSignup />} />
        </Route>
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/procedures" element={<Procedures />} />

        <Route element={<ProtectedRoute allowedRoles={["client", "platform_admin", "admin", "user"]} />}>
          <Route path="/portal-hub/checkout/:consultation_id" element={<PaymentCheckout />} />
          <Route path="/estimate/:estimate_id" element={<EstimateDashboard />} />
          <Route path="/visa-assist" element={<VisaAssist />} />
        </Route>
        <Route path="/register-role" element={<RegisterRole />} />
        <Route path="/doctor-signup" element={<DoctorSignup />} />
        <Route path="/partner-signup" element={<PartnerSignup />} />
        <Route path="/partner-signup/travel-agency" element={<TravelAgencySignup />} />
        <Route path="/partner-signup/taxi-service" element={<TaxiServiceSignup />} />
      <Route path="/consultation" element={<ConsultationForm />} />
      <Route path="/consultation-success" element={<ConsultationSuccess />} />
        <Route element={<ProtectedRoute allowedRoles={["doctor", "platform_admin", "admin"]} />}>
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["travel_agency", "platform_admin", "admin"]} />}>
          <Route path="/travel-agency-dashboard" element={<TravelAgencyDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["taxi_service", "platform_admin", "admin"]} />}>
          <Route path="/taxi-service-dashboard" element={<TaxiServiceDashboard />} />
        </Route>
      </Route>
      {/* Standalone vendor portals — no AppLayout, no auth wrapper */}
      <Route path="/portal/travel" element={<PortalTravelAgency />} />
      <Route path="/portal/transfer" element={<PortalChauffeur />} />
      <Route path="/portal/doctor/:token" element={<PortalDoctor />} />
      <Route path="/portal/proposal" element={<ClientProposalPortal />} />
      <Route element={<ProtectedRoute allowedRoles={["platform_admin", "admin"]} />}>
        <Route path="/admin" element={<SimpleAdminDashboard />} />
        <Route path="/admin/partners" element={<AdminPartners />} />
        <Route path="/admin/imports" element={<AdminImports />} />
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
            <AuthenticatedApp />
            <Toaster />
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App