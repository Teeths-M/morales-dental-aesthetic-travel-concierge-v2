import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Briefcase, Activity, Home, User, X, Stethoscope, Car, HeartHandshake, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlotCounter from './SlotCounter';
import SentinelOrbit from './SentinelOrbit';
import { useAuth } from '@/lib/AuthContext';

const SENTINEL_IMAGE =
  'https://media.base44.com/images/public/6a01c1305c540b75f24dd373/7b4ea635d_ChatGPTImageJun1202608_35_37PM.png';

const GOLD = '#d4a843';

function getBadges(language) {
  return [
    {
      icon: Shield,
      label: 'SAFE-T 4LIFE™',
      sub: language === 'es' ? 'Seguridad por IA' : language === 'fr' ? 'Sécurité par IA' : 'AI-Powered Safety',
    },
    {
      icon: BadgeCheck,
      label: language === 'es' ? 'Especialistas Verificados' : language === 'fr' ? 'Spécialistes Vérifiés' : 'Verified Specialists',
      sub: language === 'es' ? 'Con Licencia y Confiables' : language === 'fr' ? 'Autorisé et de Confiance' : 'Licensed & Trusted',
    },
    {
      icon: Plane,
      label: language === 'es' ? 'Cuidado Puerta a Puerta' : language === 'fr' ? 'Soins Porte à Porte' : 'Door-to-Door Care',
      sub: language === 'es' ? 'Viaje. Cuidado. Recuperación.' : language === 'fr' ? 'Voyage. Soins. Récupération.' : 'Travel. Care. Recover.',
    },
  ];
}

const featureCardData = [
  { icon: Users,     title: 'Human Care',            body: 'Real people, real support, when you need it most.',
    details: 'Our dedicated care coordinators are available 24/7 via WhatsApp, phone, or email. You\'ll have a named human contact assigned to your journey — not a chatbot — who knows your case from day one through recovery.' },
  { icon: Shield,    title: 'Safe Connections',       body: 'Vetted specialists and trusted global partners.',
    details: 'Every doctor, clinic, and travel partner in our network passes a multi-step verification: license validation, credential cross-referencing, AI document analysis, and ongoing performance monitoring.' },
  { icon: Heart,     title: 'Better Outcomes',        body: 'Care designed around your safety and recovery.',
    details: 'Our SAFE-T 4LIFE™ system analyzes 40+ health markers before your trip. Post-procedure, you receive a 7-day monitored recovery protocol, dietary planning, and follow-up check-ins.' },
  { icon: Briefcase, title: 'Travel With Confidence', body: "From arrival to recovery, you're never alone.",
    details: 'We coordinate every logistics detail: airport pickup, hotel booking, clinic transfers, local transport, and return travel. Our concierge handles it all so you can focus entirely on your health and healing.' },
];

export default function Hero() {
  const [language, setLanguage] = useState('en');
  const [activeCard, setActiveCard] = useState(null);
  const { navigateToLogin } = useAuth();

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const badges = getBadges(language);

  const journeySteps = [
    { icon: Shield,   label: language === 'es' ? 'Consulta'    : language === 'fr' ? 'Consultation'  : 'Consultation' },
    { icon: Plane,    label: language === 'es' ? 'Viaje'       : language === 'fr' ? 'Voyage'         : 'Travel'       },
    { icon: Activity, label: language === 'es' ? 'Tratamiento' : language === 'fr' ? 'Traitement'     : 'Treatment'    },
    { icon: Heart,    label: language === 'es' ? 'Recuperación': language === 'fr' ? 'Rétablissement' : 'Recovery'     },
    { icon: Home,     label: language === 'es' ? 'Regreso'     : language === 'fr' ? 'Retour'         : 'Return Home'  },
  ];

  return (
    <section className="relative min-h-screen bg-[#070F0B] overflow-hidden">

      {/* ── CHANGE 1: Full-bleed background photo ── */}
      <div className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none">
        <img
          src={SENTINEL_IMAGE}
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: '68% center' }}
        />
        {/* Gradient overlay — dark left fade so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #070F0B 38%, rgba(7,15,11,0.82) 58%, rgba(7,15,11,0.28) 78%, rgba(7,15,11,0.45) 100%)' }}
        />
        {/* Gradient overlay — top/bottom */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(7,15,11,0.55) 0%, transparent 35%, rgba(7,15,11,0.75) 100%)' }}
        />
      </div>

      {/* Mobile background */}
      <div className="lg:hidden absolute inset-0 pointer-events-none">
        <img src={SENTINEL_IMAGE} alt="" className="w-full h-full object-cover" style={{ opacity: 0.25, objectPosition: '72% center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #070F0B 0%, rgba(7,15,11,0.85) 60%, #070F0B 100%)' }} />
      </div>

      {/* ── CHANGE 3: SentinelOrbit — right side, centered vertically ── */}
      <div className="absolute inset-0 flex items-center justify-end pr-8 lg:pr-16 pointer-events-none hidden lg:flex">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.7, ease: 'easeOut' }}
          style={{ transform: 'scale(0.88)' }}
        >
          <SentinelOrbit size={480} />
        </motion.div>
      </div>

      {/* ── CHANGE 2: Left content panel — z-20, 52% width, more padding ── */}
      <div className="relative z-20 w-full lg:w-[52%] px-4 sm:px-6 lg:px-14 xl:px-20 lg:py-24 py-8">

        {/* SAFE-T label */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-bold tracking-[0.28em]" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
          <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1">SAFETY INTELLIGENCE ENGINE</p>
        </motion.div>

        {/* Main content card */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-white/10 p-6 lg:p-7 pb-7 backdrop-blur-md overflow-visible"
          style={{ background: 'rgba(7,15,11,0.72)' }}
        >
          {/* Headline */}
          <h1 className="font-bold text-white leading-[1.15] mb-3" style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.5rem)' }}>
            {language === 'es' ? 'Tu cuidado seguro comienza aquí.'
             : language === 'fr' ? 'Vos soins sûrs commencent ici.'
             : 'Your safe care journey starts here.'}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mt-3">
            {language === 'es'
              ? 'Especialistas verificados, coordinación de viaje y apoyo de recuperación en un plan claro y humano.'
              : language === 'fr'
              ? 'Spécialistes vérifiés, coordination du voyage et soutien à la récupération dans un plan humain.'
              : 'Verified specialists, travel coordination, and recovery support in one clear, human care plan.'}
          </p>

          <p className="text-sm italic mt-4" style={{ color: GOLD }}>
            {language === 'es' ? '"Desde la consulta hasta la costa — tu seguridad viaja contigo."'
             : language === 'fr' ? '"De la consultation à la côte — votre sécurité voyage avec vous."'
             : '"From consultation to the coast — your safety travels with you."'}
          </p>

          <div className="mt-4">
            <SlotCounter />
          </div>

          {/* CTA buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-6 h-12 font-semibold text-sm"
              style={{ background: GOLD, color: '#070F0B' }}>
              <Link to="/booking">
                {language === 'es' ? 'Comienza Tu Viaje →' : language === 'fr' ? 'Commencez Votre Voyage →' : 'Begin Your Journey →'}
              </Link>
            </Button>
            <Button asChild variant="outline"
              className="rounded-full px-6 h-12 font-semibold text-sm text-white border-white/30 bg-transparent hover:bg-white/10 hover:text-white">
              <Link to="/procedures">
                {language === 'es' ? 'Explorar Tratamientos' : language === 'fr' ? 'Explorer les Traitements' : 'Explore Treatments'}
              </Link>
            </Button>
          </div>

          {/* Feature pills */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {badges.map(({ icon: Icon, label, sub }) => (
              <div key={label}
                className="rounded-xl border border-white/10 p-3 text-center transition-all duration-200 cursor-default group"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(212,175,55,0.35)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = ''; }}
              >
                <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: GOLD }} />
                <p className="text-[10px] font-bold leading-tight" style={{ color: GOLD }}>{label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{sub}</p>
              </div>
            ))}
          </div>

          {/* Journey timeline */}
          <div className="mt-8">
            <p className="text-[10px] font-semibold tracking-widest" style={{ color: GOLD }}>
              {language === 'es' ? 'ATENCIÓN, COORDINADA PARA TI' : 'CARE, COORDINATED FOR YOU'}
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {language === 'es' ? 'Cada detalle atendido. Cada paso apoyado.' : 'Every detail handled. Every step supported.'}
            </p>
            <div className="flex items-end justify-between w-full">
              {journeySteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center group cursor-default" style={{ minWidth: 0, flex: '0 0 auto' }}>
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center mb-1 transition-all duration-200 group-hover:bg-white/20">
                        <Icon className="w-3 h-3" style={{ color: GOLD }} />
                      </div>
                      <span className="text-[8px] text-center leading-tight" style={{ maxWidth: 42, color: GOLD }}>{step.label}</span>
                    </div>
                    {i < journeySteps.length - 1 && (
                      <span className="text-slate-500 text-[10px] flex-shrink-0 pb-4 mx-0.5">›</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Care Concierge widget */}
          <div className="mt-8 rounded-xl border border-white/10 p-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(212,168,67,0.18)' }}>
                <User className="w-5 h-5 text-slate-300" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 animate-pulse"
                style={{ borderColor: '#070F0B' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-semibold" style={{ color: GOLD }}>Care Concierge</p>
                <span className="text-[9px] font-medium text-green-400">● Online</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                {language === 'es'
                  ? 'Estamos aquí 24/7. ¿Necesitas ayuda planificando tu viaje?'
                  : "We're here for you 24/7. Need help planning your perfect care journey?"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feature cards — below main card */}
        <motion.div
          className="mt-4 grid grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
        >
          {featureCardData.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              onClick={() => setActiveCard(featureCardData[i])}
              className="rounded-xl p-4 flex items-start gap-3 border border-white/[0.10] cursor-pointer hover:border-yellow-500/30 transition-all duration-200"
              style={{ background: 'rgba(7,15,11,0.65)', backdropFilter: 'blur(16px)' }}
            >
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs" style={{ color: GOLD }}>{title}</p>
                <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">{body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* JOIN OUR NETWORK */}
        <div className="mt-6 rounded-2xl border border-white/10 p-5"
          style={{ background: 'rgba(7,15,11,0.65)', backdropFilter: 'blur(16px)' }}>
          <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: GOLD }}>JOIN OUR NETWORK</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/doctor-signup',              icon: Stethoscope, label: 'Doctor',            sub: 'Join specialist network',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
              { to: '/partner-signup/travel-agency', icon: Plane,     label: 'Travel Agency',     sub: 'Coordinate medical travel', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
              { to: '/partner-signup/taxi-service',  icon: Car,       label: 'Taxi Service',      sub: 'Patient transportation',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
              { to: '/companion-signup',             icon: HeartHandshake, label: 'Companion',    sub: 'Support patient journeys',  color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
            ].map(({ to, icon: Icon, label, sub, color, bg }) => (
              <Link key={to} to={to}
                className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors">{label}</p>
                  <p className="text-[9px] text-slate-400">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-4 flex items-center gap-4 px-1">
          <div className="flex items-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-slate-600 border-2 flex items-center justify-center overflow-hidden"
                style={{ borderColor: '#070F0B', marginLeft: i === 0 ? 0 : -6 }}>
                <User className="w-3 h-3 text-slate-400" />
              </div>
            ))}
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: GOLD }}>4.9 ★★★★★</span>
            <span className="text-xs text-slate-400 ml-2">1,200+ journeys</span>
          </div>
        </div>

      </div>

      {/* Feature card detail modal */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setActiveCard(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl p-6 border max-w-sm w-full"
              style={{ background: 'rgba(7,15,11,0.97)', borderColor: 'rgba(212,168,67,0.35)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <activeCard.icon className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="font-bold text-sm" style={{ color: GOLD }}>{activeCard.title}</p>
                </div>
                <button onClick={() => setActiveCard(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{activeCard.details}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}