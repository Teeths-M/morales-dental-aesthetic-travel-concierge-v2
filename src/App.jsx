import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/context/CartContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Providers from './pages/Providers';
import ProviderDetail from './pages/ProviderDetail';
import SafeT from './pages/SafeT';
import Booking from './pages/Booking';
import Dashboard from './pages/Dashboard';
import HowItWorksPage from './pages/HowItWorksPage';
import About from './pages/About';
import Procedures from './pages/Procedures';
import PortalHub from './pages/PortalHub';
import VisaAssist from './pages/VisaAssist';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <img 
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/e5441c35a_logo.jpg"
              alt="Loading"
              className="h-16 w-auto object-contain"
            />
          </div>
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
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetail />} />
        <Route path="/safe-t" element={<SafeT />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/consultations" element={<Dashboard />} />
        <Route path="/dashboard/profile" element={<Dashboard />} />
        <Route path="/dashboard/documents" element={<Dashboard />} />
        <Route path="/dashboard/bookings" element={<Dashboard />} />
        <Route path="/dashboard/messages" element={<Dashboard />} />
        <Route path="/dashboard/journey" element={<Dashboard />} />
        <Route path="/dashboard/support" element={<Dashboard />} />
        <Route path="/dashboard/settings" element={<Dashboard />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/procedures" element={<Procedures />} />
        <Route path="/portal-hub" element={<PortalHub />} />
        <Route path="/visa-assist" element={<VisaAssist />} />
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