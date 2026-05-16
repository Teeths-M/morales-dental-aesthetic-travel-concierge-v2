import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';
import TaxiServiceSignupStep1 from '@/components/partner-signup/TaxiServiceSignupStep1';
import TaxiServiceSignupStep2 from '@/components/partner-signup/TaxiServiceSignupStep2';
import TaxiServiceSignupStep3 from '@/components/partner-signup/TaxiServiceSignupStep3';
import TaxiServiceSuccess from '@/components/partner-signup/TaxiServiceSuccess';
import { Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TaxiServiceSignup() {
  const location = useLocation();
  const [language, setLanguage] = useState(location.state?.language || 'en');
  const [step, setStep] = useState(0);
  const [successTaxi, setSuccessTaxi] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    driver_name: '',
    email: '',
    phone: '',
    operating_city: '',
    vehicle_types: [],
    operating_hours: {},
    pricing_model: {},
    vehicle_photo_url: '',
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
            <span className="text-sm font-medium text-foreground flex items-center gap-1">
              <Globe className="w-4 h-4" /> {t.selectLanguage}:
            </span>
          </div>
          <div className="flex gap-2">
            {allLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  language === lang.code
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Logo & Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/40 mb-4">
            <span className="text-2xl">🚕</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
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
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {step === 0 && (
            <TaxiServiceSignupStep1
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <TaxiServiceSignupStep2
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <TaxiServiceSignupStep3
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              onComplete={(taxi) => {
                setSuccessTaxi(taxi);
                setStep(3);
              }}
            />
          )}

          {step === 3 && successTaxi && (
            <TaxiServiceSuccess
              taxi={successTaxi}
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