import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Globe, ChevronDown, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#D4AF37';

const getPublicNavLinks = (lang) => [
  { label: lang === 'es' ? 'Inicio' : lang === 'fr' ? 'Accueil' : 'Home', path: '/' },
  { label: lang === 'es' ? 'Tratamientos' : lang === 'fr' ? 'Traitements' : 'Treatments', path: '/procedures' },
  { label: lang === 'es' ? 'Cómo Funciona' : lang === 'fr' ? 'Comment Ça Marche' : 'How It Works', path: '/how-it-works' },
  { label: lang === 'es' ? 'Seguridad' : lang === 'fr' ? 'Sécurité' : 'Safety', path: '/safe-t' },
  { label: lang === 'es' ? 'Conserje' : lang === 'fr' ? 'Conciergerie' : 'Concierge', path: '/discover' },
  { label: lang === 'es' ? 'Nosotros' : lang === 'fr' ? 'À Propos' : 'About Us', path: '/about' },
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
  const [languageOpen, setLanguageOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin, logout } = useAuth();
  const langRef = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLanguageChange = (code) => {
    setLanguage(code);
    localStorage.setItem('appLanguage', code);
    setLanguageOpen(false);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: code } }));
  };

  const navLinks = getPublicNavLinks(language);
  const isAdmin = ['platform_admin', 'admin'].includes(user?.role);

  const rolePrimaryPath = {
    doctor: '/doctor-dashboard',
    travel_agency: '/travel-agency-dashboard',
    taxi_service: '/taxi-service-dashboard',
    companion: '/companion-dashboard',
  }[user?.role] || '/dashboard';

  return (
    <>
      <nav
        className="w-full fixed top-0 left-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(6,11,22,0.97)' : 'rgba(6,11,22,0.6)',
          backdropFilter: 'blur(20px)',
          borderBottom: scrolled ? `1px solid rgba(255,255,255,0.07)` : '1px solid transparent',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/15">
              <img
                src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg"
                alt="Morales"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[13px] tracking-[0.2em] text-white uppercase font-medium">MORALES</span>
              <span className="text-[8px] tracking-[0.12em] uppercase font-sans font-light mt-0.5" style={{ color: GOLD }}>
                Dental &amp; Aesthetic Travel Concierge
              </span>
            </div>
          </Link>

          {/* Desktop centered nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 rounded-lg whitespace-nowrap"
                style={{
                  color: location.pathname === link.path ? GOLD : 'rgba(255,255,255,0.55)',
                  borderBottom: location.pathname === link.path ? `1px solid ${GOLD}` : '1px solid transparent',
                }}
                onMouseEnter={e => { if (location.pathname !== link.path) e.currentTarget.style.color = 'rgba(255,255,255,0.88)'; }}
                onMouseLeave={e => { if (location.pathname !== link.path) e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">

            {/* Language selector */}
            <div className="relative" ref={langRef}
              onMouseEnter={() => setLanguageOpen(true)}
              onMouseLeave={() => setLanguageOpen(false)}
            >
              <button className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium uppercase text-[11px] tracking-wider">{language}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {languageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-40 rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: '#0D1322', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {allLanguages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="w-full text-left px-4 py-2.5 text-[13px] transition-colors border-b border-white/[0.05] last:border-b-0"
                        style={{ color: language === lang.code ? GOLD : 'rgba(255,255,255,0.65)' }}
                        onMouseEnter={e => { if (language !== lang.code) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Auth buttons */}
            {isAuthenticated ? (
              <>
                <Link
                  to={rolePrimaryPath}
                  className="px-4 py-2 text-[13px] font-medium text-white/60 border border-white/15 rounded-lg hover:border-white/30 hover:text-white transition-all"
                >
                  {isAdmin ? 'Admin' : 'Dashboard'}
                </Link>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors"
                >
                  Logout
                </button>
                <Link
                  to="/booking"
                  className="px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all hover:opacity-90"
                  style={{ background: GOLD, color: '#060B16' }}
                >
                  Book Consultation
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
                  className="px-4 py-2 text-[13px] font-medium text-white/60 border border-white/15 rounded-lg hover:border-white/30 hover:text-white transition-all"
                >
                  Client Login
                </button>
                <Link
                  to="/consultation"
                  className="px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all hover:opacity-90"
                  style={{ background: GOLD, color: '#060B16' }}
                >
                  Book Consultation
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: mobileOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            >
              {mobileOpen
                ? <X className="w-5 h-5 text-white" />
                : <Menu className="w-5 h-5 text-white/70" />
              }
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="lg:hidden fixed inset-0 z-[9998] flex flex-col"
            style={{ background: '#060B16' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <img src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg" alt="Morales" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-[13px] tracking-[0.2em] text-white uppercase">MORALES</span>
                  <span className="text-[8px] tracking-wider uppercase font-light" style={{ color: GOLD }}>Dental &amp; Aesthetic Travel Concierge</span>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="flex flex-col flex-1 px-6 pt-8 pb-10 gap-1 overflow-y-auto">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className="py-4 text-2xl font-display border-b border-white/[0.05] transition-colors"
                  style={{ color: location.pathname === link.path ? GOLD : 'rgba(255,255,255,0.75)' }}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-auto pt-8 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] p-1 rounded-lg self-start">
                  {[{ code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }].map(({ code, label }) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className="px-3 py-1.5 text-xs font-bold rounded transition-all"
                      style={{ background: language === code ? GOLD : 'transparent', color: language === code ? '#060B16' : 'rgba(255,255,255,0.4)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {isAuthenticated ? (
                  <>
                    <Link to={rolePrimaryPath} onClick={() => setMobileOpen(false)}
                      className="w-full py-4 text-center text-sm font-semibold rounded-xl"
                      style={{ background: GOLD, color: '#060B16' }}>
                      Dashboard
                    </Link>
                    <button onClick={() => { logout(); setMobileOpen(false); }}
                      className="text-sm text-center text-white/40 hover:text-white/60 transition-colors py-2">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/consultation" onClick={() => setMobileOpen(false)}
                      className="w-full py-4 text-center text-sm font-semibold rounded-xl"
                      style={{ background: GOLD, color: '#060B16' }}>
                      Book Consultation
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); navigateToLogin(`${window.location.origin}/dashboard`); }}
                      className="w-full py-3 text-center text-sm font-medium text-white/50 border border-white/10 rounded-xl hover:text-white/70 transition-colors">
                      Client Login
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}