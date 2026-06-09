import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Globe, ChevronDown, X, Menu, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#D4AF37';

const NAV_LINKS = [
  { label: 'Home',        path: '/' },
  { label: 'Treatments',  path: '/procedures' },
  { label: 'How It Works',path: '/how-it-works' },
  { label: 'Safety',      path: '/safe-t' },
  { label: 'Concierge',   path: '/discover' },
  { label: 'About Us',    path: '/about' },
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
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin, logout } = useAuth();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLang = (code) => {
    setLanguage(code);
    localStorage.setItem('appLanguage', code);
    setLangOpen(false);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: code } }));
  };

  const isAdmin = ['platform_admin', 'admin'].includes(user?.role);
  const dashPath = {
    doctor: '/doctor-dashboard',
    travel_agency: '/travel-agency-dashboard',
    taxi_service: '/taxi-service-dashboard',
    companion: '/companion-dashboard',
  }[user?.role] || '/dashboard';

  const currentLang = allLanguages.find(l => l.code === language);

  return (
    <>
      <nav
        className="w-full fixed top-0 left-0 z-50 transition-all duration-300"
        style={{
          height: '68px',
          background: scrolled ? 'rgba(6,11,22,0.96)' : 'rgba(6,11,22,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-full flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center font-display text-lg font-bold shrink-0"
              style={{ background: GOLD, color: '#060B16' }}
            >
              M
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[13px] tracking-[0.18em] text-white uppercase font-medium">MORALES</span>
              <span className="text-[7.5px] tracking-[0.14em] uppercase font-sans font-light mt-0.5" style={{ color: GOLD }}>
                Dental &amp; Aesthetic Travel Concierge
              </span>
            </div>
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 rounded-sm"
                  style={{ color: active ? GOLD : 'rgba(255,255,255,0.62)' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.62)'; }}
                >
                  {link.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full"
                      style={{ background: GOLD }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">

            {/* Language */}
            <div
              className="relative"
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button
                className="flex items-center gap-1.5 px-3 py-2 text-[12.5px] text-white/45 hover:text-white/70 transition-colors rounded-lg hover:bg-white/[0.04]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wide">{language.toUpperCase()}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1.5 w-40 rounded-xl overflow-hidden z-50 shadow-2xl"
                    style={{ background: '#0D1322', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {allLanguages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLang(lang.code)}
                        className="w-full text-left px-4 py-2.5 text-[12.5px] border-b border-white/[0.05] last:border-b-0 transition-colors"
                        style={{ color: language === lang.code ? GOLD : 'rgba(255,255,255,0.62)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Client Login */}
            {isAuthenticated ? (
              <>
                <Link
                  to={dashPath}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/35 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  {isAdmin ? 'Admin' : 'Dashboard'}
                </Link>
                <button
                  onClick={() => logout()}
                  className="px-3 py-2 text-[12px] text-white/38 hover:text-white/60 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/35 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Client Login
              </button>
            )}

            {/* Book Consultation CTA */}
            <Link
              to="/consultation"
              className="px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-all hover:opacity-90 ml-1"
              style={{ background: GOLD, color: '#060B16' }}
            >
              Book Consultation
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: mobileOpen ? 'rgba(255,255,255,0.07)' : 'transparent' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen
              ? <X className="w-5 h-5 text-white" />
              : <Menu className="w-5 h-5 text-white/70" />
            }
          </button>
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] h-[68px]">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-base font-bold"
                  style={{ background: GOLD, color: '#060B16' }}>
                  M
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-[12px] tracking-[0.18em] text-white uppercase">MORALES</span>
                  <span className="text-[7px] tracking-widest uppercase font-light" style={{ color: GOLD }}>Dental &amp; Aesthetic Travel Concierge</span>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Nav links */}
            <div className="flex flex-col flex-1 px-6 pt-8 pb-10 overflow-y-auto">
              <div className="flex flex-col gap-0.5 mb-auto">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="py-4 text-2xl font-display border-b border-white/[0.05] transition-colors"
                    style={{ color: location.pathname === link.path ? GOLD : 'rgba(255,255,255,0.72)' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="pt-8 flex flex-col gap-3 mt-8 border-t border-white/[0.06]">
                {/* Language toggle */}
                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-1 rounded-lg self-start">
                  {['en', 'es', 'fr'].map(code => (
                    <button
                      key={code}
                      onClick={() => handleLang(code)}
                      className="px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-all"
                      style={{ background: language === code ? GOLD : 'transparent', color: language === code ? '#060B16' : 'rgba(255,255,255,0.4)' }}
                    >
                      {code}
                    </button>
                  ))}
                </div>

                <Link
                  to="/consultation"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3.5 text-center text-sm font-semibold rounded-xl"
                  style={{ background: GOLD, color: '#060B16' }}
                >
                  Book Consultation
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      to={dashPath}
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 text-center text-sm font-medium border border-white/15 rounded-xl text-white/60 hover:text-white transition-colors"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="text-sm text-center text-white/35 hover:text-white/60 transition-colors py-2"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileOpen(false); navigateToLogin(`${window.location.origin}/dashboard`); }}
                    className="w-full py-3 text-center text-sm font-medium border border-white/15 rounded-xl text-white/60 hover:text-white transition-colors"
                  >
                    Client Login
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}