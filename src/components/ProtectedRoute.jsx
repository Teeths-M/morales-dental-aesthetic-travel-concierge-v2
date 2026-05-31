import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const LoginRequired = ({ onLogin }) => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 bg-background">
    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-foreground mb-2">Login required</h1>
      <p className="text-muted-foreground mb-6">Please sign in to access this area.</p>
      <Button onClick={onLogin} className="w-full">Login securely</Button>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 bg-background">
    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-foreground mb-2">Access not available</h1>
      <p className="text-muted-foreground">Your account does not have permission to open this portal.</p>
    </div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, allowedRoles }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement || <LoginRequired onLogin={navigateToLogin} />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement || <LoginRequired onLogin={navigateToLogin} />;
  }

  // TEMPORARY DEV OVERRIDE: Bypass role validation for testing
  // if (allowedRoles?.length && !user?.isPreviewAdmin && !allowedRoles.includes(user?.role)) {
  //   return <AccessDenied />;
  // }

  return <Outlet />;
}