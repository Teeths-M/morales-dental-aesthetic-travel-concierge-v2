import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import SafeTCompanion from '@/components/safet/SafeTCompanion';
import Header from './Header';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';
import { useGeoAutoAlign } from '@/hooks/useGeoAutoAlign';
import { Lock, AlertTriangle } from 'lucide-react';
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

            <Link
              to="/emergency"
              className="fixed bottom-24 left-6 z-50 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center text-white transition-all hover:scale-105 group"
              aria-label="Emergency SOS"
            >
              <AlertTriangle className="w-7 h-7" />
              <span className="absolute -top-10 left-0 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Emergency SOS
              </span>
            </Link>

            <Link
              to="/passport-vault"
              className="fixed bottom-24 right-6 z-50 w-16 h-16 bg-emerald-700 hover:bg-emerald-800 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 group"
              aria-label="Open My Vault"
            >
              <Lock className="w-7 h-7" />
              <span className="absolute -top-10 right-0 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                My Vault
              </span>
            </Link>
          </>
        )}
      </div>
    </BiometricGate>
  );
}
