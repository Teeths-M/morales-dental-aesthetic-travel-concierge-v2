import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Briefcase, MessageCircle, HomeIcon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobeVisualization, { SHIELD_STATES } from './GlobeVisualization';

const GOLD = '#c9a84c';

const FEATURES = [
  {
    icon: Users,
    title: 'Human Care',
    sub: 'Real people, real support when you need it most.',
  },
  {
    icon: Shield,
    title: 'Safe Connections',
    sub: 'Vetted specialists and trusted global partners.',
  },
  {
    icon: Heart,
    title: 'Better Outcomes',
    sub: 'Care designed around your safety and recovery.',
  },
  {
    icon: Briefcase,
    title: 'Travel With Confidence',
    sub: "From arrival to recovery, you're never alone.",
  },
];

const BADGES = [
  { icon: Shield,     label: 'SAFE-T 4LIFE™',       sub: 'AI-Powered Safety' },
  { icon: BadgeCheck, label: 'Verified Specialists', sub: 'Licensed & Trusted' },
  { icon: Plane,      label: 'Door-to-Door Care',    sub: 'Travel. Care. Recover.' },
];

export default function Hero() {
  const [language, setLanguage] = useState('en');
  const [shieldState, setShieldState] = useState(SHIELD_STATES[0]);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return (
    <section
      style={{ minHeight: '100vh', position: 'relative' }}
      className="relative overflow-hidden flex flex-col pt-[72px]"
    >
      {/* Warm sunset background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1800&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
      }} />
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'rgba(4,6,8,0.78)',
      }} />
      {/* Main layout: LEFT text | CENTER globe | RIGHT feature cards */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── LEFT: Text content (35%) ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          className="w-full lg:w-[35%] flex flex-col justify-center px-6 sm:px-10 py-10 lg:py-14"
        >
          <h1
            className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.02] mb-5"
            style={{ letterSpacing: '-0.03em' }}
          >
            {language === 'es'
              ? 'Tu cuidado seguro comienza aquí.'
              : language === 'fr'
              ? 'Vos soins sûrs commencent ici.'
              : 'Your safe care journey starts here.'}
          </h1>

          <p className="text-white/65 text-base leading-relaxed mb-4">
            {language === 'es'
              ? 'Especialistas verificados, coordinación de viaje y apoyo de recuperación en un solo plan claro y humano.'
              : language === 'fr'
              ? 'Spécialistes vérifiés, coordination de voyage et soutien à la récupération dans un plan humain clair.'
              : 'Verified specialists, travel coordination, and recovery support in one clear, human care plan.'}
          </p>

          <p className="text-base italic mb-7" style={{ color: GOLD }}>
            {language === 'es'
              ? '"Desde la consulta hasta la costa — tu seguridad viaja contigo."'
              : language === 'fr'
              ? '"De la consultation à la côte — votre sécurité voyage avec vous."'
              : '"From consultation to the coast — your safety travels with you."'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 mb-7">
            <Link to="/consultation">
              <Button
                size="lg"
                className="h-11 px-6 rounded-md font-semibold text-sm"
                style={{ background: '#0d9488', color: '#fff' }}
              >
                {language === 'es' ? 'Comienza Tu Viaje →' : language === 'fr' ? 'Commencez →' : 'Begin Your Journey →'}
              </Button>
            </Link>
            <Link to="/procedures">
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 rounded-md font-semibold text-sm border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                {language === 'es' ? 'Explorar' : language === 'fr' ? 'Explorer' : 'Explore Treatments'}
              </Button>
            </Link>
          </div>

          {/* Journey steps */}
          <div className="mb-7">
            <p className="text-[10px] font-mono tracking-[0.22em] uppercase mb-3" style={{ color: GOLD }}>
              Care, Coordinated For You
            </p>
            <div className="flex items-center flex-wrap gap-y-2">
              {[
                { icon: MessageCircle, label: 'Consultation' },
                { icon: Plane,         label: 'Travel'       },
                { icon: Activity,      label: 'Treatment'    },
                { icon: Heart,         label: 'Recovery'     },
                { icon: HomeIcon,      label: 'Return Home'  },
              ].map(({ icon: StepIcon, label }, i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(201,168,76,0.12)', border: `1px solid ${GOLD}40` }}
                    >
                      <StepIcon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    </div>
                    <span className="text-white/60 text-[9px] font-medium whitespace-nowrap">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex-1 min-w-[10px] max-w-[18px] h-px mx-1" style={{ background: `${GOLD}40` }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col gap-2">
            {BADGES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-lg px-3 py-2 w-fit"
                style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                <div>
                  <p className="text-white text-[11px] font-bold leading-none">{label}</p>
                  <p className="text-white/45 text-[10px] mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CENTER: Globe (40%) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="w-full lg:w-[40%] relative flex flex-col items-center justify-center"
          style={{ minHeight: 660 }}
        >
          <div style={{ width: '100%', height: '100%', minHeight: 696, maxHeight: 1090, position: 'relative' }}>
            <GlobeVisualization onStateChange={setShieldState} />
          </div>

          {/* Shield status card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={shieldState.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                bottom: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                maxWidth: 340,
                background: 'rgba(8,8,12,0.72)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: `1px solid ${shieldState.color}35`,
                borderRadius: 14,
                padding: '14px 18px',
                zIndex: 20,
                boxShadow: `0 0 32px ${shieldState.color}20, 0 4px 24px rgba(0,0,0,0.5)`,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Color indicator dot */}
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: shieldState.color,
                    flexShrink: 0, marginTop: 4,
                    boxShadow: `0 0 8px ${shieldState.color}`,
                  }}
                />
                <div>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                    {shieldState.title}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '4px 0 6px', lineHeight: 1.4 }}>
                    {shieldState.sub}
                  </p>
                  <p style={{ color: shieldState.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', margin: 0 }}>
                    ● {shieldState.badge}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── RIGHT: Feature cards (25%) ── */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="w-full lg:w-[25%] flex flex-col justify-center gap-4 px-5 py-10 lg:py-14"
        >
          {FEATURES.map(({ icon: Icon, title, sub }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl p-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.12)', border: `1px solid ${GOLD}40` }}
              >
                <Icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{title}</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom strip */}
      <div
        className="relative z-10 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/10"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <p className="text-white/30 text-xs">
          More Than a Journey — <span className="text-white/55">It's Peace of Mind</span>
        </p>
        <p className="text-white/30 text-xs hidden sm:block">
          Real people. Real care. Real support — before, during, and after your trip.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-black bg-gradient-to-br from-amber-300 to-amber-600" />
            ))}
          </div>
          <div>
            <p className="text-white text-xs font-bold">4.9 ★★★★★</p>
            <p className="text-white/40 text-[10px]">Based on 1,200+ journeys</p>
          </div>
        </div>
      </div>
    </section>
  );
}