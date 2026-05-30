import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Menu, X, Globe, ChevronDown, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNavLinks = (language) => [
  { label: language === 'es' ? 'Inicio' : language === 'fr' ? 'Accueil' : 'Home', path: '/' },
  { label: language === 'es' ? 'Procedimientos' : language === 'fr' ? 'Procédures' : 'Procedures', path: '/procedures' },
  { label: language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works', path: '/how-it-works' },
  { label: language === 'es' ? 'Nuestros Expertos' : language === 'fr' ? 'Nos Experts' : 'Our Experts', path: '/providers' },
  { label: 'SAFE-T 4LIFE™', path: '/safe-t' },
  { label: language === 'es' ? '🌍 Asistencia de Visa' : language === 'fr' ? '🌍 Assistance Visa' : '🌍 Visa Assist', path: '/visa-assist' },
  { label: language === 'es' ? 'Acerca de Nosotros' : language === 'fr' ? 'À Propos de Nous' : 'About Us', path: '/about' },
  { label: language === 'es' ? 'Panel de Control' : language === 'fr' ? 'Tableau de Bord' : 'Dashboard', path: '/dashboard' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalHubOpen, setPortalHubOpen] = useState(false);
  const [partnerDropdownOpen, setPartnerDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  const [navLinks, setNavLinks] = useState(getNavLinks(language));
  const location = useLocation();
  const { user, isAuthenticated, navigateToLogin, logout } = useAuth();
  const portalHubTimeoutRef = useRef(null);
  const partnerTimeoutRef = useRef(null);
  const languageTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setNavLinks(getNavLinks(language));
  }, [language]);

  const handlePortalHubMouseLeave = () => {
    portalHubTimeoutRef.current = setTimeout(() => setPortalHubOpen(false), 1000);
  };

  const handlePortalHubMouseEnter = () => {
    if (portalHubTimeoutRef.current) clearTimeout(portalHubTimeoutRef.current);
    setPortalHubOpen(true);
  };

  const handlePartnerMouseLeave = () => {
    partnerTimeoutRef.current = setTimeout(() => setPartnerDropdownOpen(false), 1000);
  };

  const handlePartnerMouseEnter = () => {
    if (partnerTimeoutRef.current) clearTimeout(partnerTimeoutRef.current);
    setPartnerDropdownOpen(true);
  };

  const handleLanguageMouseLeave = () => {
    languageTimeoutRef.current = setTimeout(() => setLanguageDropdownOpen(false), 1000);
  };

  const handleLanguageMouseEnter = () => {
    if (languageTimeoutRef.current) clearTimeout(languageTimeoutRef.current);
  };

  const allLanguages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'pt', flag: '🇵🇹', name: 'Português' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  ];

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
    if (isSensitive) {
      navigate('/', { replace: true });
    } else if (window.history.length <= 1) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  const handleSafeExit = () => {
    navigate('/', { replace: true });
  };

  const isAdmin = ['platform_admin', 'admin'].includes(user?.role);
  const portalLinks = [
    ...(isAdmin ? [
      { label: language === 'es' ? 'Acceso al Portal' : language === 'fr' ? 'Accès au Portail' : 'Portal Access', path: '/portal-hub' },
      { label: language === 'es' ? 'Administración' : language === 'fr' ? 'Administration' : 'Admin Dashboard', path: '/portal-hub/admin' },
    ] : []),
    ...(['doctor'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Doctor' : language === 'fr' ? 'Tableau de Bord Docteur' : 'Doctor Dashboard', path: '/doctor-dashboard' },
    ] : []),
    ...(['travel_agency'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Agencia' : language === 'fr' ? 'Tableau Agence' : 'Travel Agency Dashboard', path: '/travel-agency-dashboard' },
    ] : []),
    ...(['taxi_service'].includes(user?.role) || isAdmin ? [
      { label: language === 'es' ? 'Panel de Taxi' : language === 'fr' ? 'Tableau Taxi' : 'Taxi Service Dashboard', path: '/taxi-service-dashboard' },
    ] : []),
  ];

  const clientOnlyPaths = ['/dashboard', '/safe-t', '/visa-assist'];
  const canUseClientPortal = ['client', 'user', 'platform_admin', 'admin'].includes(user?.role);
  const visibleNavLinks = navLinks.filter(link => {
    if (!clientOnlyPaths.includes(link.path)) return true;
    return isAuthenticated && canUseClientPortal;
  });
  const rolePrimaryAction = {
    doctor: { path: '/doctor-dashboard', label: language === 'es' ? 'Panel de Doctor' : language === 'fr' ? 'Tableau Docteur' : 'Doctor Dashboard' },
    travel_agency: { path: '/travel-agency-dashboard', label: language === 'es' ? 'Panel de Agencia' : language === 'fr' ? 'Tableau Agence' : 'Travel Agency Dashboard' },
    taxi_service: { path: '/taxi-service-dashboard', label: language === 'es' ? 'Panel de Taxi' : language === 'fr' ? 'Tableau Taxi' : 'Taxi Dashboard' },
  }[user?.role] || { path: '/booking', label: language === 'es' ? 'Reservar Consulta' : language === 'fr' ? 'Réserver une Consultation' : 'Book Consultation' };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img 
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg" 
              alt="Morales Logo" 
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-border/30 pl-3">
              <p className="font-['Instrument_Serif'] text-base leading-tight text-foreground tracking-wide">MORALES DENTAL & AESTHETIC TRAVEL CONCIERGE</p>
              <p className="text-[9px] tracking-[0.25em] text-accent uppercase font-semibold">SAFE-T4LIFE™</p>
            </div>
          </Link>

          {/* Context-Aware Back Button */}
          {!isHome && (
            <button
              onClick={handleBack}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/60 hover:bg-accent/5 transition-all duration-200"
              title="Go back"
            >
              <span className="text-accent font-bold">←</span>
              <span>Back</span>
            </button>
          )}

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1">
            {visibleNavLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  location.pathname === link.path
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Partner Dropdown */}
            <div 
              className="relative" 
              onMouseLeave={handlePartnerMouseLeave} 
              onMouseEnter={handlePartnerMouseEnter}
            >
              <button
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1"
              >
                {language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner'}
                <ChevronDown className={`w-4 h-4 transition-transform ${partnerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {partnerDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
                  >
                    <Link
                      to="/register-role"
                      onClick={() => setPartnerDropdownOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      {language === 'es' ? 'Elegir Rol' : language === 'fr' ? 'Choisir un Rôle' : 'Choose Role'}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Portal Hub Dropdown */}
            {isAuthenticated && portalLinks.length > 0 && (
              <div 
                className="relative" 
                onMouseLeave={handlePortalHubMouseLeave} 
                onMouseEnter={handlePortalHubMouseEnter}
              >
                <button
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1"
                >
                  <Stethoscope className="w-4 h-4" />
                  {language === 'es' ? 'Portal Hub' : language === 'fr' ? 'Portail Hub' : 'Portal Hub'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${portalHubOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {portalHubOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50"
                    >
                      {portalLinks.map((link, index) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setPortalHubOpen(false)}
                          className={`block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors ${index === 0 ? 'rounded-t-lg' : 'border-t border-border'} ${index === portalLinks.length - 1 ? 'rounded-b-lg' : ''}`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* SAFE EXIT Button */}
            <button
              onClick={handleSafeExit}
              className="border border-emerald-600/40 text-emerald-100 bg-emerald-950/80 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(15,58,32,0.1)] hover:bg-emerald-900 hover:border-emerald-500 hover:text-white hover:scale-105"
            >
              🔒 SAFE EXIT
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Language Dropdown */}
              <div 
                className="relative hidden sm:block" 
                onMouseLeave={handleLanguageMouseLeave} 
                onMouseEnter={() => {
                  handleLanguageMouseEnter();
                  setLanguageDropdownOpen(true);
                }}
              >
                <button
                  className="p-2 hover:bg-secondary rounded-md transition-colors"
                  title="Select Language"
                >
                  <Globe className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {languageDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg z-50"
                    >
                      {allLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            handleLanguageChange(lang.code);
                            setLanguageDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-border/50 last:border-b-0 ${
                            language === lang.code
                              ? 'bg-secondary text-foreground'
                              : 'text-foreground hover:bg-secondary/50'
                          }`}
                        >
                          {lang.flag} {lang.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            {isAuthenticated ? (
              <>
                <Link to={rolePrimaryAction.path}>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-5">
                    {rolePrimaryAction.label}
                  </Button>
                </Link>
                <Button variant="outline" className="hidden sm:inline-flex text-sm" onClick={() => logout()}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="hidden sm:inline-flex text-sm font-semibold px-5"
                  onClick={() => navigateToLogin(`${window.location.origin}/register-role`)}
                >
                  Register
                </Button>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-5" onClick={() => navigateToLogin(`${window.location.origin}/dashboard`)}>
                  Login
                </Button>
              </>
            )}
            <button
              className="xl:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden border-t border-border bg-card"
          >
            <nav className="px-4 py-4 space-y-1">
              {visibleNavLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                    location.pathname === link.path
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Portal Hub Dropdown */}
              {isAuthenticated && portalLinks.length > 0 && (
                <>
                  <button
                    onClick={() => setPortalHubOpen(!portalHubOpen)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      {language === 'es' ? 'Portal Hub' : language === 'fr' ? 'Portail Hub' : 'Portal Hub'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${portalHubOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {portalHubOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 pl-4"
                      >
                        {portalLinks.map(link => (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setMobileOpen(false)}
                            className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Mobile Partner Dropdown */}
              <button
                onClick={() => setPartnerDropdownOpen(!partnerDropdownOpen)}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 flex items-center justify-between"
              >
                {language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner'}
                <ChevronDown className={`w-4 h-4 transition-transform ${partnerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {partnerDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 pl-4"
                  >
                    <Link
                      to="/register-role"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {language === 'es' ? 'Elegir Rol' : language === 'fr' ? 'Choisir un Rôle' : 'Choose Role'}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile SAFE EXIT */}
              <button
                onClick={() => { handleSafeExit(); setMobileOpen(false); }}
                className="w-full border border-emerald-600/40 text-emerald-100 bg-emerald-950/80 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-emerald-900 hover:border-emerald-500 hover:text-white"
              >
                🔒 SAFE EXIT
              </button>

              <div className="pt-3 border-t border-border">
                {isAuthenticated ? (
                  <Button variant="outline" className="w-full" onClick={() => { logout(); setMobileOpen(false); }}>
                    Logout
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMobileOpen(false);
                        navigateToLogin(`${window.location.origin}/register-role`);
                      }}
                    >
                      Register
                    </Button>
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { navigateToLogin(`${window.location.origin}/dashboard`); setMobileOpen(false); }}>
                      Login
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}