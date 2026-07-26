import './i18n'; // Babel Engine — must be first import
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PlatformModeProvider } from '@/context/PlatformModeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AccountDeletedNotice from '@/components/AccountDeletedNotice';
import ScrollToTop from './components/ScrollToTop';
import { usePushNotifications } from './hooks/usePushNotifications';
import { PUBLIC_BYPASS_PATHS } from '@/lib/constants';
import SafetyWatcher from '@/components/safety/SafetyWatcher';
import SafetyPivotOverlay from '@/components/safety/SafetyPivotOverlay';

// Route modules — each owns its section of the route tree
import { publicRoutes }  from './routes/publicRoutes';
import { clientRoutes }  from './routes/clientRoutes';
import { partnerRoutes } from './routes/partnerRoutes';
import { adminRoutes }   from './routes/adminRoutes';
import { tokenRoutes }   from './routes/tokenRoutes';

// Global loading fallback shown while lazy-loaded page chunks download.
// If this page chunk was never cached and we're offline, the fetch can hang
// (Airplane Mode behaves differently than simulated offline) — after a few
// seconds, surface a way out instead of spinning forever.
const PageLoader = () => {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl"
          style={{ background: '#D4AF37', color: '#060B16', fontFamily: 'serif' }}
        >
          M
        </div>
        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        {showHint && (
          <div className="mt-2 max-w-xs">
            <p className="text-sm text-muted-foreground mb-3">
              This is taking a while — you may be offline and this page hasn't been saved for offline use yet.
            </p>
            <a
              href="/offline"
              className="inline-block text-sm font-semibold underline text-primary"
            >
              Go to Offline Mode instead
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

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
    } else if (authError.type === 'account_deleted') {
      return <AccountDeletedNotice />;
    } else if (authError.type === 'auth_required') {
      // Only redirect to login for truly protected paths — token/public routes handle their own auth
      const isProtectedPath = ['/dashboard', '/safe-t', '/passport-vault', '/insurance', '/travel-services', '/trip-overview', '/walkie-talkie', '/baggage-tracker', '/nightlife-safety', '/wilderness-safety', '/medical-intake', '/my-reviews'].some(p => currentPath.startsWith(p));
      if (isProtectedPath) {
        navigateToLogin();
        return null;
      }
    }
  }

  return (
    <>
      <ScrollToTop />
      <SafetyWatcher />
      <SafetyPivotOverlay />
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
              <NotificationProvider>
                <AuthenticatedApp />
                <Toaster />
                {/* 18 components fire toasts via sonner's toast() — without this
                    mount those calls render nothing (the ui/toaster above only
                    serves the useToast system) */}
                <SonnerToaster theme="dark" position="top-right" richColors />
              </NotificationProvider>
            </PlatformModeProvider>
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;