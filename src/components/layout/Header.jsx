import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

export default function Header() {
  const [isPortalOpen,   setIsPortalOpen]   = useState(false);
  const [isMobileOpen,   setIsMobileOpen]   = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangOpen,     setIsLangOpen]     = useState(false);
  const [currentLang,    setCurrentLang]    = useState('EN');
  const [scrolled,       setScrolled]       = useState(false);

  const location    = useLocation();
  const { user }    = useAuth();
  const isAdmin     = user?.role === 'admin' || user?.role === 'platform_admin';
  const userMenuRef = useRef(null);

  const DARK_HERO_PATHS = ['/', '/discover', '/procedures', '/how-it-works'];
  const hasHero      = DARK_HERO_PATHS.includes(location.pathname);
  const isTransparent = hasHero && !scrolled;

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || 'M');

  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!hasHero) { setScrolled(true); return; }
    setScrolled(window.scrollY > 40);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasHero]);

  // Close user menu on outside click — only attach when menu is open
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isUserMenuOpen]);

  const navLinks = [
    { name: 'Discover',      path: '/discover' },
    { name: 'Procedures',    path: '/procedures' },
    { name: 'How It Works',  path: '/how-it-works' },
  ];

  const setLang = lang => {
    setCurrentLang(lang);
    setIsLangOpen(false);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang.toLowerCase() } }));
    localStorage.setItem('appLanguage', lang.toLowerCase());
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await base44.auth.logout();
    window.location.reload();
  };

  const closeAll = () => {
    setIsPortalOpen(false);
    setIsLangOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <nav
        className="w-full fixed top-0 left-0 z-50 px-4 sm:px-6 lg:px-10 flex items-center justify-between transition-all duration-300"
        style={{
          minHeight: scrolled ? '56px' : '72px',
          paddingTop:    scrolled ? '10px' : '14px',
          paddingBottom: scrolled ? '10px' : '14px',
          background:    isTransparent ? 'transparent' : 'rgba(10, 20, 25, 0.92)',
          borderBottom:  isTransparent ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
          backdropFilter:         isTransparent ? 'none' : 'blur(20px)',
          WebkitBackdropFilter:   isTransparent ? 'none' : 'blur(20px)',
        }}
      >
        {/* ── LOGO ── */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3.5 shrink-0 z-50">
          <div
            style={{
              width: '38px', height: '38px',
              background: '#D4AF37',
              color: '#060B16',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '20px',
              fontWeight: 900,
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(212,175,55,0.45), 0 2px 10px rgba(212,175,55,0.25)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div className="flex flex-col gap-[3px]">
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '17px',
                fontWeight: 400,
                color: '#FFFFFF',
                letterSpacing: '0.32em',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              MORALES
            </span>
            <span
              className="hidden sm:block"
              style={{
                fontSize: '9px',
                letterSpacing: '0.26em',
                color: '#D4AF37',
                textTransform: 'uppercase',
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              Dental &amp; Aesthetic Travel Concierge
            </span>
          </div>
        </Link>

        {/* ── DESKTOP NAV LINKS ── */}
        <div className="hidden lg:flex items-center gap-8 text-[14px]">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                color:      location.pathname === link.path ? '#FFFFFF' : '#8A9099',
                fontWeight: location.pathname === link.path ? 600 : 400,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (location.pathname !== link.path) e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { if (location.pathname !== link.path) e.target.style.color = '#8A9099'; }}
            >
              {link.name}
            </Link>
          ))}

          {/* Portal Hub */}
          <div className="relative">
            <button
              onClick={() => { setIsPortalOpen(p => !p); setIsLangOpen(false); setIsUserMenuOpen(false); }}
              className="flex items-center gap-1.5 transition-colors duration-200"
              style={{ color: '#8A9099', fontSize: '14px' }}
            >
              Portal Hub
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isPortalOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPortalOpen && (
              <div
                className="absolute top-full left-0 mt-3 w-60 rounded-2xl border border-white/[0.07] shadow-2xl p-2 flex flex-col gap-0.5"
                style={{ background: 'rgba(10,20,25,0.96)', backdropFilter: 'blur(24px)' }}
              >
                {[
                  { to: '/visa-assist',             label: 'Visa Assist',            dot: '#00E5FF' },
                  { to: '/passport-vault',           label: 'My Vault',               dot: null },
                ].map(({ to, label, dot }) => (
                  <Link key={to} to={to} onClick={() => setIsPortalOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-white/[0.05]"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {dot
                      ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot, boxShadow: `0 0 8px ${dot}99` }} />
                      : <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    }
                    {label}
                  </Link>
                ))}
                <div className="h-px bg-white/[0.07] my-1" />
                {[
                  { to: '/doctor-dashboard',         label: 'Doctor Portal' },
                  { to: '/travel-agency-dashboard',  label: 'Travel Agency Portal' },
                  { to: '/taxi-service-dashboard',   label: 'Chauffeur Portal' },
                  { to: '/companion-dashboard',      label: 'Companion Portal' },
                ].map(({ to, label }) => (
                  <Link key={to} to={to} onClick={() => setIsPortalOpen(false)}
                    className="px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-white/[0.05]"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {label}
                  </Link>
                ))}
                <div className="h-px bg-white/[0.07] my-1" />
                <Link to="/partner-signup" onClick={() => setIsPortalOpen(false)}
                  className="px-4 py-2.5 text-sm rounded-xl font-medium transition-colors hover:bg-[#D4AF37]/[0.06]"
                  style={{ color: '#D4AF37' }}
                >
                  Join as Provider Partner
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── DESKTOP: AUTH + LANGUAGE ── */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            /* Avatar dropdown */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => { setIsUserMenuOpen(p => !p); closeAll(); setIsUserMenuOpen(p => !p); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-200 hover:ring-2 hover:ring-offset-1 hover:ring-[#D4AF37]/50"
                style={{ background: '#D4AF37', color: '#060B16', ringOffsetColor: 'transparent' }}
                aria-label="Account menu"
              >
                {userInitials}
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-3 w-52 rounded-2xl border border-white/[0.07] shadow-2xl p-2"
                  style={{ background: 'rgba(10,20,25,0.96)', backdropFilter: 'blur(24px)' }}
                >
                  <div className="px-4 py-3 border-b border-white/[0.06] mb-1">
                    {user.full_name && (
                      <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                    )}
                    <p className="text-xs text-white/40 truncate mt-0.5">{user.email}</p>
                  </div>
                  <Link
                    to="/dashboard" onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-white/[0.05]"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin" onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-[#D4AF37]/[0.05]"
                      style={{ color: '#D4AF37' }}
                    >
                      <Settings className="w-4 h-4" /> Admin Portal
                    </Link>
                  )}
                  <div className="h-px bg-white/[0.06] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-red-500/[0.06] text-left"
                    style={{ color: 'rgba(239,68,68,0.75)' }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Single "Get Started" CTA */
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)',
                color: '#060B16',
                boxShadow: '0 4px 20px rgba(212,175,55,0.28)',
              }}
            >
              Get Started
            </Link>
          )}

          {/* Language selector — isolated far right */}
          <div className="relative ml-1">
            <button
              onClick={() => { setIsLangOpen(p => !p); setIsPortalOpen(false); setIsUserMenuOpen(false); }}
              className="px-3 py-2 rounded-lg text-[13px] font-medium flex items-center gap-1 transition-colors"
              style={{ color: '#8A9099' }}
            >
              {currentLang}
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isLangOpen && (
              <div
                className="absolute right-0 mt-2 w-16 rounded-xl border border-white/[0.07] p-1 flex flex-col gap-0.5 shadow-xl"
                style={{ background: 'rgba(10,20,25,0.96)', backdropFilter: 'blur(16px)' }}
              >
                {['EN', 'ES', 'FR'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLang(lang)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                    style={{ color: currentLang === lang ? '#D4AF37' : 'rgba(169,169,169,0.8)' }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE: HAMBURGER ONLY ── */}
        <button
          onClick={() => setIsMobileOpen(p => !p)}
          className="lg:hidden p-2 text-white/80 hover:text-white z-50 relative"
          aria-label="Toggle Menu"
        >
          <div className="w-6 h-[18px] flex flex-col justify-between">
            <span className={`h-[2px] w-full bg-current origin-center transition-transform duration-300 ${isMobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`h-[2px] w-full bg-current transition-opacity duration-200 ${isMobileOpen ? 'opacity-0' : ''}`} />
            <span className={`h-[2px] w-full bg-current origin-center transition-transform duration-300 ${isMobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </nav>

      {/* ── MOBILE TRAY ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[9999] pt-24 px-8 flex flex-col gap-6 lg:hidden overflow-y-auto"
          style={{ background: '#030A0C' }}
        >
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Primary nav */}
          <div className="flex flex-col gap-4 text-xl font-medium border-b border-white/[0.06] pb-6">
            <Link to="/" onClick={() => setIsMobileOpen(false)} style={{ color: '#D4AF37', fontWeight: 600 }}>Home</Link>
            {navLinks.map(link => (
              <Link key={link.path} to={link.path} onClick={() => setIsMobileOpen(false)} className="text-white/80 hover:text-white">{link.name}</Link>
            ))}
            <Link to="/visa-assist" onClick={() => setIsMobileOpen(false)} className="text-white/80 hover:text-white">Visa Assist</Link>
            <Link to="/passport-vault" onClick={() => setIsMobileOpen(false)} className="text-white/80 hover:text-white">My Vault</Link>
            <Link to="/offline-guide" onClick={() => setIsMobileOpen(false)} className="text-red-400 font-semibold">🆘 Offline &amp; SOS Guide</Link>
          </div>

          {/* Portals */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Partner Portals</span>
            {[
              { to: '/doctor-dashboard',        label: 'Doctor Portal' },
              { to: '/travel-agency-dashboard', label: 'Travel Agency Portal' },
              { to: '/taxi-service-dashboard',  label: 'Chauffeur Portal' },
              { to: '/companion-dashboard',     label: 'Companion Portal' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setIsMobileOpen(false)} className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</Link>
            ))}
          </div>

          {/* Auth */}
          <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
            {user ? (
              <>
                {user.full_name && <p className="text-sm font-semibold text-white">{user.full_name}</p>}
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</p>
                <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="text-base font-medium text-white/80">Dashboard</Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMobileOpen(false)} className="text-base font-medium" style={{ color: '#D4AF37' }}>Admin Portal</Link>
                )}
                <button
                  onClick={async () => { await base44.auth.logout(); setIsMobileOpen(false); window.location.reload(); }}
                  className="text-base font-medium text-left text-red-400/80"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/dashboard" onClick={() => setIsMobileOpen(false)}
                className="w-full text-center py-3.5 rounded-full text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)', color: '#060B16' }}
              >
                Get Started
              </Link>
            )}
            <div className="flex gap-2 pt-1">
              {['EN', 'ES', 'FR'].map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLang(lang); setIsMobileOpen(false); }}
                  className="px-3 py-1.5 text-[11px] font-mono rounded-lg transition-colors"
                  style={{
                    background: currentLang === lang ? '#D4AF37' : 'transparent',
                    color:      currentLang === lang ? '#060B16' : 'rgba(255,255,255,0.35)',
                    fontWeight: currentLang === lang ? 700 : 400,
                  }}
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
}
