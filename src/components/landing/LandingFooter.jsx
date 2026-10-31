import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '@/lib/constants';
import { MUTED, HAIRLINE, NAVY, SANS } from './theme';

/**
 * LandingFooter — the one slim footer for the landing page and the pilot page.
 *
 * Both pages ask for an email, so both need the privacy and terms links next to
 * the form. The full site Footer is deliberately not used here (its claims and
 * its MORALES-era layout belong to the app, not this cinematic surface).
 */
export default function LandingFooter() {
  const link = { color: MUTED, textDecoration: 'none' };
  return (
    <footer
      style={{
        background: NAVY,
        borderTop: `1px solid ${HAIRLINE}`,
        padding: '18px clamp(20px, 5vw, 40px) calc(18px + env(safe-area-inset-bottom, 0px))',
        fontFamily: SANS,
      }}
    >
      <nav
        aria-label="Legal and contact"
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 22px',
          fontSize: 13,
          color: MUTED,
        }}
      >
        <Link to="/privacy" style={link}>Privacy</Link>
        <Link to="/terms" style={link}>Terms</Link>
        <a href={`mailto:${CONTACT_EMAIL}`} style={link}>Contact</a>
        <span style={{ marginLeft: 'auto' }}>© 2026 M-Care</span>
      </nav>
    </footer>
  );
}
