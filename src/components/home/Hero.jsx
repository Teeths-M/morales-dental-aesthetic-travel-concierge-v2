import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Briefcase, Activity, Home, CheckCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import SlotCounter from './SlotCounter';
import { translations } from '@/lib/translations';
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
      gold: true,
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

const COUNTRIES = [
  { name: 'TURKEY',      cx: 155, cy: 105, lx: 148, ly: 96,  anchor: 'end'   },
  { name: 'SOUTH KOREA', cx: 362, cy: 105, lx: 370, ly: 96,  anchor: 'start' },
  { name: 'THAILAND',    cx: 372, cy: 178, lx: 380, ly: 170, anchor: 'start' },
  { name: 'COLOMBIA',    cx: 375, cy: 242, lx: 383, ly: 234, anchor: 'start' },
  { name: 'BRAZIL',      cx: 348, cy: 358, lx: 356, ly: 372, anchor: 'start' },
  { name: 'COSTA RICA',  cx: 108, cy: 325, lx: 100, ly: 340, anchor: 'end'   },
  { name: 'MEXICO',      cx: 102, cy: 195, lx: 94,  ly: 187, anchor: 'end'   },
];

function SafeTGlobe() {
  return (
    <div className="relative w-full" style={{ maxWidth: 480, margin: '0 auto' }}>
      <svg viewBox="0 0 500 500" width="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="globeBase" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#1e3a70" />
            <stop offset="55%" stopColor="#0b1635" />
            <stop offset="100%" stopColor="#030b18" />
          </radialGradient>
          <filter id="shieldGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dotGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="shieldGold" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#f0c84a" />
            <stop offset="60%" stopColor="#d4a843" />
            <stop offset="100%" stopColor="#9a7020" />
          </linearGradient>
          <style>{`
            @keyframes globeSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes dataFlow {
              0%   { stroke-dashoffset: 340; }
              100% { stroke-dashoffset: 0; }
            }
            .globe-grid {
              transform-origin: 250px 250px;
              animation: globeSpin 50s linear infinite;
            }
            .flow-line {
              stroke-dasharray: 16 324;
              animation: dataFlow 3.5s linear infinite;
            }
          `}</style>
        </defs>

        {/* Atmosphere rings */}
        <circle cx="250" cy="250" r="222" fill="none" stroke={GOLD} strokeWidth="1"   opacity="0.08" />
        <circle cx="250" cy="250" r="208" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.05" />

        {/* Globe body */}
        <circle cx="250" cy="250" r="190" fill="url(#globeBase)" stroke="#1e3a5f" strokeWidth="1.5" />

        {/* 1) Rotating grid */}
        <g className="globe-grid">
          {[-132, -76, 0, 76, 132].map((dy, i) => {
            const rx = Math.sqrt(Math.max(0, 190 * 190 - dy * dy));
            return (
              <ellipse key={i} cx="250" cy={250 + dy} rx={rx} ry={rx * 0.28}
                stroke="#1e3a5f" strokeWidth="0.6" fill="none" opacity="0.5" />
            );
          })}
          {[0.12, 0.44, 0.8, 0.8, 0.44, 0.12].map((f, i) => (
            <ellipse key={i} cx="250" cy="250" rx={f * 190} ry="190"
              stroke="#1e3a5f" strokeWidth="0.6" fill="none" opacity="0.38" />
          ))}
        </g>

        {/* 3) Data-flow connection lines */}
        {COUNTRIES.map((c, i) => (
          <line key={i} className="flow-line"
            x1={c.cx} y1={c.cy} x2="250" y2="250"
            stroke={GOLD} strokeWidth="1.1" opacity="0.55"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}

        {/* 2) Pulsing country dots */}
        {COUNTRIES.map((c, i) => (
          <motion.g key={i} filter="url(#dotGlow)"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            style={{ transformOrigin: `${c.cx}px ${c.cy}px`, transformBox: 'fill-box' }}
          >
            <circle cx={c.cx} cy={c.cy} r="11" fill={GOLD} opacity="0.12" />
            <circle cx={c.cx} cy={c.cy} r="5"   fill={GOLD} opacity="0.92" />
            <circle cx={c.cx} cy={c.cy} r="2.5" fill="#f8e690" opacity="0.95" />
          </motion.g>
        ))}

        {/* Country labels */}
        {COUNTRIES.map((c, i) => (
          <text key={i} x={c.lx} y={c.ly}
            fontSize="9" fill="rgba(255,255,255,0.82)"
            fontFamily="system-ui,-apple-system,sans-serif"
            fontWeight="600" letterSpacing="1.1" textAnchor={c.anchor}>
            {c.name}
          </text>
        ))}

        {/* Center shield — framer-motion pulse */}
        <motion.g
          filter="url(#shieldGlow)"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        >
          <circle cx="250" cy="242" r="72" fill={GOLD} opacity="0.06" />
          <circle cx="250" cy="242" r="55" fill={GOLD} opacity="0.05" />
          <path
            d="M250 170 L310 198 L310 248 C310 280 284 304 250 316 C216 304 190 280 190 248 L190 198 Z"
            fill="url(#shieldGold)"
          />
          <path
            d="M250 180 L303 206 L303 248 C303 276 280 296 250 307 C220 296 197 276 197 248 L197 206 Z"
            fill="#06101e" opacity="0.42"
          />
          <path
            d="M250 278 C250 278 226 261 226 245 C226 236 233 229 241 229 C245.5 229 249 232 250 233.5 C251 232 254.5 229 259 229 C267 229 274 236 274 245 C274 261 250 278 250 278 Z"
            fill="white" opacity="0.95"
          />
        </motion.g>

        {/* Globe rim */}
        <circle cx="250" cy="250" r="190" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.28" />
      </svg>
    </div>
  );
}

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

  const badges = getBadges(language);

  const featureCards = [
    { icon: Users,     title: 'Human Care',            body: 'Real people, real support, when you need it most.' },
    { icon: Shield,    title: 'Safe Connections',       body: 'Vetted specialists and trusted global partners.' },
    { icon: Heart,     title: 'Better Outcomes',        body: 'Care designed around your safety and recovery.' },
    { icon: Briefcase, title: 'Travel With Confidence', body: "From arrival to recovery, you're never alone." },
  ];

  const journeySteps = [
    { icon: Shield,   label: language === 'es' ? 'Consulta'    : language === 'fr' ? 'Consultation'   : 'Consultation' },
    { icon: Plane,    label: language === 'es' ? 'Viaje'       : language === 'fr' ? 'Voyage'          : 'Travel'       },
    { icon: Activity, label: language === 'es' ? 'Tratamiento' : language === 'fr' ? 'Traitement'      : 'Treatment'    },
    { icon: Heart,    label: language === 'es' ? 'Recuperación': language === 'fr' ? 'Rétablissement'  : 'Recovery'     },
    { icon: Home,     label: language === 'es' ? 'Regreso'     : language === 'fr' ? 'Retour'          : 'Return Home'  },
  ];

  return (
    <section className="relative min-h-screen bg-[#0a0f1e] overflow-hidden">

      {/* Background image + dark overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={SENTINEL_IMAGE} alt="" className="w-full h-full object-cover"
          style={{ opacity: 0.22, objectPosition: '72% center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0a0f1e 35%, rgba(10,15,30,0.75) 65%, rgba(10,15,30,0.15))' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,15,30,0.4), transparent 40%, rgba(10,15,30,0.85))' }} />
      </div>

      {/* Radial golden glow behind globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div style={{ width: 640, height: 640, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 68%)' }} />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-16 py-6 lg:py-8">

        {/* Top center label — desktop only */}
        <motion.div className="text-center mb-4 hidden lg:block"
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-sm font-bold tracking-[0.28em]" style={{ color: GOLD }}>SAFE-T4LIFE™</p>
          <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1">SAFETY INTELLIGENCE ENGINE</p>
        </motion.div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_280px] gap-6 lg:gap-8 items-start">

          {/* ═══ COLUMN 1 — LEFT PANEL ═══ */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-white/10 p-6 lg:p-8 backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {/* Headline */}
            <h1 className="font-bold text-white leading-[1.15] mb-3"
              style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.5rem)' }}>
              {language === 'es' ? 'Tu cuidado seguro comienza aquí.'
               : language === 'fr' ? 'Vos soins sûrs commencent ici.'
               : 'Your safe care journey starts here.'}
            </h1>

            {/* Subtext */}
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              {language === 'es'
                ? 'Especialistas verificados, coordinación de viaje y apoyo de recuperación en un plan claro y humano.'
                : language === 'fr'
                ? 'Spécialistes vérifiés, coordination du voyage et soutien à la récupération dans un plan humain.'
                : 'Verified specialists, travel coordination, and recovery support in one clear, human care plan.'}
            </p>

            {/* Gold italic quote */}
            <p className="text-sm italic mt-4" style={{ color: GOLD }}>
              {language === 'es' ? '"Desde la consulta hasta la costa — tu seguridad viaja contigo."'
               : language === 'fr' ? '"De la consultation à la côte — votre sécurité voyage avec vous."'
               : '"From consultation to the coast — your safety travels with you."'}
            </p>

            {/* Slot counter */}
            <div className="mt-4">
              <SlotCounter />
            </div>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6 h-12 font-semibold text-sm"
                style={{ background: GOLD, color: '#0a0f1e' }}>
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
              {badges.map(({ icon: Icon, label, sub, gold }) => (
                <div key={label} className="rounded-xl border border-white/10 p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: gold ? GOLD : 'white' }} />
                  <p className="text-[10px] font-bold leading-tight" style={{ color: gold ? GOLD : 'white' }}>{label}</p>
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
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {journeySteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <React.Fragment key={step.label}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-1">
                          <Icon className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                        <span className="text-[9px] text-slate-400 text-center whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < journeySteps.length - 1 && (
                        <span className="text-slate-500 text-xs flex-shrink-0 mx-0.5 mb-4">→</span>
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
                  style={{ borderColor: '#0a0f1e' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-white">Care Concierge</p>
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

          {/* ═══ COLUMN 2 — CENTER GLOBE ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-full max-w-sm lg:max-w-none mx-auto">
              <SafeTGlobe />
            </div>

            {/* YOU'RE PROTECTED card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="w-full max-w-xs mt-3 mx-auto rounded-2xl p-5 border"
              style={{ background: 'rgba(13,26,46,0.92)', borderColor: 'rgba(212,168,67,0.3)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="font-bold text-lg" style={{ color: GOLD }}>YOU'RE PROTECTED</p>
              </div>
              <p className="text-slate-300 text-sm mb-3">Your care journey appears compatible.</p>
              <div className="border-t border-white/10 pt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span className="text-xs text-slate-400">Scan complete • All systems safe</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="w-3 h-3 rounded-full" style={{ background: GOLD }} />
                {[0, 1, 2, 3].map(i => <span key={i} className="w-2 h-2 rounded-full bg-slate-600" />)}
              </div>
            </motion.div>
          </motion.div>

          {/* ═══ COLUMN 3 — RIGHT FEATURES ═══ */}
          <motion.div
            className="flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.35 } } }}
          >
            {featureCards.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                variants={{ hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } }}
                className={`rounded-2xl p-4 flex items-start gap-4 border border-white/[0.08]${i >= 2 ? ' hidden lg:flex' : ''}`}
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">{body}</p>
                </div>
              </motion.div>
            ))}

            {/* Social proof */}
            <div className="hidden lg:block pt-4">
              <p className="text-xs text-slate-400 mb-2">Trusted by Patients Worldwide</p>
              <div className="flex items-center mb-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}
                    className="w-7 h-7 rounded-full bg-slate-600 border-2 flex items-center justify-center overflow-hidden"
                    style={{ borderColor: '#0a0f1e', marginLeft: i === 0 ? 0 : -8 }}>
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ))}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm" style={{ color: GOLD }}>4.9 ★★★★★</span>
                <span className="text-xs text-slate-400">Based on 1,200+ journeys</span>
              </div>
            </div>
          </motion.div>

        </div>{/* end 3-col grid */}

        {/* ═══ BOTTOM BANNER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-8 rounded-2xl p-6 text-center border border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <Heart className="w-6 h-6 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-semibold" style={{ color: GOLD }}>
            {language === 'es' ? 'Más Que un Viaje — Es Paz Mental'
             : language === 'fr' ? "Plus Qu'un Voyage — C'est la Paix de l'Esprit"
             : "More Than a Journey — It's Peace of Mind"}
          </p>
          <p className="text-slate-300 text-sm mt-2">
            {language === 'es'
              ? 'Personas reales. Cuidado real. Apoyo real — antes, durante y después de tu viaje.'
              : language === 'fr'
              ? 'De vraies personnes. De vrais soins. Un vrai soutien — avant, pendant et après votre voyage.'
              : 'Real people. Real care. Real support — before, during, and after your trip.'}
          </p>
        </motion.div>

      </div>
    </section>
  );
}