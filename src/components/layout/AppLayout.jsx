import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import FloatingSOSButton from './FloatingSOSButton';
import Header from './Header';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import FloatingCheckInAlert from '@/components/solo/FloatingCheckInAlert';
import GlobalNotificationStack from '@/components/notifications/GlobalNotificationStack';
import GlobalEventBroadcaster from '@/components/notifications/GlobalEventBroadcaster';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import { initGlobalSyncListener, registerSyncQueue } from '@/lib/offlineSyncController';
import FirstTimeOnboarding, { isOnboardingComplete } from '@/components/onboarding/FirstTimeOnboarding';
import { SystemPauseBanner } from '@/components/admin/SystemPauseToggle';
import PlatformGuideOrb from '@/components/guide/PlatformGuideOrb';
import CursorSpotlight from '@/components/ui-system/CursorSpotlight';
import ProximityWatcher from './ProximityWatcher';

// Paths where the onboarding wizard should never appear
const NO_ONBOARDING_PATHS = ['/admin', '/partner-signup', '/doctor-signup', '/companion-signup', '/security-signup', '/local-doctor-signup', '/offline', '/emergency', '/guardian', '/vault/share'];

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  useGeoAutoAlign();

  // Initialize the global offline sync controller once on mount.
  // Registers the vault sync queue so pending vault actions are flushed
  // when connectivity is restored. Existing per-queue listeners continue
  // to work independently — this is purely additive.
  useEffect(() => {
    initGlobalSyncListener();

    if (user?.email) {
      const unregister = registerSyncQueue('vault', async () => {
        const { processQueue } = await import('@/lib/services/vaultSyncService');
        return processQueue(user.email);
      });
      return () => unregister();
    }
  }, [user?.email]);

  const suppressOnboarding = NO_ONBOARDING_PATHS.some(p => pathname.startsWith(p));
  const [showOnboarding, setShowOnboarding] = useState(
    () => !suppressOnboarding && !!user && !isOnboardingComplete()
  );

  useEffect(() => {
    if (suppressOnboarding && showOnboarding) {
      setShowOnboarding(false);
    }
  }, [pathname, suppressOnboarding]);  

  // Suppress patient-facing fixed FABs on pages where they don't belong:
  // - Admin pages: FABs overlap the sidebar (z-50 beats the sidebar's z-20)
  // - Partner signup pages: patient SOS/Vault/WhatsApp are irrelevant to
  //   business partners and create visual noise (causes the stray red icon)
  const isAdmin   = pathname.startsWith('/admin') || pathname.startsWith('/partner-signup') || pathname.startsWith('/doctor-signup') || pathname.startsWith('/companion-signup') || pathname.startsWith('/security-signup') || pathname.startsWith('/local-doctor-signup') || pathname.startsWith('/demo');
  const isDemo    = pathname.startsWith('/demo');
  const isActualAdmin = pathname.startsWith('/admin');

  return (
    <BiometricGate>
      <CursorSpotlight />

      {/* System Pause banner — only visible on actual admin pages, never on demo pages */}
      {isActualAdmin && <SystemPauseBanner />}

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

        {/* Guide orb — hidden on demo pages so judges see a clean experience */}
        {!isDemo && <PlatformGuideOrb />}

        {/* Patient-facing floating elements — hidden on admin pages */}
        {!isAdmin && (
          <>
            {/* WhatsApp is now inside FloatingSOSButton stack (bottom-right) */}
            <HeartNotificationCenter user={user} />
            {user && <GuardianTicker />}
            {user && <FloatingCheckInAlert user={user} />}
            {user && <GlobalEventBroadcaster user={user} />}

            {/* Premium floating SOS — authenticated users only */}
            {user && <FloatingSOSButton />}
          </>
        )}

        {/* Proximity nudge — fires when user walks past a saved Nearby POI */}
        <ProximityWatcher />

        {/* Global notification stack — suppressed on demo pages */}
        {!isDemo && <GlobalNotificationStack />}
      </div>
    </BiometricGate>
  );
}