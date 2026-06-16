import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Car, Globe, User, Shield, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

const CARDS = (language, navigate) => [
  {
    delay: 0.1,
    bg: 'from-sky-400 to-blue-600',
    img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=400&fit=crop',
    alt: 'Commercial airplane',
    title: language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyages' : 'Travel Agency',
    desc: language === 'es' ? 'Reserva vuelos, hoteles y traslados. Conecta con pacientes de viajes médicos.' : language === 'fr' ? 'Réservez des vols, des hôtels et des transferts. Connectez-vous avec les patients de tourisme médical.' : 'Book flights, hotels, and transfers. Connect with medical travel patients.',
    btn: 'from-emerald-600 to-teal-600',
    icon: Plane,
    onClick: () => navigate('/partner-signup/travel-agency', { state: { language } }),
  },
  {
    delay: 0.15,
    bg: 'from-slate-500 to-slate-700',
    img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop',
    alt: 'Black car taxi service',
    title: language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service',
    desc: language === 'es' ? 'Transporta pacientes de puerta a puerta. Gana con cada viaje verificado.' : language === 'fr' ? 'Transportez les patients de porte à porte. Gagnez avec chaque trajet vérifié.' : 'Transport patients door-to-door. Earn with every verified trip.',
    btn: 'from-blue-600 to-cyan-600',
    icon: Car,
    onClick: () => navigate('/partner-signup/taxi-service', { state: { language } }),
  },
  {
    delay: 0.2,
    bg: 'from-emerald-500 to-teal-700',
    img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=400&fit=crop',
    alt: 'Doctor in clinic',
    title: language === 'es' ? 'Doctor / Clínica' : language === 'fr' ? 'Médecin / Clinique' : 'Doctor / Clinic',
    desc: language === 'es' ? 'Ofrece procedimientos médicos. Acepta pacientes internacionales.' : language === 'fr' ? 'Offrez des procédures médicales. Acceptez des patients internationaux.' : 'Offer medical procedures. Accept international patients verified by SAFE-T.',
    btn: 'from-emerald-700 to-teal-700',
    icon: Stethoscope,
    onClick: () => navigate('/doctor-signup', { state: { language } }),
  },
  {
    delay: 0.25,
    bg: 'from-purple-400 to-pink-600',
    img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=400&fit=crop',
    alt: 'Caregiver companion',
    title: language === 'es' ? 'Acompañante' : language === 'fr' ? 'Accompagnateur' : 'Companion',
    desc: language === 'es' ? 'Guía pacientes en su viaje médico. Ofrece apoyo personal y cultural.' : language === 'fr' ? 'Guidez les patients dans leur voyage médical. Offrez un soutien personnel et culturel.' : 'Guide patients through their medical journey. Provide personal and cultural support.',
    btn: 'from-purple-600 to-pink-600',
    icon: User,
    onClick: () => navigate('/companion-signup', { state: { language } }),
  },
  {
    delay: 0.3,
    bg: 'from-slate-700 to-slate-900',
    img: 'https://images.unsplash.com/photo-1614853316476-de00d14cb1fc?w=600&h=400&fit=crop',
    alt: 'Security agency',
    title: language === 'es' ? 'Agencia de Seguridad' : language === 'fr' ? 'Agence de Sécurité' : 'Security Agency',
    desc: language === 'es' ? 'Protege pacientes VIP. Responde a alertas SOS y escoltas de protección cercana.' : language === 'fr' ? 'Protégez les patients VIP. Répondez aux alertes SOS et aux escortes de protection rapprochée.' : 'Protect VIP patients. Respond to SOS alerts, escorts, and close-protection details.',
    btn: 'from-slate-700 to-slate-900',
    icon: Shield,
    onClick: () => navigate('/security-signup', { state: { language } }),
  },
];

export default function PartnerSignup() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (event) => setLanguage(event.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const allLanguages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  ];

  const cards = CARDS(language, navigate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Language Selector */}
      <div className="sticky top-0 z-50 flex items-center gap-2 bg-white/90 backdrop-blur border-b border-border/20 px-4 py-2 overflow-x-auto">
        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1 flex-shrink-0">
          {allLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                language === lang.code
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-foreground hover:bg-secondary/50'
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-foreground mb-3">
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

        {/* Partner Cards — 3 cols then 2 centered */}
        <div className="grid sm:grid-cols-3 gap-5 mb-5">
          {cards.slice(0, 3).map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: card.delay }}
              >
                <div className={`h-40 sm:h-52 overflow-hidden bg-gradient-to-br ${card.bg}`}>
                  <img src={card.img} alt={card.alt} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 sm:p-7 text-center">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">{card.title}</h2>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{card.desc}</p>
                  <Button
                    onClick={card.onClick}
                    className={`w-full bg-gradient-to-r ${card.btn} hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2`}
                  >
                    <Icon className="w-4 h-4" />
                    {language === 'es' ? 'Registrarse' : language === 'fr' ? "S'inscrire" : 'Sign up'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:max-w-2xl sm:mx-auto mb-10">
          {cards.slice(3).map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: card.delay }}
              >
                <div className={`h-40 overflow-hidden bg-gradient-to-br ${card.bg}`}>
                  <img src={card.img} alt={card.alt} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 sm:p-7 text-center">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">{card.title}</h2>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{card.desc}</p>
                  <Button
                    onClick={card.onClick}
                    className={`w-full bg-gradient-to-r ${card.btn} hover:opacity-90 text-white font-semibold py-3 rounded-xl gap-2`}
                  >
                    <Icon className="w-4 h-4" />
                    {language === 'es' ? 'Registrarse' : language === 'fr' ? "S'inscrire" : 'Sign up'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>SAFE-T 4LIFE™ Medical Tourism Platform</p>
        </div>
      </div>
    </div>
  );
}