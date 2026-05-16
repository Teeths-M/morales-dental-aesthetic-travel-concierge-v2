import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en';
  });
  const [navLinks, setNavLinks] = useState(getNavLinks(language));
  const location = useLocation();

  useEffect(() => {
    setNavLinks(getNavLinks(language));
  }, [language]);

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
    // Dispatch event so other components can listen for language changes
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: langCode } }));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="https://media.base44.com/images/public/6a01c1305c540b75f24dd373/f1286e492_logo.jpg" 
              alt="Morales Logo" 
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-border/30 pl-3">
              <p className="font-display text-lg leading-tight text-foreground">MORALES</p>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Dental & Aesthetic</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
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
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md flex items-center gap-1"
              >
                {language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner'}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
                  >
                    <Link
                      to="/doctor-signup"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary rounded-t-lg transition-colors"
                    >
                      {language === 'es' ? 'Registro de Doctor' : language === 'fr' ? 'Enregistrement Docteur' : 'Doctor Sign-up'}
                    </Link>
                    <Link
                      to="/partner-signup"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary border-t border-border transition-colors"
                    >
                      {language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyage' : 'Travel Agency'}
                    </Link>
                    <Link
                      to="/partner-signup/taxi-service"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary border-t border-border transition-colors"
                    >
                      {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
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
            <Link to="/booking">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold px-5">
                {language === 'es' ? 'Reservar Consulta' : language === 'fr' ? 'Réserver une Consultation' : 'Book Consultation'}
              </Button>
            </Link>
            <button
              className="lg:hidden p-2"
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
            className="lg:hidden border-t border-border bg-card"
          >
            <nav className="px-4 py-4 space-y-1">
              {navLinks.map(link => (
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

              {/* Mobile Partner Dropdown */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 flex items-center justify-between"
              >
                {language === 'es' ? 'Únete Como Socio' : language === 'fr' ? 'Rejoindre en tant que Partenaire' : 'Join as Partner'}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 pl-4"
                  >
                    <Link
                      to="/doctor-signup"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {language === 'es' ? 'Registro de Doctor' : language === 'fr' ? 'Enregistrement Docteur' : 'Doctor Sign-up'}
                    </Link>
                    <Link
                      to="/partner-signup"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {language === 'es' ? 'Agencia de Viajes' : language === 'fr' ? 'Agence de Voyage' : 'Travel Agency'}
                    </Link>
                    <Link
                      to="/partner-signup/taxi-service"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                      {language === 'es' ? 'Servicio de Taxi' : language === 'fr' ? 'Service de Taxi' : 'Taxi Service'}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}