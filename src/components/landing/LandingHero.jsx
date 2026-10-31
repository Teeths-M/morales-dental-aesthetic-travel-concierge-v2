import { Link } from 'react-router-dom';
import AmbientVideo from './AmbientVideo';
import { WHITE, BODY, RED, GOLD, SANS, MUTED, HERO_VIDEO, HERO_VIDEO_MOBILE, CORRIDOR_EMPTY } from './theme';

/**
 * LandingHero — the question, and the answer.
 *
 * The first screen is now a film that starts itself the moment the page loads:
 * a visitor lands, and something is already happening behind the question.
 * Everything else that used to live here has been removed — no stage labels, no
 * second CTA, no oversized numerals, no feature strip. One question, one
 * answer, one line of support, one action.
 */
export default function LandingHero() {
  return (
    <section
      className="landing-hero"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        background: '#060B16',
        fontFamily: SANS,
      }}
    >
      <AmbientVideo src={HERO_VIDEO} mobileSrc={HERO_VIDEO_MOBILE} poster={CORRIDOR_EMPTY} variant="hero" />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'clamp(96px, 16vh, 160px) clamp(20px, 5vw, 56px) clamp(56px, 9vh, 96px)',
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: SANS,
              fontWeight: 600,
              letterSpacing: '-0.032em',
              color: WHITE,
              // Two lines, by design — the question lands on the first and
              // leaves a breath for the answer. Sized so neither line wraps
              // into a third at 360px.
              fontSize: 'clamp(1.9rem, 4.4vw, 3.75rem)',
              lineHeight: 1.04,
              textWrap: 'balance',
              textShadow: '0 2px 34px rgba(4,7,14,0.65)',
            }}
          >
            If something happened to you abroad tonight, who would know?
          </h1>

          <p
            style={{
              margin: 'clamp(6px, 1vh, 12px) 0 0',
              fontWeight: 700,
              letterSpacing: '-0.038em',
              color: RED,
              // Deliberately larger than the question: this is the line people
              // remember, so it has to out-weigh the fear that sets it up.
              fontSize: 'clamp(2.6rem, 6.2vw, 5.2rem)',
              lineHeight: 0.98,
              textShadow: '0 2px 40px rgba(4,7,14,0.6)',
            }}
          >
            Someone would.
          </p>

          <p
            style={{
              margin: 'clamp(20px, 3vh, 32px) 0 0',
              maxWidth: '46ch',
              color: BODY,
              fontSize: 'clamp(1rem, 1.35vw, 1.125rem)',
              lineHeight: 1.65,
            }}
          >
            M-Care verifies the doctor, holds the trip together, and stays on the call after the money
            has moved.
          </p>

          <div style={{ marginTop: 'clamp(24px, 4vh, 40px)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Link
              to="/pilot"
              style={{
                display: 'inline-block',
                padding: '16px 30px',
                borderRadius: 10,
                background: GOLD,
                color: '#060B16',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.01em',
                textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(212,175,55,0.22)',
              }}
            >
              Join the pilot
            </Link>
            <span style={{ fontSize: 12.5, color: MUTED, letterSpacing: '0.01em' }}>
              Invitation only · limited places
            </span>
          </div>

          {/* The hook stops them; this is the hand-off to the proof. */}
          <a
            href="#mcare-demo"
            style={{
              marginTop: 'clamp(30px, 5vh, 52px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              color: MUTED,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 1,
                height: 34,
                background: `linear-gradient(to bottom, rgba(212,175,55,0), ${GOLD})`,
              }}
            />
            Watch it work
          </a>
        </div>
      </div>
    </section>
  );
}