import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import GlobeVisualization from './GlobeVisualization';

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
  const { navigateToLogin } = useAuth();

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return (
    <section
      style={{ background: '#0a0a0a', minHeight: '100vh' }}
      className="relative overflow-hidden flex flex-col"
    >
      {/* Top nav bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: GOLD }}>
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">MORALES</p>
            <p style={{ color: GOLD }} className="text-[9px] font-semibold tracking-widest leading-tight">
              DENTAL & AESTHETIC<br />TRAVEL CONCIERGE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigateToLogin(`${window.location.origin}/register-role`)}
            className="hidden sm:flex h-9 rounded-full border-white/30 bg-transparent text-white text-xs font-semibold hover:bg-white/10"
          >
            Register
          </Button>
          <Button
            onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
            className="h-9 rounded-full px-5 text-xs font-bold"
            style={{ background: GOLD, color: '#0a0a0a' }}
          >
            Book a Consultation
          </Button>
        </div>
      </div>

      {/* Main layout: LEFT text | CENTER globe | RIGHT feature cards */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0">

        {/* ── LEFT: Text content (35%) ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9 }}
          className="w-full lg:w-[35%] flex flex-col justify-center px-6 sm:px-10 py-10 lg:py-14"
        >
          <h1
            className="font-display text-4xl sm:text-5xl text-white leading-[1.05] mb-5"
            style={{ letterSpacing: '-0.02em' }}
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
          className="w-full lg:w-[40%] relative flex items-center justify-center"
          style={{ minHeight: 552 }}
        >
          <div style={{ width: '100%', height: '100%', minHeight: 580, maxHeight: 910, position: 'relative' }}>
            <GlobeVisualization />
          </div>
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