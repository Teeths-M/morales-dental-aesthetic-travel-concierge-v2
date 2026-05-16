import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/lib/translations';
import DoctorSignupStep1 from '@/components/doctor-signup/DoctorSignupStep1';
import DoctorSignupStep2 from '@/components/doctor-signup/DoctorSignupStep2';
import DoctorSignupStep3 from '@/components/doctor-signup/DoctorSignupStep3';
import DoctorSignupSuccess from '@/components/doctor-signup/DoctorSignupSuccess';
import { Globe } from 'lucide-react';

export default function DoctorSignup() {
  const [language, setLanguage] = useState('en');
  const [step, setStep] = useState(0);
  const [successDoctor, setSuccessDoctor] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    clinic_country: '',
    clinic_name: '',
    specialties: [],
    selectedCategories: [],
    procedurePrices: {},
    license_url: '',
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9h-3V8.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V11h-3c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h3v2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V12.5h3c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">SAFE-T 4LIFE™</h1>
          <p className="text-muted-foreground">Doctor Sign-Up</p>
        </div>

        {/* Progress Indicator */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground">
                {step === 0 ? '1 of 4' : step === 1 ? '2 of 4' : step === 2 ? '3 of 4' : '4 of 4'}
              </span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {step === 0 && (
            <DoctorSignupStep1
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <DoctorSignupStep2
              formData={formData}
              setFormData={setFormData}
              language={language}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
           <DoctorSignupStep3
             formData={formData}
             setFormData={setFormData}
             language={language}
             onNext={() => setStep(3)}
             onBack={() => setStep(1)}
             onComplete={(doctor) => {
               setSuccessDoctor({
                 ...doctor,
                 specialties: formData.specialties
               });
               setStep(3);
             }}
           />
          )}

          {step === 3 && successDoctor && (
           <DoctorSignupSuccess
             doctor={successDoctor}
             specialties={successDoctor.specialties}
             language={language}
             onDashboard={() => {
               // Redirect to doctor dashboard
               window.location.href = '/doctor-dashboard';
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