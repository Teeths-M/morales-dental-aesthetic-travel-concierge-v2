import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import FloatingSOSButton from './FloatingSOSButton';
import Header from './Header';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import FirstTimeOnboarding, { isOnboardingComplete } from '@/components/onboarding/FirstTimeOnboarding';

// Paths where the onboarding wizard should never appear
const NO_ONBOARDING_PATHS = ['/admin', '/partner-signup', '/offline', '/emergency', '/guardian', '/vault/share'];

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  useGeoAutoAlign();

  const suppressOnboarding = NO_ONBOARDING_PATHS.some(p => pathname.startsWith(p));
  const [showOnboarding, setShowOnboarding] = useState(
    () => !suppressOnboarding && !!user && !isOnboardingComplete()
  );

  useEffect(() => {
    if (suppressOnboarding && showOnboarding) {
      setShowOnboarding(false);
    }
  }, [pathname, suppressOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppress patient-facing fixed FABs on pages where they don't belong:
  // - Admin pages: FABs overlap the sidebar (z-50 beats the sidebar's z-20)
  // - Partner signup pages: patient SOS/Vault/WhatsApp are irrelevant to
  //   business partners and create visual noise (causes the stray red icon)
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/partner-signup');

  return (
    <BiometricGate>
      {/* First-time onboarding wizard — shown once per account */}
      {showOnboarding && !suppressOnboarding && (
        <FirstTimeOnboarding
          userDisplayName={user?.full_name || user?.name || ''}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div className="min-h-screen flex flex-col">
        <OfflineBanner />
        <Header />
        <main className="flex-1 pt-[56px] sm:pt-[72px]">
          <Outlet />
        </main>
        <Footer />

        {/* Patient-facing floating elements — hidden on admin pages */}
        {!isAdmin && (
          <>
            <WhatsAppButton />
            <HeartNotificationCenter user={user} />
            <GuardianTicker />

            {/* Premium floating SOS — global, always on top */}
            <FloatingSOSButton />
          </>
        )}
      </div>
    </BiometricGate>
  );
}
