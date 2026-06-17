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
    <nav className="w-full min-h-[88px] border-b border-white/[0.08] bg-[#0C1A1D] backdrop-blur-md fixed top-0 left-0 z-50 px-6 lg:px-10 flex items-center justify-between py-3">
      
      {/* 1. PREMIUM BRANDING IDENTITY */}
      <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-5 group z-50">
        <div className="w-14 h-14 bg-gradient-to-br from-[#B89750] to-[#D4AF37] flex items-center justify-center rounded-xl shadow-lg" style={{ boxShadow: '0 4px 20px rgba(184,151,80,0.3)' }}>
          <span className="font-serif text-2xl text-[#0C1A1D] font-bold">M</span>
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-[26px] text-white uppercase font-bold tracking-wide leading-none">
            MORALES
          </span>
          <span className="text-[11px] tracking-[0.25em] text-[#B89750] uppercase font-sans mt-1 font-medium">
            Dental & Aesthetic Travel Concierge
          </span>
        </div>
      </Link>

      {/* 2. PREMIUM NAVIGATION LINKS */}
      <div className="hidden lg:flex items-center gap-10 text-[14px] font-sans">
        <Link 
          to={!user ? "/" : user.role === 'admin' || user.role === 'platform_admin' ? "/admin" : "/dashboard"} 
          className="transition-all duration-200 font-semibold"
          style={{ color: location.pathname === '/' || location.pathname === '/admin' ? '#B89750' : '#A9A9A9' }}
        >
          Home
        </Link>
        
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="transition-all duration-200"
            style={{ color: location.pathname === link.path ? '#FFFFFF' : '#A9A9A9', fontWeight: location.pathname === link.path ? '600' : '400' }}
          >
            {link.name}
          </Link>
        ))}

        <Link to="/visa-assist" className="flex items-center gap-2 transition-all duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] inline-block" style={{ boxShadow: '0 0 10px rgba(0,229,255,0.6)' }}></span>
          <span style={{ color: '#A9A9A9', fontWeight: 400 }}>Visa Assist</span>
        </Link>

        <Link to="/passport-vault" className="flex items-center gap-2 transition-all duration-200">
          <svg className="w-4 h-4" fill="none" stroke="#A9A9A9" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span style={{ color: '#A9A9A9', fontWeight: 400 }}>My Vault</span>
        </Link>
        
        {/* Portal Hub Dropdown */}
        <div className="relative">
          <button 
            onClick={() => { setIsPortalOpen(!isPortalOpen); setIsLangOpen(false); }}
            className="flex items-center gap-1.5 transition-all duration-200"
          >
            <span style={{ color: '#A9A9A9', fontWeight: 400 }}>Portal Hub</span>
            <svg className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isPortalOpen ? 'rotate-180' : ''}`} fill="none" stroke="#A9A9A9" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {isPortalOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0C1A1D] border border-white/[0.1] shadow-2xl p-1.5 flex flex-col" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <Link to="/doctor-dashboard" className="px-3.5 py-2.5 text-[13px] rounded-lg transition-all" style={{ color: '#A9A9A9' }}>Doctor Portal</Link>
              <Link to="/travel-agency-dashboard" className="px-3.5 py-2.5 text-[13px] rounded-lg transition-all" style={{ color: '#A9A9A9' }}>Travel Agency Portal</Link>
              <Link to="/taxi-service-dashboard" className="px-3.5 py-2.5 text-[13px] rounded-lg transition-all" style={{ color: '#A9A9A9' }}>Chauffeur Portal</Link>
              <Link to="/companion-dashboard" className="px-3.5 py-2.5 text-[13px] rounded-lg transition-all" style={{ color: '#A9A9A9' }}>Companion Portal</Link>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <Link to="/partner-signup" className="px-3.5 py-2.5 text-[13px] rounded-lg transition-all font-semibold" style={{ color: '#B89750' }}>Join as Provider Partner</Link>
            </div>
          )}
        </div>
        
        {/* Language Selector */}
        <div className="relative">
          <button 
            onClick={() => { setIsLangOpen(!isLangOpen); setIsPortalOpen(false); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all"
          >
            <span className="text-[13px] font-sans font-semibold" style={{ color: '#A9A9A9' }}>EN</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-20 rounded-lg bg-[#0C1A1D] border border-white/[0.1] p-1 flex flex-col shadow-xl">
              {['EN', 'ES', 'FR'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 py-1.5 text-[12px] font-sans rounded text-left transition-all ${currentLang === lang ? 'font-semibold' : ''}`}
                  style={{ color: currentLang === lang ? '#B89750' : '#A9A9A9' }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. CORE UTILITIES, PORTALS, & LANGUAGE SELECTOR */}
      <div className="hidden lg:flex items-center space-x-5">

        {/* Unified Portal Dropdown */}
        <div className="relative">
          <button 
            onClick={() => { setIsPortalOpen(!isPortalOpen); setIsLangOpen(false); }}
            className="text-[14px] font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all"
            style={{ color: '#A9A9A9' }}
          >
            Portal Hub
            <svg className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isPortalOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {isPortalOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#0C1A1D] border border-white/[0.08] shadow-2xl p-2 flex flex-col space-y-0.5 backdrop-blur-2xl">
              <Link to="/doctor-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Doctor Portal</Link>
              <Link to="/travel-agency-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Travel Agency Portal</Link>
              <Link to="/taxi-service-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Chauffeur Portal</Link>
              <Link to="/companion-dashboard" className="px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">Companion Portal</Link>
              <div className="h-[1px] bg-white/[0.08] my-1.5" />
              <Link to="/partner-signup" className="px-4 py-2.5 text-sm text-[#B89750] hover:bg-[#B89750]/[0.05] rounded-lg transition-colors font-medium">Join as Provider Partner</Link>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button 
            onClick={() => { setIsLangOpen(!isLangOpen); setIsPortalOpen(false); }}
            className="px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            style={{ color: '#A9A9A9' }}
          >
            <span className="text-[14px] font-medium">{currentLang}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-20 rounded-lg bg-[#0C1A1D] border border-white/[0.08] p-1 flex flex-col space-y-0.5 shadow-xl">
              {['EN', 'ES', 'FR'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 py-1.5 text-xs font-medium rounded text-left transition-colors ${currentLang === lang ? 'text-[#B89750] bg-white/[0.05]' : 'text-[#A9A9A9] hover:text-white hover:bg-white/[0.02]'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Premium Action Buttons */}
        <div className="flex items-center gap-3 pl-4">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all hover:opacity-95"
                  style={{ background: '#1A4E4E', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(26,78,78,0.4)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.066 2.573c1.543.94 3.31.826 2.37 2.37a1.724 1.724 0 00-2.573 1.066c-1.756.426-1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 002.573-1.066c1.756-.426 1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-1.543-.94-3.31-.826-2.37-2.37a1.724 1.724 0 002.573-1.066c1.756-.426 1.756-2.924 0-3.35z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Admin
                </Link>
              )}
              
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, #F2D045 0%, #F9E58B 100%)', color: '#0C1A1D', boxShadow: '0 4px 20px rgba(242,208,69,0.35)' }}
              >
                Dashboard
              </Link>
              
              <button
                onClick={async () => {
                  await base44.auth.logout();
                  window.location.reload();
                }}
                className="text-[14px] font-medium transition-all hover:text-white"
                style={{ color: '#A9A9A9' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/register-role" className="text-[14px] font-medium transition-all hover:text-white" style={{ color: '#A9A9A9' }}>
                Register
              </Link>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, #F2D045 0%, #F9E58B 100%)', color: '#0C1A1D', boxShadow: '0 4px 20px rgba(242,208,69,0.35)' }}
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
            <Link to="/passport-vault" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              My Vault
            </Link>
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