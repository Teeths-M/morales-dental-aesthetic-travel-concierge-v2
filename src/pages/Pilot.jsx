import { Link, useSearchParams } from 'react-router-dom';
import McareMark from '@/components/landing/McareMark';
import JoinPilotForm from '@/components/landing/JoinPilotForm';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, RED, SANS, SERIF } from '@/components/landing/theme';

/**
 * Pilot — the real destination of every "Join the pilot" on the site.
 *
 * One field, one honest explanation of what the pilot is, and a working submit
 * against the joinPilot function. No invented success state: the confirmation
 * only appears once the server reports the record was actually stored.
 */
export default function Pilot() {
  // The QR code at the end of each ad links to /pilot?src=adNN, so the waiting
  // list can show which ad (or card, or post) brought each person in.
  const [params] = useSearchParams();
  const campaign = (params.get('src') || '').slice(0, 40);
  return (
    <div style={{ background: '#060B16', minHeight: '100vh', fontFamily: SANS }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: 'clamp(48px, 10vh, 96px) clamp(20px, 5vw, 32px) clamp(64px, 10vh, 112px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <McareMark size={40} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: WHITE }}>M-Care</p>
            <p style={{ margin: 0, fontSize: 11.5, letterSpacing: '0.08em', color: MUTED }}>
              M-CARE CARE CONCIERGE
            </p>
          </div>
        </div>

        <h1
          style={{
            margin: 'clamp(28px, 5vh, 44px) 0 0',
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

        <div style={{ marginTop: 34, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: 13.5, color: GOLD, textDecoration: 'none', fontWeight: 600 }}>
            ← Back to the story
          </Link>
          <Link to="/login" style={{ fontSize: 13.5, color: MUTED, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}