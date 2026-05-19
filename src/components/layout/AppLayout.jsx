import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import SafeTCompanion from '@/components/safet/SafeTCompanion';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <SafeTCompanion />
    </div>
  );
}