import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Car, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

export default function PartnerSignup() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  
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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-3">
            {language === 'es' ? 'Únete como Socio' : language === 'fr' ? 'Rejoignez en tant que Partenaire' : 'Join as a Partner'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'es' 
              ? 'Selecciona tu rol y comienza a servir a pacientes de viajes médicos en todo el mundo.'
              : language === 'fr'
              ? 'Choisissez votre rôle et commencez à servir les patients du tourisme médical dans le monde entier.'
              : 'Choose your role and start serving medical travel patients worldwide.'}
          </p>
        </div>

        {/* Partner Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Travel Agency Card */}
          <motion.div
            className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.91 16.11c.46-.79.74-1.64.74-2.56 0-2.91-2.36-5.27-5.27-5.27-1.73 0-3.26.84-4.23 2.13-1.02-1.89-3.05-3.16-5.35-3.16C3.12 7.25 1 9.37 1 12c0 1.72.71 3.27 1.85 4.38l10.62 8.07c.36.27.88.27 1.24 0l10.25-7.78c1.56-1.18 2.56-3.01 2.56-5.1 0-3.49-2.83-6.32-6.32-6.32-2.16 0-4.07 1.09-5.23 2.75h-2.63z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyages' : 'Travel Agency'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {language === 'es'
                  ? 'Reserva vuelos, hoteles y traslados. Conecta con pacientes de viajes médicos.'
                  : language === 'fr'
                  ? 'Réservez des vols, des hôtels et des transferts. Connectez-vous avec les patients de tourisme médical.'
                  : 'Book flights, hotels, and transfers. Connect with medical travel patients.'}
              </p>
              <Button
                onClick={() => navigate('/partner-signup/travel-agency', { state: { language } })}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2 text-base"
              >
                <Plane className="w-5 h-5" />
                {language === 'es' ? 'Registrarse' : language === 'fr' ? 'S\'inscrire' : 'Sign up'}
              </Button>
            </div>
          </motion.div>

          {/* Taxi Service Card */}
          <motion.div
            className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-16 h-16 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {language === 'es'
                  ? 'Transporta pacientes de puerta a puerta. Gana con cada viaje verificado.'
                  : language === 'fr'
                  ? 'Transportez les patients de porte à porte. Gagnez avec chaque trajet vérifié.'
                  : 'Transport patients door-to-door. Earn with every verified trip.'}
              </p>
              <Button
                onClick={() => navigate('/partner-signup/taxi-service', { state: { language } })}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2 text-base"
              >
                <Car className="w-5 h-5" />
                {language === 'es' ? 'Registrarse' : language === 'fr' ? 'S\'inscrire' : 'Sign up'}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>SAFE-T 4LIFE™ Medical Tourism Platform</p>
        </div>
      </div>
    </div>
  );
}