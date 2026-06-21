import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PlatformModeProvider } from '@/context/PlatformModeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { usePushNotifications } from './hooks/usePushNotifications';

// Route modules — each owns its section of the route tree
import { publicRoutes }  from './routes/publicRoutes';
import { clientRoutes }  from './routes/clientRoutes';
import { partnerRoutes } from './routes/partnerRoutes';
import { adminRoutes }   from './routes/adminRoutes';
import { tokenRoutes }   from './routes/tokenRoutes';

// Global loading fallback shown while lazy-loaded page chunks download
const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-serif text-lg font-bold">M</span>
      </div>
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  </div>
);

// Paths that must work even when auth is loading or failing (offline/emergency use)
const PUBLIC_BYPASS_PATHS = ['/offline', '/offline-guide', '/emergency-manifest', '/emergency-access', '/emergency', '/guardian', '/survey', '/feedback', '/luggage', '/check-in', '/vault/share'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  usePushNotifications(user);

  // Allow critical public pages to render immediately without waiting for auth
  const currentPath = window.location.pathname;
  const isBypassPath = PUBLIC_BYPASS_PATHS.some(p => currentPath === p || currentPath.startsWith(p + '/'));

  if (!isBypassPath && (isLoadingPublicSettings || isLoadingAuth)) {
    return <PageLoader />;
  }

  if (!isBypassPath && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Only redirect to login for truly protected paths — token/public routes handle their own auth
      const isProtectedPath = ['/dashboard', '/safe-t', '/booking', '/passport-vault', '/insurance', '/travel-services', '/trip-overview', '/walkie-talkie', '/baggage-tracker', '/nightlife-safety', '/wilderness-safety', '/medical-intake', '/my-reviews'].some(p => currentPath.startsWith(p));
      if (isProtectedPath) {
        navigateToLogin();
        return null;
      }
    }
  }

  return (
    <>
      <ScrollToTop />
      {/* Suspense boundary catches all lazy page chunks inside route modules */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Partner portals (includes standalone token-gated vendor portals) ── */}
          {partnerRoutes}

          {/* ── Client / patient authenticated routes ── */}
          {clientRoutes}

          {/* ── Public unauthenticated routes (wrapped in AppLayout) ── */}
          {publicRoutes}

          {/* ── Admin routes ── */}
          {adminRoutes}

          {/* ── Token-gated / public standalone pages ── */}
          {tokenRoutes}

          {/* ── Catch-all ── */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
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
  );
}

export default App;