import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/lib/translations';
import TravelAgencySignupStep1 from '@/components/partner-signup/TravelAgencySignupStep1';
import TravelAgencySignupStep2 from '@/components/partner-signup/TravelAgencySignupStep2';
import TravelAgencySignupStep3 from '@/components/partner-signup/TravelAgencySignupStep3';
import TravelAgencySuccess from '@/components/partner-signup/TravelAgencySuccess';
import { Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TravelAgencySignup() {
  const location = useLocation();
  const [language, setLanguage] = useState(location.state?.language || 'en');
  const [step, setStep] = useState(0);
  const [successAgency, setSuccessAgency] = useState(null);
  const [formData, setFormData] = useState({
    agency_name: '',
    email: '',
    phone: '',
    headquarters_country: '',
    service_regions: [],
    services_offered: [],
    service_options: {},
    business_license_url: '',
    payout_method: '',
    payout_account: ''
  });

  const t = translations[language];

  const allLanguages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Language Selector */}
      <div className="fixed top-20 left-4 z-50 flex items-center gap-2 bg-white/30 backdrop-blur rounded-full px-2 py-2 border border-border/20 opacity-30 shadow-none hover:opacity-100 hover:bg-white/95 hover:shadow-md hover:border-border/50 transition-all duration-300">
        <Globe className="w-4 h-4 text-muted-foreground ml-2" />
        <div className="flex gap-1">
          {allLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                language === lang.code
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-foreground hover:bg-secondary/50'
              }`}
              title={lang.name}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-600/40 mb-4">
            <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.91 16.11c.46-.79.74-1.64.74-2.56 0-2.91-2.36-5.27-5.27-5.27-1.73 0-3.26.84-4.23 2.13-1.02-1.89-3.05-3.16-5.35-3.16C3.12 7.25 1 9.37 1 12c0 1.72.71 3.27 1.85 4.38l10.62 8.07c.36.27.88.27 1.24 0l10.25-7.78c1.56-1.18 2.56-3.01 2.56-5.1 0-3.49-2.83-6.32-6.32-6.32-2.16 0-4.07 1.09-5.23 2.75h-2.63z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            {language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyages' : 'Travel Agency'}
          </h1>
          <p className="text-muted-foreground">{language === 'es' ? 'Registro de Socio' : language === 'fr' ? 'Enregistrement des Partenaires' : 'Partner Sign-Up'}</p>
        </div>

        {/* Progress Indicator */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {step === 0 ? '1 of 3' : step === 1 ? '2 of 3' : '3 of 3'}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {step === 0 && (
            <TravelAgencySignupStep1
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <TravelAgencySignupStep2
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TravelAgencySignupStep3
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              onComplete={(agency) => {
                setSuccessAgency(agency);
                setStep(3);
              }}
            />
          )}

          {step === 3 && successAgency && (
            <TravelAgencySuccess
              agency={successAgency}
              language={language}
              onDashboard={() => {
                window.location.href = '/portal-hub';
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>SAFE-T 4LIFE™ Medical Tourism Platform</p>
        </div>
      </div>
    </div>
  );
}