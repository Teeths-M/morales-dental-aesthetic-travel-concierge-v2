import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Menu, X, Globe, ChevronDown, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNavLinks = (language) => [
  { label: language === 'es' ? 'Procedimientos' : language === 'fr' ? 'Procédures' : 'Procedures', path: '/procedures' },
  { label: language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works', path: '/how-it-works' },
  { label: language === 'es' ? 'Nuestros Expertos' : language === 'fr' ? 'Nos Experts' : 'Our Experts', path: '/providers' },
  { label: language === 'es' ? 'Acerca de Nosotros' : language === 'fr' ? 'À Propos de Nous' : 'About Us', path: '/about' },
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

  const [clientPortalOpen, setClientPortalOpen] = useState(false);
  const clientPortalTimeoutRef = useRef(null);

  const handleClientPortalMouseLeave = () => {
    clientPortalTimeoutRef.current = setTimeout(() => setClientPortalOpen(false), 1000);
  };

  const handleClientPortalMouseEnter = () => {
    if (clientPortalTimeoutRef.current) clearTimeout(clientPortalTimeoutRef.current);
    setClientPortalOpen(true);
  };

  const clientPortalLinks = [
    { label: language === 'es' ? 'Panel de Control' : language === 'fr' ? 'Tableau de Bord' : 'Dashboard', path: '/dashboard' },
    ...(isAdmin ? [
      { label: language === 'es' ? 'Acceso al Portal' : language === 'fr' ? 'Accès au Portail' : 'Portal Access', path: '/portal-hub' },
      { label: language === 'es' ? 'Administración' : language === 'fr' ? 'Administration' : 'Admin Dashboard', path: '/portal-hub/admin' },
    ] : []),
    { label: language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner', path: '/register-role' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
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

          {/* Desktop Nav - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-6">
            {visibleNavLinks.map(link => {
              if (link.path === '/safe-t' || link.path === '/visa-assist') return null;
              return (
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
              );
            })}

            {/* How It Works Submenu */}
            <div className="relative group">
              <button className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1">
                {language === 'es' ? 'Cómo Funciona' : language === 'fr' ? 'Comment Ça Marche' : 'How It Works'}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/safe-t"
                  className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-t-lg transition-colors"
                >
                  SAFE-T 4LIFE™
                </Link>
                <Link
                  to="/visa-assist"
                  className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-b-lg transition-colors"
                >
                  🌍 Visa Assist
                </Link>
              </div>
            </div>

            {/* Client Portal Dropdown */}
            <div 
              className="relative" 
              onMouseLeave={handleClientPortalMouseLeave} 
              onMouseEnter={handleClientPortalMouseEnter}
            >
              <button
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1"
              >
                {language === 'es' ? 'Portal de Cliente' : language === 'fr' ? 'Portail Client' : 'Client Portal'}
                <ChevronDown className={`w-4 h-4 transition-transform ${clientPortalOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {clientPortalOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50"
                  >
                    {clientPortalLinks.map((link, index) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setClientPortalOpen(false)}
                        className={`block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors ${index === 0 ? 'rounded-t-lg' : 'border-t border-border'} ${index === clientPortalLinks.length - 1 ? 'rounded-b-lg' : ''}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Actions - Mobile hamburger visible only on mobile */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Language Dropdown - Hidden on mobile */}
              <div 
                className="hidden lg:block relative" 
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
            <Link to="/booking" className="hidden lg:block">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-6">
                {language === 'es' ? 'Reservar Consulta' : language === 'fr' ? 'Réserver une Consultation' : 'Book Consultation'}
              </Button>
            </Link>
            {/* Mobile hamburger button - visible only on mobile */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Full-screen slide-out panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-0 right-0 z-50 lg:hidden bg-emerald-950/95 backdrop-blur-xl"
          >
            <div className="flex flex-col h-full">
              {/* Mobile header with close button */}
              <div className="flex items-center justify-between p-6 border-b border-emerald-800/30">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg" 
                    alt="Morales Logo" 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-emerald-100 font-serif text-sm">MORALES</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-emerald-300 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile navigation links - stacked vertically */}
              <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                {visibleNavLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="block text-xl font-medium text-emerald-100 hover:text-white transition-colors py-2"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Mobile How It Works Submenu */}
                <div className="pt-4 border-t border-emerald-800/30">
                  <Link
                    to="/safe-t"
                    onClick={() => setMobileOpen(false)}
                    className="block text-xl font-medium text-emerald-100 hover:text-white transition-colors py-3"
                  >
                    SAFE-T 4LIFE™
                  </Link>
                  <Link
                    to="/visa-assist"
                    onClick={() => setMobileOpen(false)}
                    className="block text-xl font-medium text-emerald-100 hover:text-white transition-colors py-3"
                  >
                    🌍 Visa Assist
                  </Link>
                </div>

                {/* Mobile Client Portal Links */}
                <div className="pt-4 border-t border-emerald-800/30">
                  <p className="text-sm font-bold tracking-widest uppercase text-emerald-400 mb-4">Client Portal</p>
                  {clientPortalLinks.map(link => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className="block text-lg font-medium text-emerald-200 hover:text-white transition-colors py-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Mobile Partner Links */}
                <div className="pt-4 border-t border-emerald-800/30">
                  <Link
                    to="/register-role"
                    onClick={() => setMobileOpen(false)}
                    className="block text-xl font-medium text-emerald-100 hover:text-white transition-colors py-3"
                  >
                    {language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner'}
                  </Link>
                </div>

                {/* Mobile SAFE EXIT */}
                <button
                  onClick={() => { handleSafeExit(); setMobileOpen(false); }}
                  className="w-full border border-emerald-500/50 text-emerald-100 bg-emerald-900/50 rounded-full px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:bg-emerald-800 hover:border-emerald-400 hover:text-white mt-8"
                >
                  🔒 SAFE EXIT
                </button>

                {/* Mobile Auth Actions */}
                <div className="pt-6 border-t border-emerald-800/30 mt-auto">
                  {isAuthenticated ? (
                    <Button 
                      variant="outline" 
                      className="w-full border-emerald-600/50 text-emerald-100 hover:bg-emerald-800/50" 
                      onClick={() => { logout(); setMobileOpen(false); }}
                    >
                      Logout
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-emerald-600/50 text-emerald-100 hover:bg-emerald-800/50"
                        onClick={() => {
                          setMobileOpen(false);
                          navigateToLogin(`${window.location.origin}/register-role`);
                        }}
                      >
                        Register
                      </Button>
                      <Button 
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" 
                        onClick={() => { 
                          navigateToLogin(`${window.location.origin}/dashboard`); 
                          setMobileOpen(false); 
                        }}
                      >
                        Login
                      </Button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}