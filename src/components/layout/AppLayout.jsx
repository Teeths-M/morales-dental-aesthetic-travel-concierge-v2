import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Footer from './Footer';
import Header from './Header';
import BottomTabBar from './BottomTabBar';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import PhoneLockScreen from '@/components/security/PhoneLockScreen';
import { useAppLock } from '@/hooks/useAppLock';
import { isLockExemptPath } from '@/lib/appLock';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import FloatingCheckInAlert from '@/components/solo/FloatingCheckInAlert';
import GlobalNotificationStack from '@/components/notifications/GlobalNotificationStack';
import GlobalEventBroadcaster from '@/components/notifications/GlobalEventBroadcaster';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import { useCovertSOS } from '@/hooks/useCovertSOS';
import { initGlobalSyncListener, registerSyncQueue } from '@/lib/offlineSyncController';
import FirstTimeOnboarding, { isOnboardingComplete } from '@/components/onboarding/FirstTimeOnboarding';
import { SystemPauseBanner } from '@/components/admin/SystemPauseToggle';
import MCareOrb from '@/components/mcare/MCareOrb';
import { useAgeGateAccountSync } from '@/hooks/useAgeGateAccountSync';
import CursorSpotlight from '@/components/ui-system/CursorSpotlight';
import ProximityWatcher from './ProximityWatcher';
import MSafeThemeScope from '@/components/mobile/MSafeThemeScope';
import { mcareDeepLinkMode, isMcareQuietRoute, MCARE_LIVE_PATH } from '@/lib/mcareDeepLink';

// Paths where the onboarding wizard should never appear
const NO_ONBOARDING_PATHS = ['/admin', '/partner-signup', '/doctor-signup', '/companion-signup', '/security-signup', '/local-doctor-signup', '/offline', '/emergency', '/guardian', '/vault/share'];

// The public marketing website. AppLayout also wraps these routes, but the
// day/night theme must never reach them: this app's landing page is a deliberate
// dark cinematic design of its own, and scope protection is explicit in the
// brief. Signed-out visitors are excluded too, so nothing about the public site
// changes.
const MARKETING_PATHS = new Set([
  '/', '/pilot', '/discover', '/providers', '/procedures', '/about',
  '/how-it-works', '/partners', '/terms', '/privacy',
]);
const isMarketingPath = (path) =>
  MARKETING_PATHS.has(path) || path.startsWith('/procedures/') || path.startsWith('/providers/');

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  useGeoAutoAlign();
  useAgeGateAccountSync(user);

  // The Face ID / fingerprint lock (Phone Lock). Emergency pages never lock; nothing else unmounts while locked, so
  // check-ins, alerts and offline sync keep running underneath the lock screen.
  const phoneLock = useAppLock(user);
  const lockCovers = (phoneLock.locked || phoneLock.checking) && !isLockExemptPath(pathname);

  // The landing page and the pilot page are one experience with their own
  // minimal navigation (LandingNav) and slim footer (LandingFooter). The shared
  // Header and Footer stay exactly as they are on every other route. /pilot is
  // where every "Join the pilot" button lands, so it must look like the page the
  // visitor just came from, not the full app's old MORALES chrome.
  const isCinematicLanding = pathname === '/' || pathname === '/pilot';

  // M-Care's own full-screen app (/m-care, pages/MCareApp.jsx): the chat is the whole page. No site header, footer,
  // tab bar, offline strip or pull-to-refresh, and no second floating M-Care (the page renders its own, always
  // open). Everything that works in the background stays: the Face ID lock, covert SOS, offline sync and the
  // safety alerts below. /m-care/history (the older screen with past conversations) keeps the normal layout.
  // /m-care/live, /m-safe and /m-care/companion are the same full-screen app (the Living Ring screen), so they get the
  // identical chrome-free treatment.
  const isStandaloneMcare = pathname === '/m-care'
    || pathname === '/m-safe'
    || pathname === '/m-care/live'
    || pathname === '/m-care/companion';

  // Where the day/night theme is allowed to apply: signed-in app screens only,
  // never the public marketing site or the cinematic landing page.
  const appliesTheme = !!user && !isCinematicLanding && !isMarketingPath(pathname);

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

  // The first-time wizard waits for the next app screen rather than covering M-Care's own (M-Care onboards in
  // conversation anyway).
  const suppressOnboarding = isStandaloneMcare || NO_ONBOARDING_PATHS.some(p => pathname.startsWith(p));
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
  // Every other /demo/* page is a scripted walkthrough that never touches the
  // real backend, so the pause banner is deliberately hidden there — it would
  // just be noise. MemoryBankDemo and MReconDemo are the exceptions: genuine
  // "live demo, real backend" pages that call real functions (the latter
  // calls InvokeLLM through runMReconAgent), so hiding the banner there means
  // a paused system fails silently with a confusing error instead of an
  // obvious one-click fix.
  const isLiveBackendDemo = pathname.startsWith('/demo/memory-bank') || pathname.startsWith('/demo/m-recon');

  // Pull-to-refresh — overscroll-behavior:none (src/index.css) kills the
  // native gesture app-wide, so this reimplements it for the patient app
  // shell only (same scope as BottomTabBar). Refetches only what's actively
  // mounted on screen, not the whole cache.
  const queryClient = useQueryClient();
  const handlePullRefresh = useCallback(
    () => queryClient.refetchQueries({ type: 'active' }),
    [queryClient]
  );
  const { pullDistance, refreshing } = usePullToRefresh(handlePullRefresh, {
    enabled: !!user && !isAdmin && !isStandaloneMcare,
  });

  // A ?mcare=… link (an ad's QR code, a shared link) opens M-Care's full-screen chat, query string kept so a pilot
  // or partner scan still gets its sign-up greeting and ad tag. It used to open M-Care over the page it named, which
  // loaded the whole website (films and all) behind it on a phone. Pages where M-Care keeps quiet are left be.
  // The chat, not /m-care: /m-care is the companion screen, which has no chat to greet the scan.
  if (!isStandaloneMcare && mcareDeepLinkMode(search) && !isMcareQuietRoute(pathname)) {
    return <Navigate to={{ pathname: MCARE_LIVE_PATH, search }} replace />;
  }

  return (
    <>
      {lockCovers && (
        <PhoneLockScreen
          user={user}
          credentialIds={phoneLock.credentialIds}
          checking={!phoneLock.locked && phoneLock.checking}
          onUnlocked={phoneLock.markUnlocked}
        />
      )}
      <CursorSpotlight />

      {/* System Pause banner — visible on admin pages, and on the one demo page
          that actually calls the live backend (see isLiveBackendDemo above) */}
      {(isActualAdmin || isLiveBackendDemo) && <SystemPauseBanner />}

      {/* First-time onboarding wizard — shown once per account */}
      {showOnboarding && !suppressOnboarding && (
        <FirstTimeOnboarding
          userDisplayName={user?.full_name || user?.name || ''}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <MSafeThemeScope active={appliesTheme} className="min-h-screen flex flex-col">
        {/* The page itself. While M-Care fills a phone screen over it, index.css hides this (html[data-mcare-cover])
            so none of the page can show around M-Care; display: contents leaves the layout exactly as if this
            wrapper weren't here. Not marked on /m-care, where M-Care is the page and sits inside <main>. */}
        <div data-mcare-behind={isStandaloneMcare ? undefined : ''} style={{ display: 'contents' }}>
          {!isStandaloneMcare && <OfflineBanner />}
          {!isCinematicLanding && !isStandaloneMcare && <Header />}
          <main className={`flex-1 ${(isCinematicLanding || isStandaloneMcare) ? '' : 'pt-[56px] sm:pt-[72px]'} ${user && !isAdmin && !isStandaloneMcare ? 'pb-[70px] lg:pb-0' : ''}`}>
            {user && !isAdmin && !isStandaloneMcare && (
              <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
            )}
            <Outlet />
          </main>
          {!isCinematicLanding && !isStandaloneMcare && <Footer />}
        </div>

        {/* M-Care — hidden on demo pages so judges see a clean experience, and on /m-care, whose page renders
            its own full-screen M-Care (two at once would mean two conversations listening and talking). */}
        {!isDemo && !isStandaloneMcare && <MCareOrb />}

        {/* Patient-facing floating elements — hidden on admin pages */}
        {!isAdmin && (
          <>
            {/* Standalone SOS/Find-Nearby quick-access pills were removed
                2026-08-29 — both are now just a normal M-Care chat request
                (M-Care already has real triggerSOS/searchNearbyPlaces tool
                access), so a redundant floating shortcut duplicating chat
                capability no longer earns its own screen space. */}
            {/* Its toasts can carry message text and sit above the lock screen, so they wait until it's unlocked. */}
            {!lockCovers && <HeartNotificationCenter user={user} />}
            {user && <GuardianTicker />}
            {user && !isStandaloneMcare && <FloatingCheckInAlert user={user} />}
            {user && <GlobalEventBroadcaster user={user} />}

            {/* Mobile primary nav — hidden at lg:+ where DashboardSidebar's desktop rail takes over, and on
                M-Care's own screen, which has its own bottom bar */}
            {user && !isStandaloneMcare && <BottomTabBar />}
          </>
        )}

        {/* Proximity nudge — fires when user walks past a saved Nearby POI. Names a place, so not over the lock. */}
        {!lockCovers && <ProximityWatcher />}

        {/* Global notification stack — suppressed on demo pages */}
        {!isDemo && <GlobalNotificationStack />}
      </MSafeThemeScope>
    </>
  );
}