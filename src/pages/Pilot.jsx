import { Link, useSearchParams } from 'react-router-dom';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import JoinPilotForm from '@/components/landing/JoinPilotForm';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, RED, SANS, SERIF } from '@/components/landing/theme';

/**
 * Pilot — the real destination of every "Join the pilot" on the site.
 *
 * One field, one honest explanation of what the pilot is, and a working submit
 * against the joinPilot function. No invented success state: the confirmation
 * only appears once the server reports the record was actually stored.
 *
 * Same header and footer as the landing page (AppLayout hides the app's own
 * Header and Footer on this route), so the visitor who taps "Join the pilot"
 * arrives somewhere that looks like where they just were.
 */
export default function Pilot() {
  // The QR code at the end of each ad links to /pilot?src=adNN, so the waiting
  // list can show which ad (or card, or post) brought each person in.
  const [params] = useSearchParams();
  const campaign = (params.get('src') || '').slice(0, 40);
  return (
    <div style={{ background: '#060B16', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: SANS }}>
      <LandingNav hideJoin />
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          // Clears the fixed LandingNav (about 66px plus the phone's top inset).
          padding:
            'calc(76px + env(safe-area-inset-top, 0px) + clamp(24px, 6vh, 64px)) clamp(20px, 5vw, 32px) clamp(64px, 10vh, 112px)',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
          Invitation only
        </p>

        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: SERIF,
            fontSize: 'clamp(1.9rem, 5vw, 2.8rem)',
            fontWeight: 600,
            lineHeight: 1.14,
            letterSpacing: '-0.015em',
            color: WHITE,
          }}
        >
          Join the pilot
        </h1>

        <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.75, color: BODY, maxWidth: '54ch' }}>
          Tell me where to reach you. That's the whole form — I'll write when the next places open, and
          we'll talk properly before anything is booked.
        </p>

        <div style={{ marginTop: 30, maxWidth: 480 }}>
          <JoinPilotForm source="pilot_page" campaign={campaign} autoFocus />
        </div>

        <div
          style={{
            marginTop: 36,
            paddingTop: 24,
            borderTop: `1px solid ${HAIRLINE}`,
            display: 'grid',
            gap: 16,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>
              What happens next
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.7, color: BODY }}>
              A person from the M-Care team replies. You'll be asked what you're travelling for and when,
              so the pilot place can be matched to a real journey rather than a queue position.
            </p>
          </div>

          <div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: RED }}>
              M-Care coordinates care; it does not provide it. It is not an emergency service — in an
              emergency, call local emergency services first.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 34 }}>
          <Link to="/" style={{ fontSize: 13.5, color: GOLD, textDecoration: 'none', fontWeight: 600 }}>
            ← Back to the story
          </Link>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}