import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import FloatingSOSButton from './FloatingSOSButton';
import Header from './Header';
import BottomTabBar from './BottomTabBar';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import FloatingCheckInAlert from '@/components/solo/FloatingCheckInAlert';
import GlobalNotificationStack from '@/components/notifications/GlobalNotificationStack';
import GlobalEventBroadcaster from '@/components/notifications/GlobalEventBroadcaster';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import { useCovertSOS } from '@/hooks/useCovertSOS';
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

  // Covert SOS — mounted at the LAYOUT so the 5-tap gesture and the
  // MORALESHELP keyword work on every page. SoloCheckInSettings tells patients
  // they can "type MORALESHELP in any search/text field", but the detector was
  // only mounted in Dashboard.jsx — so on the emergency hub, the booking flow,
  // the trip overview or the nearby-help map it did nothing at all. Those are
  // the screens someone in trouble is most likely to be looking at.
  //
  // Dashboard still mounts its own instance because it can pass a cached GPS
  // fix; the cooldown inside the hook is shared through localStorage so the two
  // instances cannot dispatch twice for one gesture. Both respect the
  // patient's arming switch — an unarmed account is unaffected.
  useCovertSOS({ caseId: null, currentLocation: null, enabled: !!user });

  // Cache the offline-SOS SMS number while we still have connectivity. The only
  // moment this can be fetched is before it is needed: once the patient is out
  // of data, the `sms:` deep link has to already know where to send.
  // Fire-and-forget — a failure leaves any previously cached number in place.
  useEffect(() => {
    if (!navigator.onLine) return;
    (async () => {
      const { refreshSafetyNumber } = await import('@/offline/sos/offlineSosPacket');
      const { base44 } = await import('@/api/base44Client');
      refreshSafetyNumber(base44);
    })();
  }, []);

  // Initialize the global offline sync controller once on mount.
  // Registers the vault sync queue so pending vault actions are flushed
  // when connectivity is restored. Existing per-queue listeners continue
  // to work independently — this is purely additive.
  useEffect(() => {
    initGlobalSyncListener();

    // The handshake queue is registered for EVERY session, signed in or not —
    // it is the 9-point safety spine, and a confirmation captured in airplane
    // mode must reach the server the moment connectivity returns. Until this
    // was registered, the only flush was inside HandshakeButton's tap handler,
    // so a patient who confirmed a step offline and never tapped again had
    // that step silently lost.
    const unregisterHandshake = registerSyncQueue('handshake', async () => {
      const { flushHandshakeQueue } = await import('@/offline/handshake/offlineHandshakeQueue');
      const { base44 } = await import('@/api/base44Client');
      return flushHandshakeQueue(base44);
    });

    if (user?.email) {
      const unregisterVault = registerSyncQueue('vault', async () => {
        const { processQueue } = await import('@/lib/services/vaultSyncService');
        return processQueue(user.email);
      });
      return () => { unregisterVault(); unregisterHandshake(); };
    }
    return () => unregisterHandshake();
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
        <main className={`flex-1 pt-[56px] sm:pt-[72px] ${user && !isAdmin ? 'pb-[70px] lg:pb-0' : ''}`}>
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

            {/* Mobile primary nav — hidden at lg:+ where DashboardSidebar's desktop rail takes over */}
            {user && <BottomTabBar />}
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