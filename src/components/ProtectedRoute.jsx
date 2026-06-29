import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';
import { hasAnyRole } from '@/lib/roles';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const LoginRequired = ({ onLogin }) => (
  <div className="min-h-[80vh] flex items-center justify-center px-6" style={{ background: '#060B16' }}>
    <div className="max-w-sm w-full text-center">
      <div style={{
        width: 72, height: 72, borderRadius: 16,
        background: '#D4AF37', color: '#060B16',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 40, fontWeight: 900, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 32px',
        boxShadow: '0 0 48px rgba(212,175,55,0.4), 0 4px 20px rgba(212,175,55,0.25)',
      }}>M</div>

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginBottom: 12, letterSpacing: '-0.01em' }}>
        Welcome to Morales
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', marginBottom: 40, lineHeight: 1.65, maxWidth: 280, margin: '0 auto 40px' }}>
        Your personal medical travel concierge — verified doctors, seamless travel, and safe recovery in one place.
      </p>

      <Button
        onClick={onLogin}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 99, height: 'auto',
          background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)',
          color: '#060B16', fontSize: 15, fontWeight: 700,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 28px rgba(212,175,55,0.38)',
        }}
      >
        Sign In Securely
      </Button>

      <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>
        Protected by SAFE-T4LIFE™ · End-to-end encrypted
      </p>
    </div>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 bg-background">
    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Access not available</h1>
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

  if (allowedRoles?.length && !user?.isPreviewAdmin && !hasAnyRole(user?.role, allowedRoles)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}