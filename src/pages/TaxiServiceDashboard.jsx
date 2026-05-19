import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import TaxiServiceDashboardView from '@/components/partner-dashboard/TaxiServiceDashboard';
import { AlertCircle } from 'lucide-react';

export default function TaxiServiceDashboard() {
  const [taxi, setTaxi] = useState(null);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTaxi = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const taxis = await base44.entities.TaxiService.filter({ email: currentUser.email });
      setTaxi(taxis[0] || null);
      setLoading(false);
    };

    const handleLanguageChange = (event) => setLanguage(event.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    loadTaxi();
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!taxi) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">No Taxi Service Profile Found</h1>
          <p className="text-muted-foreground mb-6">Your account ({user?.email}) is not linked to a taxi service profile yet.</p>
          <a href="/partner-signup/taxi-service" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
            Create Taxi Service Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <TaxiServiceDashboardView taxi={taxi} language={language} />
      </div>
    </div>
  );
}