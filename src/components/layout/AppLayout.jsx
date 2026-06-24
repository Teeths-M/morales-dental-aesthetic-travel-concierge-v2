import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import FloatingSOSButton from './FloatingSOSButton';
import SafeTCompanion from '@/components/safet/SafeTCompanion';
import Header from './Header';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import { Lock } from 'lucide-react';
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
            <SafeTCompanion />
            <HeartNotificationCenter user={user} />
            <GuardianTicker />

            {/* Premium floating SOS — replaces old clunky emergency square */}
            <FloatingSOSButton />

            <Link
              to="/passport-vault"
              className="fixed bottom-28 right-6 z-50 w-12 h-12 bg-emerald-800/90 hover:bg-emerald-700 rounded-full shadow-xl backdrop-blur flex items-center justify-center text-white transition-all hover:scale-105 group"
              aria-label="Open My Vault"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Lock className="w-5 h-5" />
              <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                My Vault
              </span>
            </Link>
          </>
        )}
      </div>
    </BiometricGate>
  );
}
