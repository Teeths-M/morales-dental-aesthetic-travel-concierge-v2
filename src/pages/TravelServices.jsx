import React from 'react';
import { Plane, ShieldCheck } from 'lucide-react';
import { BackButtonLight } from '@/components/nav/BackButton';
import TravelAddOnBuilder from '@/components/travel/TravelAddOnBuilder';

export default function TravelServices() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <BackButtonLight fallback="/dashboard" className="mb-6" />
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">A La Carte Services</p>
              <h1 className="text-2xl font-bold">Travel & Non-Medical Services</h1>
            </div>
          </div>
          <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
            Tailor your journey package — origin transfers, accommodation tiers, companion services, nutritional delivery, personal chauffeurs, and more. Or grab the <strong>Peace of Mind Bundle</strong> for just $100.
          </p>
          <div className="flex items-center gap-2 mt-4 bg-white/10 rounded-xl px-4 py-2.5 w-fit">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <p className="text-xs text-emerald-100 font-semibold">Safe-T4Life protocols automatically included in all medical bookings</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <TravelAddOnBuilder caseId={null} />
      </div>
    </div>
  );
}