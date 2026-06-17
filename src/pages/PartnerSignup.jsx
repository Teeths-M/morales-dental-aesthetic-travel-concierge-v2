import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Car, Globe, User, Shield, Stethoscope, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translations } from '@/lib/translations';

// PREMIUM LUXURY COLOR PALETTE
const LUXURY_GRADIENTS = {
  travel: 'from-amber-500 via-orange-400 to-amber-600',
  taxi: 'from-slate-800 via-slate-900 to-black',
  doctor: 'from-emerald-700 via-teal-600 to-emerald-800',
  companion: 'from-rose-400 via-pink-500 to-rose-600',
  security: 'from-indigo-900 via-purple-900 to-slate-900',
};

const CARDS = (language, navigate) => [
  {
    delay: 0.1,
    bg: LUXURY_GRADIENTS.travel,
    img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80',
    alt: 'Luxury travel destination',
    title: language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyages' : 'Travel Agency',
    desc: language === 'es' ? 'Servicios exclusivos de viaje para pacientes médicos de alto nivel.' : language === 'fr' ? 'Services de voyage exclusifs pour les patients médicaux haut de gamme.' : 'Exclusive travel services for high-end medical patients worldwide.',
    btn: LUXURY_GRADIENTS.travel,
    icon: Plane,
    onClick: () => navigate('/partner-signup/travel-agency', { state: { language } }),
    badge: 'PREMIUM',
  },
  {
    delay: 0.15,
    bg: LUXURY_GRADIENTS.taxi,
    img: 'https://images.unsplash.com/photo-1562920616-0b6a8a8e5bf1?w=800&h=600&fit=crop&q=80',
    alt: 'Luxury chauffeur service',
    title: language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Chauffeur Service',
    desc: language === 'es' ? 'Transporte VIP de puerta a puerta con vehículos de lujo.' : language === 'fr' ? 'Transport VIP porte-à-porte avec véhicules de luxe.' : 'VIP door-to-door transportation with luxury vehicles.',
    btn: 'from-blue-600 to-cyan-600',
    icon: Car,
    onClick: () => navigate('/partner-signup/taxi-service', { state: { language } }),
    badge: 'LUXURY',
  },
  {
    delay: 0.2,
    bg: LUXURY_GRADIENTS.doctor,
    img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=600&fit=crop&q=80',
    alt: 'Premium medical facility',
    title: language === 'es' ? 'Doctor / Clínica' : language === 'fr' ? 'Médecin / Clinique' : 'Doctor / Clinic',
    desc: language === 'es' ? 'Procedimientos médicos de clase mundial con verificación SAFE-T.' : language === 'fr' ? 'Procédures médicales de classe mondiale avec vérification SAFE-T.' : 'World-class medical procedures with SAFE-T verification.',
    btn: LUXURY_GRADIENTS.doctor,
    icon: Stethoscope,
    onClick: () => navigate('/doctor-signup', { state: { language } }),
    badge: 'VERIFIED',
  },
  {
    delay: 0.25,
    bg: LUXURY_GRADIENTS.companion,
    img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=600&fit=crop&q=80',
    alt: 'Professional care companion',
    title: language === 'es' ? 'Acompañante' : language === 'fr' ? 'Accompagnateur' : 'Care Companion',
    desc: language === 'es' ? 'Acompañamiento personalizado y apoyo cultural durante el viaje.' : language === 'fr' ? 'Accompagnement personnalisé et soutien culturel pendant le voyage.' : 'Personalized accompaniment and cultural support throughout the journey.',
    btn: LUXURY_GRADIENTS.companion,
    icon: User,
    onClick: () => navigate('/companion-signup', { state: { language } }),
    badge: 'CONCIERGE',
  },
  {
    delay: 0.3,
    bg: LUXURY_GRADIENTS.security,
    img: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&h=600&fit=crop&q=80',
    alt: 'Elite security protection',
    title: language === 'es' ? 'Agencia de Seguridad' : language === 'fr' ? 'Agence de Sécurité' : 'Security Agency',
    desc: language === 'es' ? 'Protección VIP y respuesta de emergencia para pacientes de alto perfil.' : language === 'fr' ? 'Protection VIP et réponse d\'urgence pour patients de haut profil.' : 'VIP protection and emergency response for high-profile patients.',
    btn: LUXURY_GRADIENTS.security,
    icon: Shield,
    onClick: () => navigate('/security-signup', { state: { language } }),
    badge: 'ELITE',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Premium Header Bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-lg border-b border-amber-500/20 px-4 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-serif font-bold text-lg">M</span>
            </div>
            <div>
              <p className="text-white font-serif font-semibold text-sm tracking-wide">MORALES</p>
              <p className="text-white/60 text-[10px] tracking-widest uppercase">Partner Network</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Globe className="w-4 h-4 text-amber-400 flex-shrink-0" />
            {allLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  language === lang.code
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
        {/* Premium Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-amber-50 px-5 py-2.5 rounded-full border border-amber-200/60 mb-6 shadow-sm">
            <Crown className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-800 tracking-wide">EXCLUSIVE PARTNER NETWORK</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-slate-900 mb-5 tracking-tight">
            {language === 'es' ? 'Únete a la Excelencia' : language === 'fr' ? 'Rejoignez l\'Excellence' : 'Join Excellence'}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            {language === 'es'
              ? 'Selecciona tu categoría y únete a nuestra red premium de socios de clase mundial.'
              : language === 'fr'
              ? 'Choisissez votre catégorie et rejoignez notre réseau premium de partenaires de classe mondiale.'
              : 'Choose your category and join our premium network of world-class partners.'}
          </p>
        </motion.div>

        {/* Premium Partner Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {cards.slice(0, 3).map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                className="group relative bg-white rounded-3xl border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: card.delay, duration: 0.6 }}
              >
                {/* Premium Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {card.badge}
                  </div>
                </div>

                {/* Image Container with Overlay */}
                <div className="relative h-64 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                  <img 
                    src={card.img} 
                    alt={card.alt} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Icon Overlay */}
                  <div className="absolute bottom-4 left-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.btn} flex items-center justify-center shadow-2xl`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-7">
                  <h2 className="font-display text-2xl font-bold text-slate-900 mb-3 tracking-tight">{card.title}</h2>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">{card.desc}</p>
                  <Button
                    onClick={card.onClick}
                    className={`w-full bg-gradient-to-r ${card.btn} hover:opacity-95 text-white font-semibold py-4 rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 group/btn`}
                  >
                    <span>{language === 'es' ? 'Registrarse' : language === 'fr' ? "S'inscrire" : 'Apply Now'}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Row - Centered */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {cards.slice(3).map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                className="group relative bg-white rounded-3xl border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: card.delay, duration: 0.6 }}
              >
                {/* Premium Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {card.badge}
                  </div>
                </div>

                {/* Image Container with Overlay */}
                <div className="relative h-64 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                  <img 
                    src={card.img} 
                    alt={card.alt} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Icon Overlay */}
                  <div className="absolute bottom-4 left-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.btn} flex items-center justify-center shadow-2xl`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-7">
                  <h2 className="font-display text-2xl font-bold text-slate-900 mb-3 tracking-tight">{card.title}</h2>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">{card.desc}</p>
                  <Button
                    onClick={card.onClick}
                    className={`w-full bg-gradient-to-r ${card.btn} hover:opacity-95 text-white font-semibold py-4 rounded-2xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 group/btn`}
                  >
                    <span>{language === 'es' ? 'Registrarse' : language === 'fr' ? "S'inscrire" : 'Apply Now'}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Premium Footer */}
        <motion.div 
          className="text-center mt-20 pt-10 border-t border-slate-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 rounded-2xl border border-emerald-200/60">
            <Shield className="w-5 h-5 text-emerald-700" />
            <div>
              <p className="text-sm font-bold text-emerald-800 tracking-wide">SAFE-T 4LIFE™</p>
              <p className="text-xs text-emerald-600">Verified Medical Tourism Platform</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}