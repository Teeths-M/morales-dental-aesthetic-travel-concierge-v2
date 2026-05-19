import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/lib/translations';
import TaxiServiceSignupStep1 from '@/components/partner-signup/TaxiServiceSignupStep1';
import TaxiServiceSignupStep2 from '@/components/partner-signup/TaxiServiceSignupStep2';
import TaxiServiceSignupStep3 from '@/components/partner-signup/TaxiServiceSignupStep3';
import TaxiServiceSuccess from '@/components/partner-signup/TaxiServiceSuccess';
import { Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TaxiServiceSignup() {
  const location = useLocation();
  const [language, setLanguage] = useState('en');
  const [step, setStep] = useState(0);
  const [successTaxi, setSuccessTaxi] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    driver_name: '',
    email: '',
    phone: '',
    operating_country: '',
    operating_city: '',
    service_radius_km: '',
    patient_assistance: [],
    vehicle_types: [],
    operating_hours: {},
    pricing_model: {},
    vehicle_photo_url: '',
    driver_license_number: '',
    insurance_provider: '',
    payout_method: '',
    payout_account: ''
  });

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

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

      {/* Main Content - Split Layout */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-center min-h-screen">
        {/* Hero Section */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-blue-100 mb-6">
              <svg className="w-16 h-16 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <h2 className="text-4xl font-display font-bold text-foreground mb-3">
              {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {language === 'es' 
                ? 'Transporta pacientes de puerta a puerta. Gana con cada viaje verificado.'
                : language === 'fr'
                ? 'Transportez les patients de porte à porte. Gagnez avec chaque trajet vérifié.'
                : 'Transport patients door-to-door. Earn with every verified trip.'}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-6">

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
                window.location.href = '/taxi-service-dashboard';
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
    </div>
  );
}