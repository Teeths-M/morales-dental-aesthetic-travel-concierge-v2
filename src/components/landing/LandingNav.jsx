import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GOLD, WHITE, MUTED, HAIRLINE, SERIF } from './theme';
import McareMark from './McareMark';

/**
 * LandingNav — the entire navigation for this page: who we are, how to sign in,
 * and the one action we want. Nothing else competes with the headline.
 *
 * Fixed rather than in flow so it can stay quiet over the corridor as the page
 * moves; it only acquires a backdrop once there is text underneath it.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        inset: '0 0 auto 0',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: `calc(14px + env(safe-area-inset-top, 0px)) clamp(18px, 4vw, 44px) 14px`,
        background: scrolled ? 'rgba(6,11,22,0.78)' : 'transparent',
        borderBottom: `1px solid ${scrolled ? HAIRLINE : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <Link
        to="/"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}
        aria-label="M-Care — home"
      >
        <McareMark size={26} glow={false} />
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: WHITE,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          M-Care
        </span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2.4vw, 22px)' }}>
        <Link
          to="/login"
          style={{ fontSize: 13, color: MUTED, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Sign in
        </Link>
        <Link
          to="/pilot"
          style={{
            display: 'inline-block',
            padding: '9px 16px',
            borderRadius: 8,
            background: GOLD,
            color: '#060B16',
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Join the pilot
        </Link>
      </nav>
    </header>
  );
}