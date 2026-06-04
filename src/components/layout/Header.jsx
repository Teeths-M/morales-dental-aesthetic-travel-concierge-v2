import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export default function Header() {
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('EN');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'platform_admin';

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Discover', path: '/discover' },
    { name: 'Procedures', path: '/procedures' },
    { name: 'How It Works', path: '/how-it-works' },
  ];

  const handleLanguageChange = (lang) => {
    setCurrentLang(lang);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang.toLowerCase() } }));
    localStorage.setItem('appLanguage', lang.toLowerCase());
  };

  return (
    <>
    <nav className="w-full min-h-[92px] border-b border-white/[0.06] bg-[#020B0D]/90 backdrop-blur-md fixed top-0 left-0 z-50 px-6 lg:px-12 flex items-center justify-between py-4">
      
      {/* 1. VERBATIM BRANDING IDENTITY */}
      <Link to="/" className="flex items-center space-x-4 group z-50">
        <div className="w-12 h-12 bg-[#051A1D] border border-white/[0.1] flex items-center justify-center rounded-lg shadow-inner">
          <span className="font-serif text-xl text-[#D4AF37] tracking-wider group-hover:scale-105 transition-transform">M</span>
        </div>
        <div className="flex flex-col py-1">
          <span className="font-serif text-base tracking-widest text-white uppercase font-medium max-w-[280px] leading-tight">
            Morales
          </span>
          <span className="text-[10px] tracking-[0.15em] text-[#D4AF37] uppercase font-sans mt-0.5 font-light">
            Dental & Aesthetic Travel Concierge
          </span>
        </div>
      </Link>

      {/* 2. PRODUCTION REACT ROUTER LINKS (Desktop) */}
      <div className="hidden lg:flex items-center space-x-8 text-sm font-medium text-white/70">
        <Link 
          to="/" 
          className={`transition-colors duration-200 ${location.pathname === '/' ? 'text-[#D4AF37] font-semibold' : 'hover:text-white'}`}
        >
          Home
        </Link>
        
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`transition-colors duration-200 ${location.pathname === link.path ? 'text-white font-semibold' : 'hover:text-white'}`}
          >
            {link.name}
          </Link>
        ))}

        <Link to="/visa-assist" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.6)]"></span>
          Visa Assist
        </Link>
      </div>

      {/* 3. CORE UTILITIES, PORTALS, & LANGUAGE SELECTOR */}
      <div className="hidden lg:flex items-center space-x-6">

        {/* Unified Portal Dropdown */}
        <div className="relative">
          <button 
            onClick={() => { setIsPortalOpen(!isPortalOpen); setIsLangOpen(false); }}
            className="text-sm font-medium text-white/80 hover:text-white flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
          >
            Portal Hub
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isPortalOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {isPortalOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#030E10] border border-white/[0.08] shadow-2xl p-2 flex flex-col space-y-0.5 backdrop-blur-2xl">
              <Link to="/doctor-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Doctor Portal</Link>
              <Link to="/travel-agency-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Travel Agency Portal</Link>
              <Link to="/taxi-service-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Chauffeur Portal</Link>
              <div className="h-[1px] bg-white/[0.08] my-1.5" />
              <Link to="/partner-signup" className="px-4 py-2.5 text-sm text-[#D4AF37] hover:bg-[#D4AF37]/[0.05] rounded-lg transition-colors font-medium">Join as Provider Partner</Link>
            </div>
          )}
        </div>

        {/* Dynamic Multi-Language Selector */}
        <div className="relative">
          <button 
            onClick={() => { setIsLangOpen(!isLangOpen); setIsPortalOpen(false); }}
            className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/[0.04] transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" /></svg>
            <span className="text-xs font-mono font-bold tracking-wider text-white/80">{currentLang}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-24 rounded-lg bg-[#030E10] border border-white/[0.08] p-1 flex flex-col space-y-0.5 shadow-xl">
              {['EN', 'ES', 'FR'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 py-1.5 text-xs font-mono rounded text-left transition-colors ${currentLang === lang ? 'text-[#D4AF37] bg-white/[0.05]' : 'text-white/60 hover:text-white hover:bg-white/[0.02]'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refined Luxury CTAs */}
        <div className="flex items-center space-x-4 pl-2 border-l border-white/[0.08]">
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="px-6 py-2.5 text-sm font-medium text-[#020B0D] bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] hover:opacity-95 rounded-full shadow-lg shadow-[#D4AF37]/5 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Dashboard
              </Link>
              <button
                onClick={() => base44.auth.logout()}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/register-role" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Register
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1a3a3a] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#1f4545] rounded-full transition-all duration-200"
                >
                  ⚙️ Admin
                </Link>
              )}
              <Link 
                to="/dashboard" 
                className="px-6 py-2.5 text-sm font-medium text-[#020B0D] bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] hover:opacity-95 rounded-full shadow-lg shadow-[#D4AF37]/5 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 4. MOBILE HAMBURGER TOGGLE */}
      <div className="flex lg:hidden items-center space-x-4">
        <Link to="/consultation" className="px-4 py-2 text-xs font-medium text-[#020B0D] bg-[#D4AF37] rounded-full">
          Begin
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white/80 hover:text-white z-50 relative bg-transparent"
          aria-label="Toggle Menu"
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span className={`h-[2px] w-full bg-current transform transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`h-[2px] w-full bg-current transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-[2px] w-full bg-current transform transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

    </nav>

      {/* Mobile Slide-Out Tray — outside <nav> so it's not trapped in its stacking context */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#020B0D] z-[9999] pt-28 px-8 flex flex-col space-y-6 lg:hidden overflow-y-auto">
          {/* Close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/60 hover:text-white"
            aria-label="Close Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="flex flex-col space-y-4 text-xl font-medium border-b border-white/[0.06] pb-6">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-[#D4AF37]">Home</Link>
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="text-white/80 hover:text-white">{link.name}</Link>
            ))}
            <Link to="/visa-assist" onClick={() => setIsMobileMenuOpen(false)} className="text-white/80 hover:text-white">Visa Assist</Link>
          </div>
          <div className="flex flex-col space-y-3 pt-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-semibold font-mono">Secure Access Portals</span>
            <Link to="/doctor-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-white/70">Doctor Portal</Link>
            <Link to="/travel-agency-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-white/70">Travel Agency Portal</Link>
            <Link to="/taxi-service-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-white/70">Chauffeur Portal</Link>
          </div>
          {isAdmin && (
            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 bg-[#1a3a3a] border border-[#D4AF37]/40 rounded-xl text-[#D4AF37] font-semibold text-sm">
              ⚙️ Admin Portal
            </Link>
          )}
          <div className="pt-6 flex flex-col gap-4 border-t border-white/[0.06]">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-white/80">Dashboard</Link>
                <button
                  onClick={async () => {
                    await base44.auth.logout();
                    setIsMobileMenuOpen(false);
                    window.location.reload();
                  }}
                  className="text-base font-medium text-white/70 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-white/80">Log In to Dashboard</Link>
            )}
            <div className="flex gap-2">
              {['EN', 'ES', 'FR'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setCurrentLang(lang);
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang.toLowerCase() } }));
                  }}
                  className={`px-2 py-1 font-mono text-xs rounded ${currentLang === lang ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/40'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};