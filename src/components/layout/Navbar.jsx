import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Globe, ChevronDown, Stethoscope, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNavLinks = (language) => [
  { label: language === 'es' ? 'Inicio' : language === 'fr' ? 'Accueil' : 'Home', path: '/' },
  { label: language === 'es' ? 'Descubrir' : language === 'fr' ? 'Découvrir' : 'Discover', path: '/discover' },
  { label: language === 'es' ? 'Procedimientos' : language === 'fr' ? 'Procédures' : 'Procedures', path: '/procedures' },
  { label: language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works', path: '/how-it-works' },
  { label: language === 'es' ? 'Nuestros Expertos' : language === 'fr' ? 'Nos Experts' : 'Our Experts', path: '/providers' },
  { label: 'SAFE-T 4LIFE™', path: '/safe-t' },
  { label: language === 'es' ? '🌍 Asistencia de Visa' : language === 'fr' ? '🌍 Assistance Visa' : '🌍 Visa Assist', path: '/visa-assist' },
  { label: language === 'es' ? 'Acerca de Nosotros' : language === 'fr' ? 'À Propos de Nous' : 'About Us', path: '/about' },
  { label: language === 'es' ? 'Panel de Control' : language === 'fr' ? 'Tableau de Bord' : 'Dashboard', path: '/dashboard' },
];

const allLanguages = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalHubOpen, setPortalHubOpen] = useState(false);
  const [partnerDropdownOpen, setPartnerDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const [navLinks, setNavLinks] = useState(getNavLinks(language));
  const location = useLocation();
  const { user, isAuthenticated, navigateToLogin, logout } = useAuth();
  const portalHubTimeoutRef = useRef(null);
  const partnerTimeoutRef = useRef(null);
  const languageTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { setNavLinks(getNavLinks(language)); }, [language]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('appLanguage', langCode);
    setLanguageDropdownOpen(false);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: langCode } }));
  };

  const SENSITIVE_PATHS = ['/checkout', '/payment', '/signup', '/register-role', '/doctor-signup', '/partner-signup', '/travel-agency-signup', '/taxi-service-signup', '/client-signup'];
  const isSensitive = SENSITIVE_PATHS.some(p => location.pathname.includes(p));
  const isHome = location.pathname === '/';

  const handleBack = () => {
    if (isSensitive) navigate('/', { replace: true });
    else if (window.history.length <= 1) navigate('/');
    else navigate(-1);
  };

  const handleSafeExit = () => navigate('/', { replace: true });

  const isAdmin = ['platform_admin', 'admin'].includes(user?.role);
  const portalLinks = [
    ...(isAdmin ? [
      { label: language === 'es' ? 'Acceso al Portal' : 'Portal Access', path: '/portal-hub' },
      { label: language === 'es' ? 'Administración' : 'Admin Dashboard', path: '/portal-hub/admin' },
    ] : []),
    ...(['doctor'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Doctor' : 'Doctor Dashboard', path: '/doctor-dashboard' },
    ] : []),
    ...(['travel_agency'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Agencia' : 'Travel Agency Dashboard', path: '/travel-agency-dashboard' },
    ] : []),
    ...(['taxi_service'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Taxi' : 'Taxi Service Dashboard', path: '/taxi-service-dashboard' },
    ] : []),
  ];

  const clientOnlyPaths = ['/dashboard', '/safe-t', '/visa-assist'];
  const canUseClientPortal = ['client', 'user', 'platform_admin', 'admin'].includes(user?.role);
  const visibleNavLinks = navLinks.filter(link => {
    if (!clientOnlyPaths.includes(link.path)) return true;
    return isAuthenticated && canUseClientPortal;
  });

  const rolePrimaryAction = {
    doctor: { path: '/doctor-dashboard', label: language === 'es' ? 'Panel de Doctor' : 'Doctor Dashboard' },
    travel_agency: { path: '/travel-agency-dashboard', label: language === 'es' ? 'Panel de Agencia' : 'Travel Agency Dashboard' },
    taxi_service: { path: '/taxi-service-dashboard', label: language === 'es' ? 'Panel de Taxi' : 'Taxi Dashboard' },
  }[user?.role] || { path: '/booking', label: language === 'es' ? 'Reservar Consulta' : language === 'fr' ? 'Réserver' : 'Book Consultation' };

  return (
    <>
      {/* ── TOP NAV ── */}
      <nav className="w-full min-h-[72px] fixed top-0 left-0 z-50 px-4 md:px-8 lg:px-12 flex items-center justify-between py-3 bg-[#020B0D]/90 backdrop-blur-md border-b border-white/[0.06]">

        {/* Brand — desktop only (mobile uses combined hamburger button) */}
        <div className="flex-shrink-0 hidden lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#051A1D] border border-white/[0.12] flex items-center justify-center rounded-lg shrink-0 overflow-hidden">
            <img
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg"
              alt="Morales"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-['Instrument_Serif'] text-base tracking-widest text-white uppercase font-medium leading-tight">
              Morales
            </span>
            <span className="text-[9px] tracking-[0.10em] text-[#D4AF37] uppercase font-sans mt-0.5 font-light">
              Dental &amp; Aesthetic Travel Concierge
            </span>
          </div>
        </Link>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center space-x-1 text-sm font-medium ml-6">
          {visibleNavLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                location.pathname === link.path
                  ? 'text-[#D4AF37] bg-white/[0.06]'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Partner Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => { if (partnerTimeoutRef.current) clearTimeout(partnerTimeoutRef.current); setPartnerDropdownOpen(true); }}
            onMouseLeave={() => { partnerTimeoutRef.current = setTimeout(() => setPartnerDropdownOpen(false), 800); }}
          >
            <button className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors rounded-md flex items-center gap-1 whitespace-nowrap">
              {language === 'es' ? 'Únete' : 'Join as Partner'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${partnerDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {partnerDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full right-0 mt-2 w-44 bg-[#051A1D] border border-white/[0.1] rounded-lg shadow-xl z-50"
                >
                  <Link
                    to="/register-role"
                    onClick={() => setPartnerDropdownOpen(false)}
                    className="block px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    {language === 'es' ? 'Elegir Rol' : 'Choose Role'}
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Portal Hub Dropdown */}
          {isAuthenticated && portalLinks.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => { if (portalHubTimeoutRef.current) clearTimeout(portalHubTimeoutRef.current); setPortalHubOpen(true); }}
              onMouseLeave={() => { portalHubTimeoutRef.current = setTimeout(() => setPortalHubOpen(false), 800); }}
            >
              <button className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors rounded-md flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" />
                Portal Hub
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${portalHubOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {portalHubOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-[#051A1D] border border-white/[0.1] rounded-lg shadow-xl z-50"
                  >
                    {portalLinks.map((link, i) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setPortalHubOpen(false)}
                        className={`block px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors ${i === 0 ? 'rounded-t-lg' : 'border-t border-white/[0.06]'} ${i === portalLinks.length - 1 ? 'rounded-b-lg' : ''}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Desktop Right Actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0 ml-auto">
          {/* Back button */}
          {!isHome && (
            <button
              onClick={handleBack}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-white/[0.1] text-white/50 hover:text-white hover:border-[#D4AF37]/50 transition-all"
            >
              ← Back
            </button>
          )}

          {/* Language */}
          <div
            className="relative"
            onMouseEnter={() => { if (languageTimeoutRef.current) clearTimeout(languageTimeoutRef.current); setLanguageDropdownOpen(true); }}
            onMouseLeave={() => { languageTimeoutRef.current = setTimeout(() => setLanguageDropdownOpen(false), 800); }}
          >
            <button className="p-2 hover:bg-white/[0.05] rounded-md transition-colors text-white/50 hover:text-white">
              <Globe className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {languageDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full right-0 mt-2 w-40 bg-[#051A1D] border border-white/[0.1] rounded-lg shadow-xl z-50"
                >
                  {allLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-white/[0.06] last:border-b-0 ${
                        language === lang.code ? 'text-[#D4AF37] bg-white/[0.05]' : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <>
              <Link
                to={rolePrimaryAction.path}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#020B0D] hover:bg-[#D4AF37]/90 transition-colors"
              >
                {rolePrimaryAction.label}
              </Link>
              <button
                onClick={() => logout()}
                className="px-3 py-2 text-sm text-white/50 hover:text-white transition-colors border border-white/[0.1] rounded-lg hover:border-white/30"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigateToLogin(`${window.location.origin}/register-role`)}
                className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors border border-white/[0.1] rounded-lg hover:border-white/30"
              >
                Register
              </button>
              <button
                onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#020B0D] hover:bg-[#D4AF37]/90 transition-colors"
              >
                Login
              </button>
            </>
          )}

          {/* Safe Exit */}
          <button
            onClick={handleSafeExit}
            className="border border-emerald-600/40 text-emerald-300 bg-emerald-950/60 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-emerald-900/60 transition-all"
          >
            🔒 Safe Exit
          </button>
        </div>

        {/* Mobile/Tablet Combined Brand + Hamburger */}
        <div className="flex lg:hidden items-center">
          <button
            className="flex items-center gap-2 p-1.5 rounded-xl bg-transparent hover:bg-white/[0.06] transition-colors border-0 outline-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            onDoubleClick={(e) => { e.preventDefault(); setMobileOpen(false); navigate('/'); }}
          >
            <div className="w-9 h-9 bg-[#051A1D] border border-white/[0.12] rounded-lg overflow-hidden flex-shrink-0">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg"
                alt="Morales"
                className="w-full h-full object-cover"
              />
            </div>
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white/70" />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="lg:hidden fixed inset-0 z-[9998] bg-[#020B0D] overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#051A1D] border border-white/[0.12] rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg"
                    alt="Morales"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-['Instrument_Serif'] text-sm tracking-widest text-white uppercase leading-tight">Morales</span>
                  <span className="text-[8px] tracking-[0.12em] text-[#D4AF37] uppercase font-light">Dental &amp; Aesthetic Travel</span>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 px-6 pt-6 pb-10 gap-8 overflow-y-auto">

              {/* Nav Links */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#D4AF37] uppercase font-bold mb-4">Navigation</span>
                {visibleNavLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`py-3.5 text-xl font-['Instrument_Serif'] border-b border-white/[0.05] transition-colors ${
                      location.pathname === link.path ? 'text-[#D4AF37]' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Partner link */}
                <Link
                  to="/register-role"
                  onClick={() => setMobileOpen(false)}
                  className="py-3.5 text-xl font-['Instrument_Serif'] border-b border-white/[0.05] text-white/80 hover:text-white transition-colors"
                >
                  {language === 'es' ? 'Únete Como Socio' : 'Join as Partner'}
                </Link>
              </div>

              {/* Portal Links */}
              {isAuthenticated && portalLinks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-white/30 uppercase font-bold mb-1">Secure Access</span>
                  {portalLinks.map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="mt-auto flex flex-col gap-4 pt-6 border-t border-white/[0.06]">
                {/* Language */}
                <div className="flex items-center gap-1.5 self-end bg-white/[0.03] border border-white/[0.08] p-1 rounded-lg">
                  {[{ code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }].map(({ code, label }) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`px-2.5 py-1 font-mono text-xs font-bold rounded transition-all ${
                        language === code ? 'bg-[#D4AF37] text-[#020B0D]' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {isAuthenticated ? (
                  <>
                    <Link
                      to={rolePrimaryAction.path}
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3.5 text-center text-sm font-semibold text-[#020B0D] bg-[#D4AF37] hover:bg-[#D4AF37]/90 rounded-xl tracking-wide"
                    >
                      {rolePrimaryAction.label}
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="w-full py-2 text-center text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/consultation"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3.5 text-center text-sm font-semibold text-[#020B0D] bg-[#D4AF37] hover:bg-[#D4AF37]/90 rounded-xl tracking-wide"
                    >
                      {language === 'es' ? 'Comenzar Viaje' : 'Begin Journey'}
                    </Link>
                    <div className="flex items-center justify-between px-1">
                      <button
                        onClick={() => { setMobileOpen(false); navigateToLogin(`${window.location.origin}/register-role`); }}
                        className="text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => { setMobileOpen(false); navigateToLogin(`${window.location.origin}/dashboard`); }}
                        className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                      >
                        Log In →
                      </button>
                    </div>
                  </>
                )}

                <button
                  onClick={() => { handleSafeExit(); setMobileOpen(false); }}
                  className="w-full border border-emerald-600/40 text-emerald-300 bg-emerald-950/50 rounded-full py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-emerald-900/50 transition-all"
                >
                  🔒 Safe Exit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}