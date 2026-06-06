import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, BadgeCheck, Plane, Users, Heart, Briefcase, Activity, Home, CheckCircle, User, X, Stethoscope, Car, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { name: 'Venezuela', cx: 155, cy: 295, lx: 155, ly: 310, anchor: 'start', flag: '🇻🇪', city: 'Caracas', treatments: ['Dental Implants', 'Veneers', 'Liposuction'] },
  { name: 'TURKEY',            cx: 155, cy: 105, lx: 148, ly: 96,  anchor: 'end',   flag: '🇹🇷', city: 'Istanbul',          treatments: ['Hair Transplant', 'Dental Veneers'] },
  { name: 'SOUTH KOREA',       cx: 362, cy: 105, lx: 370, ly: 96,  anchor: 'start', flag: '🇰🇷', city: 'Seoul',             treatments: ['Facial Aesthetics', 'Skin Treatments'] },
  { name: 'THAILAND',          cx: 372, cy: 178, lx: 380, ly: 170, anchor: 'start', flag: '🇹🇭', city: 'Bangkok',           treatments: ['Orthopedic Surgery', 'Recovery Retreats'] },
  { name: 'COLOMBIA',          cx: 375, cy: 242, lx: 383, ly: 234, anchor: 'start', flag: '🇨🇴', city: 'Medellín',          treatments: ['Rhinoplasty', 'Liposuction'] },
  { name: 'BRAZIL',            cx: 348, cy: 358, lx: 356, ly: 372, anchor: 'start', flag: '🇧🇷', city: 'São Paulo',         treatments: ['Body Contouring', 'Aesthetic Surgery'] },
  { name: 'COSTA RICA',        cx: 108, cy: 325, lx: 92,  ly: 340, anchor: 'end',   flag: '🇨🇷', city: 'San José',          treatments: ['Full Mouth Restoration', 'Crowns'] },
  { name: 'MEXICO',            cx: 102, cy: 195, lx: 94,  ly: 187, anchor: 'end',   flag: '🇲🇽', city: 'Cancún',            treatments: ['Dental Implants', 'Veneers'] },
  { name: 'VENEZUELA',          cx: 282, cy: 268, lx: 272, ly: 280, anchor: 'middle', flag: '🇻🇪', city: 'Caracas',           treatments: ['Cosmetic Surgery', 'Dental Care'] },
];


function SafeTGlobe({ shieldState }) {
  const sColor = shieldState?.shieldColor || GOLD;
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activeCountryIndex, setActiveCountryIndex] = useState(0);
  const svgRef = React.useRef(null);

  // Cycle through countries every 0.5s (8 countries = 4s total), then jump to shield
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveCountryIndex((prev) => (prev + 1) % COUNTRIES.length);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const handleDotEnter = (c, e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / 500;
    const scaleY = rect.height / 500;
    setTooltipPos({ x: c.cx * scaleX, y: c.cy * scaleY });
    setHoveredCountry(c);
  };

  return (
    <div className="relative w-full" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Tooltip overlay */}
      {hoveredCountry && (
        <motion.div
          key={hoveredCountry.name}
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: hoveredCountry.anchor === 'end'
              ? 'translate(-100%, -110%)'
              : 'translate(8px, -110%)',
          }}
        >
          <div style={{
            background: 'rgba(8, 14, 32, 0.97)',
            border: `1px solid ${GOLD}66`,
            borderRadius: 10,
            padding: '8px 12px',
            minWidth: 148,
            boxShadow: `0 0 18px rgba(212,168,67,0.18)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{hoveredCountry.flag}</span>
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {hoveredCountry.city}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(212,168,67,0.15)', paddingTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {hoveredCountry.treatments.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      <svg ref={svgRef} viewBox="0 0 500 500" width="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="globeBase" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#1e3a70" />
            <stop offset="55%" stopColor="#0b1635" />
            <stop offset="100%" stopColor="#030b18" />
          </radialGradient>
          <filter id="shieldGlow" x="-100%" y="-100%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="32" result="blur1" />
            <feGaussianBlur stdDeviation="12" result="blur2" in="SourceGraphic" />
            <feGaussianBlur stdDeviation="4"  result="blur3" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur3" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="shieldAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={sColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={sColor} stopOpacity="0" />
          </radialGradient>
          <filter id="dotGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="greenGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="shieldGold" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={sColor} stopOpacity="0.95" />
            <stop offset="60%" stopColor={sColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={sColor} stopOpacity="0.55" />
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
            @keyframes dataPulse {
              0%   { stroke-dashoffset: 340; opacity: 0; }
              10%  { opacity: 1; }
              80%  { opacity: 0.9; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes outerRingPulse {
              0%, 100% { opacity: 0.08; r: 228; }
              50%       { opacity: 0.22; r: 232; }
            }
            @keyframes shieldBloom {
              0%, 100% { opacity: 0.55; }
              50%       { opacity: 1; }
            }
            @keyframes scanRotate {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes countryHop {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
            .globe-grid {
              transform-origin: 250px 250px;
              animation: globeSpin 50s linear infinite;
            }
            .flow-line {
              stroke-dasharray: 16 324;
              animation: dataFlow 3.5s linear infinite;
            }
            .data-pulse {
              stroke-dasharray: 8 332;
              animation: dataPulse 3.5s linear infinite;
            }
            .outer-ring-pulse {
              animation: outerRingPulse 3s ease-in-out infinite;
            }
            .shield-bloom {
              animation: shieldBloom 2.4s ease-in-out infinite;
            }
            .scan-line {
              transform-origin: 250px 250px;
              animation: scanRotate 4s linear infinite;
            }
          `}</style>
        </defs>

        {/* Outer pulsing ring */}
        <circle cx="250" cy="250" r="228" fill="none" stroke="#D4AF37" strokeWidth="2" className="outer-ring-pulse" />

        {/* Atmosphere rings */}
        <circle cx="250" cy="250" r="222" fill="none" stroke="#D4AF37" strokeWidth="1"   opacity="0.14" />
        <circle cx="250" cy="250" r="208" fill="none" stroke="#D4AF37" strokeWidth="0.6" opacity="0.09" />

        {/* Globe body — transparent so sunset bleeds through */}
        <circle cx="250" cy="250" r="190" fill="transparent" stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.35" />

        {/* Continent outlines — subtle gold */}
        <g fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.28" strokeLinejoin="round" strokeLinecap="round">
          {/* North America */}
          <path d="M90 130 L95 118 L108 112 L118 108 L130 105 L140 100 L150 96 L162 98 L168 108 L165 120 L158 128 L152 138 L148 150 L140 162 L132 172 L125 182 L118 192 L112 205 L108 218 L104 228 L100 238 L96 248 L92 258 L90 268 L88 278 L86 285 L88 295 L94 302 L100 308 L106 315 L110 322 L108 330 L102 334 L95 330 L88 322 L82 314 L78 305 L76 295 L78 285 L80 275 L78 265 L74 256 L72 246 L72 236 L74 226 L76 216 L78 206 L80 196 L82 186 L84 176 L86 166 L88 156 L90 146 Z" />
          {/* Central America connection */}
          <path d="M108 330 L112 338 L116 345 L118 352 L116 358 L112 362 L108 365" />
          {/* South America */}
          <path d="M130 340 L138 328 L148 318 L158 312 L168 308 L178 305 L188 304 L198 306 L206 310 L212 318 L216 328 L218 340 L218 352 L216 364 L212 376 L206 388 L198 400 L190 412 L182 424 L174 434 L168 442 L162 448 L156 452 L150 454 L144 452 L138 446 L134 438 L130 428 L128 416 L128 404 L128 392 L128 380 L128 368 L128 356 L130 344 Z" />
          {/* Europe */}
          <path d="M230 90 L238 82 L248 78 L258 76 L268 78 L276 84 L280 92 L278 100 L270 106 L262 108 L255 106 L248 100 L242 94 Z M260 78 L265 70 L272 66 L280 68 L284 74 L282 80" />
          {/* Africa rough */}
          <path d="M235 140 L242 128 L252 120 L262 116 L272 116 L282 120 L290 128 L295 138 L297 150 L296 162 L292 174 L286 186 L280 198 L274 210 L268 222 L262 234 L256 244 L250 252 L244 258 L238 262 L234 264 L230 262 L228 254 L228 244 L230 234 L232 222 L234 210 L234 198 L234 186 L234 174 L234 162 L234 150 Z" />
          {/* Asia rough */}
          <path d="M290 80 L302 72 L315 68 L328 66 L342 66 L356 68 L368 72 L378 78 L386 86 L390 96 L388 106 L382 114 L374 120 L366 124 L358 126 L350 126 L342 124 L334 120 L328 116 L322 112 L316 108 L310 104 L304 100 L298 96 L294 90 Z" />
          {/* SE Asia */}
          <path d="M358 126 L365 134 L370 144 L372 155 L370 165 L365 172 L358 176 L352 174 L348 166 L348 156 L350 146 L355 136 Z" />
          {/* Australia hint */}
          <path d="M370 320 L380 312 L392 308 L404 308 L414 312 L420 320 L420 330 L416 340 L408 346 L398 348 L388 346 L380 340 L374 332 Z" />
        </g>

        {/* 1) Rotating gold grid */}
        <g className="globe-grid">
          {[-132, -76, 0, 76, 132].map((dy, i) => {
            const rx = Math.sqrt(Math.max(0, 190 * 190 - dy * dy));
            return (
              <ellipse key={i} cx="250" cy={250 + dy} rx={rx} ry={rx * 0.28}
                stroke="#D4AF37" strokeWidth="0.7" fill="none" opacity="0.38" />
            );
          })}
          {[0.12, 0.44, 0.8, 0.8, 0.44, 0.12].map((f, i) => (
            <ellipse key={i} cx="250" cy="250" rx={f * 190} ry="190"
              stroke="#D4AF37" strokeWidth="0.7" fill="none" opacity="0.28" />
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

        {/* Animated gold data pulses — travel from each country TO the shield center */}
        {COUNTRIES.map((c, i) => (
          <line key={`pulse-${i}`} className="data-pulse"
            x1={c.cx} y1={c.cy} x2="250" y2="250"
            stroke="#f8e690" strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.44}s` }}
          />
        ))}

        {/* 2) Pulsing country dots — brighter with larger halo */}
        {COUNTRIES.map((c, i) => (
          <motion.g key={i} filter="url(#dotGlow)"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            style={{ transformOrigin: `${c.cx}px ${c.cy}px`, transformBox: 'fill-box', cursor: 'pointer' }}
            onMouseEnter={(e) => handleDotEnter(c, e)}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <circle cx={c.cx} cy={c.cy} r="22" fill={GOLD} opacity="0.07" />
            <circle cx={c.cx} cy={c.cy} r="16" fill="transparent" />
            <circle cx={c.cx} cy={c.cy} r="14" fill={GOLD} opacity="0.14" />
            <circle cx={c.cx} cy={c.cy} r="8"  fill={GOLD} opacity="0.28" />
            <circle cx={c.cx} cy={c.cy} r="5"  fill={GOLD} opacity="0.95" />
            <circle cx={c.cx} cy={c.cy} r="2.5" fill="#fff8c0" opacity="1" />
          </motion.g>
        ))}

        {/* Gold star landmarks above each dot */}
        {COUNTRIES.map((c, i) => (
          <text key={i} x={c.cx} y={c.cy - 12}
            fontSize="10" fill={GOLD} opacity="0.75"
            textAnchor="middle" fontFamily="system-ui,sans-serif">
            ★
          </text>
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

        {/* Shield aura glow rings — soft premium green glow */}
        <circle cx="250" cy="244" r="105" fill="url(#shieldAura)" opacity="0.55" />
        <circle cx="250" cy="244" r="88"  fill="url(#shieldAura)" opacity="0.75" />
        <motion.circle cx="250" cy="244" r="78"
          fill="none" stroke={sColor} strokeWidth="2"
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx="250" cy="244" r="72"  fill="none" stroke={sColor} strokeWidth="1" opacity="0.4" />

        {/* Center shield — framer-motion pulse */}
        <motion.g
          filter="url(#shieldGlow)"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        >
          {/* Outer glow rings */}
          <circle cx="250" cy="244" r="68" fill={GOLD} opacity="0.07" />
          <circle cx="250" cy="244" r="54" fill={GOLD} opacity="0.06" />

          {/* Shield body */}
          <path
            d="M250 166 L314 196 L314 250 C314 286 286 310 250 324 C214 310 186 286 186 250 L186 196 Z"
            fill="url(#shieldGold)"
          />
          {/* Shield inner dark overlay for depth */}
          <path
            d="M250 176 L307 204 L307 250 C307 282 282 303 250 315 C218 303 193 282 193 250 L193 204 Z"
            fill="#07111e" opacity="0.38"
          />
          {/* Shield inner gold border */}
          <path
            d="M250 176 L307 204 L307 250 C307 282 282 303 250 315 C218 303 193 282 193 250 L193 204 Z"
            fill="none" stroke={GOLD} strokeWidth="1" opacity="0.4"
          />

          {/* Clean medical cross - white, centered */}
          <path
            d="M244 218 L256 218 L256 240 L278 240 L278 252 L256 252 L256 274 L244 274 L244 252 L222 252 L222 240 L244 240 Z"
            fill="#FFFFFF"
          />
        </motion.g>

        {/* Globe rim */}
        <circle cx="250" cy="250" r="190" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.45" />

        {/* Green scanning line - rotates 360° every 4 seconds */}
        <g className="scan-line">
          <line
            x1="250" y1="250"
            x2="430" y2="250"
            stroke="#22c55e"
            strokeWidth="2.5"
            opacity="0.7"
            strokeLinecap="round"
            filter="url(#greenGlow)"
          />
        </g>

        {/* Green jumping dot - stays at each country, bounces, then jumps to shield */}
        <motion.circle
          cx={activeCountryIndex < COUNTRIES.length ? COUNTRIES[activeCountryIndex].cx : 250}
          cy={activeCountryIndex < COUNTRIES.length ? COUNTRIES[activeCountryIndex].cy : 244}
          r="6"
          fill="#22c55e"
          opacity="0.95"
          filter="url(#greenGlow)"
          animate={{
            scale: [1, 1.25, 1],
            r: [6, 8, 6]
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );
}


const SHIELD_STATES = [
  {
    key: 'green',
    shieldColor: '#22c55e',
    glowColor: 'rgba(34,197,94,0.45)',
    ringColor: 'rgba(34,197,94,0.2)',
    title: "YOU'RE PROTECTED",
    titleColor: '#22c55e',
    subtext: 'Your care journey appears compatible.',
    dotColor: '#22c55e',
  },
  {
    key: 'yellow',
    shieldColor: '#d4a843',
    glowColor: 'rgba(212,168,67,0.45)',
    ringColor: 'rgba(212,168,67,0.2)',
    title: 'ENHANCED REVIEW',
    titleColor: '#d4a843',
    subtext: 'Recovery compatibility may require provider review.',
    dotColor: '#d4a843',
  },
  {
    key: 'red',
    shieldColor: '#f87171',
    glowColor: 'rgba(248,113,113,0.4)',
    ringColor: 'rgba(248,113,113,0.18)',
    title: 'ATTENTION REQUIRED',
    titleColor: '#f87171',
    subtext: 'Please consult with our care team before proceeding.',
    dotColor: '#f87171',
  },
];

export default function Hero() {
  const [language, setLanguage] = useState('en');
  const [activeCard, setActiveCard] = useState(null);
  const { navigateToLogin } = useAuth();

  // Fixed on green state only
  const shieldState = SHIELD_STATES[0];

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    setLanguage(savedLang);
    const handleLanguageChange = (e) => setLanguage(e.detail.language);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const badges = getBadges(language);

  const featureCards = [
    { icon: Users,     title: 'Human Care',            body: 'Real people, real support, when you need it most.',
      details: 'Our dedicated care coordinators are available 24/7 via WhatsApp, phone, or email. You\'ll have a named human contact assigned to your journey — not a chatbot — who knows your case from day one through recovery.' },
    { icon: Shield,    title: 'Safe Connections',       body: 'Vetted specialists and trusted global partners.',
      details: 'Every doctor, clinic, and travel partner in our network passes a multi-step verification: license validation, credential cross-referencing, AI document analysis, and ongoing performance monitoring. We never assign unverified providers.' },
    { icon: Heart,     title: 'Better Outcomes',        body: 'Care designed around your safety and recovery.',
      details: 'Our SAFE-T 4LIFE™ system analyzes 40+ health markers before your trip. Post-procedure, you receive a 7-day monitored recovery protocol, dietary planning, and follow-up check-ins to ensure a smooth and safe recovery.' },
    { icon: Briefcase, title: 'Travel With Confidence', body: "From arrival to recovery, you're never alone.",
      details: 'We coordinate every logistics detail: airport pickup, hotel booking, clinic transfers, local transport, and return travel. Our concierge handles it all so you can focus entirely on your health and healing.' },
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
          style={{ opacity: 0.55, objectPosition: '72% center' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0a0f1e 28%, rgba(10,15,30,0.72) 52%, rgba(10,15,30,0.18) 75%, rgba(10,15,30,0.5))' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,15,30,0.55), transparent 35%, rgba(10,15,30,0.75))' }} />
      </div>

      {/* Radial golden glow behind globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div style={{ width: 640, height: 640, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 68%)' }} />
      </div>

      {/* MORALES branding — top left */}
      <div className="absolute left-5 top-5 z-50 hidden lg:block">
        <p className="font-bold text-white tracking-[0.12em]" style={{ fontSize: '1.05rem', letterSpacing: '0.15em' }}>MORALES</p>
        <p className="text-[9px] font-semibold tracking-[0.08em] leading-[1.5]" style={{ color: GOLD }}>
          DENTAL &amp; AESTHETIC<br />TRAVEL CONCIERGE
        </p>
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
            className="rounded-2xl border border-white/10 p-6 lg:p-7 pb-7 backdrop-blur-md overflow-visible"
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
              {badges.map(({ icon: Icon, label, sub }) => (
                <div key={label}
                  className="rounded-xl border border-white/10 p-3 text-center transition-all duration-200 cursor-default group"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 18px rgba(212,175,55,0.35)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = ''; }}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1.5 transition-colors duration-200 group-hover:drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]" style={{ color: GOLD }} />
                  <p className="text-[10px] font-bold leading-tight transition-colors duration-200" style={{ color: GOLD }}>{label}</p>
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
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center mb-1 transition-all duration-200 group-hover:bg-white/20 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.45)]">
                          <Icon className="w-3 h-3 transition-colors duration-200 group-hover:text-yellow-300" style={{ color: GOLD }} />
                        </div>
                        <span className="text-[8px] text-center leading-tight transition-colors duration-200 group-hover:text-yellow-300" style={{ maxWidth: 42, color: GOLD }}>{step.label}</span>
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
                  style={{ borderColor: '#0a0f1e' }} />
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

          {/* ═══ COLUMN 2 — CENTER GLOBE ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-full max-w-sm lg:max-w-none mx-auto">
              <SafeTGlobe shieldState={shieldState} />
            </div>

            {/* YOU'RE PROTECTED card — fixed green state */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-xs mt-3 mx-auto rounded-2xl p-5 border"
              style={{ background: 'rgba(13,26,46,0.92)', borderColor: `${shieldState.shieldColor}55` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: shieldState.titleColor }} />
                <p className="font-bold text-base" style={{ color: shieldState.titleColor }}>{shieldState.title}</p>
              </div>
              <p className="text-slate-300 text-sm mb-3">Your care plan is verified and secure.</p>
              <div className="border-t border-white/10 pt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: shieldState.dotColor }} />
                <span className="text-xs text-slate-400">Scan complete • All systems safe</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="rounded-full w-3 h-3" style={{ background: shieldState.dotColor }} />
                <span className="rounded-full w-2 h-2" style={{ background: '#334155' }} />
                <span className="rounded-full w-2 h-2" style={{ background: '#334155' }} />
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
                whileHover={{
                  scale: 1.02,
                  y: -4,
                  boxShadow: "0px 10px 30px rgba(212, 175, 55, 0.15)",
                  borderColor: "rgba(212, 175, 55, 0.4)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={() => setActiveCard(featureCards[i])}
                className={`rounded-2xl p-4 flex items-start gap-4 border border-white/[0.12] cursor-pointer${i >= 2 ? ' hidden lg:flex' : ''}`}
                style={{ background: 'rgba(18,20,34,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-slate-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <motion.p
                    className="font-semibold text-sm"
                    style={{ color: '#D4AF37' }}
                    animate={{ color: '#D4AF37' }}
                    whileHover={{ color: '#F5D85F' }}
                    transition={{ duration: 0.2 }}
                  >
                    {title}
                  </motion.p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-1">{body}</p>
                </div>
                <span className="text-white/30 text-xs flex-shrink-0 mt-0.5">›</span>
              </motion.div>
            ))}

            {/* Info modal */}
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
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-2xl p-6 border max-w-sm w-full"
                    style={{ background: 'rgba(10,15,30,0.97)', borderColor: 'rgba(212,168,67,0.35)' }}
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

              {/* JOIN OUR NETWORK - Provider signup cards */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: GOLD }}>JOIN OUR NETWORK</p>
                <div className="space-y-2">
                  {/* Doctor */}
                  <Link to="/doctor-signup" className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all duration-200 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]" style={{ background: 'rgba(14,165,233,0.15)' }}>
                      <Stethoscope className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors">Doctor</p>
                      <p className="text-[9px] text-slate-400">Join our specialist network</p>
                    </div>
                    <span className="text-white/30 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
                  </Link>

                  {/* Travel Agency */}
                  <Link to="/partner-signup/travel-agency" className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all duration-200 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <Plane className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors">Travel Agency</p>
                      <p className="text-[9px] text-slate-400">Coordinate medical travel</p>
                    </div>
                    <span className="text-white/30 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
                  </Link>

                  {/* Taxi Service */}
                  <Link to="/partner-signup/taxi-service" className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all duration-200 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <Car className="w-4 h-4" style={{ color: '#22c55e' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors">Taxi Service Agency</p>
                      <p className="text-[9px] text-slate-400">Patient transportation</p>
                    </div>
                    <span className="text-white/30 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
                  </Link>

                  {/* Companion */}
                  <Link to="/companion-signup" className="group flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-all duration-200 cursor-pointer">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.3)]" style={{ background: 'rgba(236,72,153,0.15)' }}>
                      <HeartHandshake className="w-4 h-4" style={{ color: '#ec4899' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors">Companion Agency</p>
                      <p className="text-[9px] text-slate-400">Support patient journeys</p>
                    </div>
                    <span className="text-white/30 text-xs group-hover:translate-x-0.5 transition-transform">›</span>
                  </Link>
                </div>
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