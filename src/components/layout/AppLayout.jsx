import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import SafeTCompanion from '@/components/safet/SafeTCompanion';
import Header from './Header';
import HeartNotificationCenter from '@/components/notifications/HeartNotificationCenter';
import { useAuth } from '@/lib/AuthContext';
import BiometricGate from '@/components/security/BiometricGate';
import GuardianTicker from '@/components/guardian/GuardianTicker';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <BiometricGate>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-[68px]">
          <Outlet />
        </main>
        <Footer />
        <WhatsAppButton />
        <SafeTCompanion />
        <HeartNotificationCenter user={user} />
        <GuardianTicker />
      </div>
    </BiometricGate>
  );
}