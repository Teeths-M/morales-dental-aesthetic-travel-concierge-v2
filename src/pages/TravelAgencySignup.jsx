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
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t.selectLanguage}</span>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    {lang.flag} {lang.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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