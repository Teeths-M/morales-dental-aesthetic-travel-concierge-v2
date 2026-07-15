import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import LanguageSwitcher from '@/components/ui-system/LanguageSwitcher';
import ModeToggle from '@/components/home/ModeToggle';
import { useTranslation, changeLanguage } from '@/i18n';
import { CALM } from '@/lib/brandTokens';

export default function Header() {
  const [isMobileOpen,   setIsMobileOpen]   = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangOpen,     setIsLangOpen]     = useState(false);
  const [currentLang,    setCurrentLang]    = useState('EN');
  const [scrolled,       setScrolled]       = useState(false);

  const { t }       = useTranslation();
  const location    = useLocation();
  const { user }    = useAuth();
  const isAdmin     = user?.role === 'admin' || user?.role === 'platform_admin';
  const userMenuRef        = useRef(null);
  const userMenuCloseTimer = useRef(null);

  const DARK_HERO_PATHS = ['/', '/discover', '/procedures', '/how-it-works'];
  const hasHero      = DARK_HERO_PATHS.includes(location.pathname);
  const isDemo       = location.pathname.startsWith('/demo');
  // Product Principle #5: calm/light chrome on patient decision & content
  // screens; dark dramatic chrome only on the landing hero and demo pages.
  const calm         = !hasHero && !isDemo;
  const isTransparent = hasHero && !scrolled;

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || 'M');

  const firstName = user?.full_name?.split(' ')[0] || null;
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? t('dashboard.good_morning') : hour < 17 ? t('dashboard.good_afternoon') : t('dashboard.good_evening');

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
    { name: t('nav.find_doctors'),  path: '/providers' },
    { name: t('nav.procedures'),    path: '/procedures' },
    { name: t('nav.how_it_works'),  path: '/how-it-works' },
    // Supply-side door — one quiet link, no dropdown; /signup forks
    // patient vs provider on a single clear landing.
    { name: t('nav.for_partners'), path: '/signup' },
    // Demo entry is for judges/internal use — never shown to patients unless
    // explicitly enabled at build time (VITE_SHOW_DEMO_NAV=true).
    ...(import.meta.env.VITE_SHOW_DEMO_NAV === 'true'
      ? [{ name: t('nav.live_demo'), path: '/demo', gold: true }]
      : []),
  ];

  const setLang = lang => {
    setCurrentLang(lang);
    setIsLangOpen(false);
    // Single mutation point — updates the engine, persists, and fires the
    // languageChange bridge for the signup/booking wizard pages.
    changeLanguage(lang.toLowerCase());
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await base44.auth.logout();
    window.location.reload();
  };

  const closeAll = () => {
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
          background:    calm ? 'rgba(255,255,255,0.94)' : isTransparent ? 'transparent' : 'rgba(10, 20, 25, 0.92)',
          borderBottom:  calm ? `1px solid ${CALM.border}` : isTransparent ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
          backdropFilter:         isTransparent ? 'none' : 'blur(20px)',
          WebkitBackdropFilter:   isTransparent ? 'none' : 'blur(20px)',
        }}
      >
        {/* ── LOGO ── */}
        <Link to="/" className="flex items-center gap-3.5 shrink-0 z-50 min-w-0">
          <div
            className="m-breathe"
            style={{
              width: '38px', height: '38px',
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img src="/morales-m-mark.png" alt="Morales" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          </div>
          <div className="flex flex-col gap-[3px] min-w-0 overflow-hidden">
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '17px',
                fontWeight: 400,
                color: calm ? CALM.text : '#FFFFFF',
                letterSpacing: '0.20em',
                lineHeight: 1,
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
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
              Medical Travel Safety
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
                color:      link.gold ? '#D4AF37' : location.pathname === link.path ? (calm ? CALM.text : '#FFFFFF') : (calm ? CALM.textSoft : '#8A9099'),
                fontWeight: link.gold || location.pathname === link.path ? 600 : 400,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (!link.gold && location.pathname !== link.path) e.target.style.color = calm ? CALM.text : '#FFFFFF'; }}
              onMouseLeave={e => { if (!link.gold && location.pathname !== link.path) e.target.style.color = calm ? CALM.textSoft : '#8A9099'; }}
            >
              {link.gold ? `▶ ${link.name}` : link.name}
            </Link>
          ))}

        </div>

        {/* ── DESKTOP: AUTH + LANGUAGE ── */}
        <div className="hidden lg:flex items-center gap-3">
          <ModeToggle />
          {user ? (
            /* Avatar dropdown */
            <>
            <span className="hidden xl:block text-[12px] font-medium" style={{ color: calm ? CALM.textFaint : 'rgba(255,255,255,0.32)', letterSpacing: '0.01em' }}>
                {timeGreeting}
              </span>
            <div
              className="relative"
              ref={userMenuRef}
              onMouseEnter={() => clearTimeout(userMenuCloseTimer.current)}
              onMouseLeave={() => { userMenuCloseTimer.current = setTimeout(() => setIsUserMenuOpen(false), 200); }}
            >
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
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                style={{ color: calm ? CALM.textSoft : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500 }}
                onMouseEnter={e => e.target.style.color = calm ? CALM.text : 'rgba(255,255,255,0.85)'}
                onMouseLeave={e => e.target.style.color = calm ? CALM.textSoft : 'rgba(255,255,255,0.5)'}
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/intake"
                className="m-cta-breathe inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  background: calm ? CALM.action : 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)',
                  color: calm ? '#fff' : '#060B16',
                }}
              >
                {t('nav.book_now')}
              </Link>
            </div>
          )}

          {/* Language selector — Babel Engine globe switcher */}
          <div className="ml-1">
            <LanguageSwitcher />
          </div>
        </div>

        {/* ── MOBILE: HAMBURGER ONLY ── */}
        <button
         onClick={() => setIsMobileOpen(p => !p)}
         className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white z-50 relative"
         style={calm ? { color: CALM.text } : undefined}
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

          {/* Mode toggle */}
          <div className="pb-5 border-b border-white/[0.06]">
            <ModeToggle />
          </div>

          {/* Primary nav — max 5 items, large tappable targets */}
          <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-6">
            <Link to="/" onClick={() => setIsMobileOpen(false)} className="flex items-center min-h-[52px] px-2 rounded-xl text-lg font-semibold" style={{ color: '#D4AF37' }}>Home</Link>
            {navLinks.map(link => (
              <Link key={link.path} to={link.path} onClick={() => setIsMobileOpen(false)} className="flex items-center min-h-[52px] px-2 rounded-xl text-lg font-medium text-white/80 hover:text-white hover:bg-white/5">{link.name}</Link>
            ))}
          </div>

          {/* Auth */}
          <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
            {user ? (
              <>
                {user.full_name && <p className="text-sm font-semibold text-white">{user.full_name}</p>}
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</p>
                <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="flex items-center min-h-[48px] px-2 rounded-xl text-base font-medium text-white/80 hover:bg-white/5">Dashboard</Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMobileOpen(false)} className="flex items-center min-h-[48px] px-2 rounded-xl text-base font-medium" style={{ color: '#D4AF37' }}>Admin Portal</Link>
                )}
                <button
                  onClick={async () => { await base44.auth.logout(); setIsMobileOpen(false); window.location.reload(); }}
                  className="flex items-center min-h-[48px] px-2 rounded-xl text-base font-medium text-left text-red-400/80 hover:bg-red-500/5"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/intake" onClick={() => setIsMobileOpen(false)}
                  className="w-full text-center min-h-[52px] flex items-center justify-center rounded-full text-base font-bold"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #E8C85C 100%)', color: '#060B16' }}
                >
                  {t('nav.book_now')}
                </Link>
                <Link
                  to="/dashboard" onClick={() => setIsMobileOpen(false)}
                  className="w-full text-center min-h-[48px] flex items-center justify-center rounded-full text-base font-medium"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {t('nav.sign_in')}
                </Link>
              </>
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