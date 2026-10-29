import { useRef } from 'react';
import { Link } from 'react-router-dom';
import CorridorScene from './CorridorScene';
import { WHITE, BODY, RED, GOLD, SANS, MUTED } from './theme';

/**
 * LandingHero — the question, and the answer.
 *
 * Everything else that used to live in the first screen has been removed: no
 * stage labels, no second CTA, no oversized numerals, no feature strip. One
 * question, one answer, one line of support, one action.
 */
export default function LandingHero() {
  const sectionRef = useRef(null);

  return (
    <section
      ref={sectionRef}
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
      <CorridorScene sectionRef={sectionRef} />

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
              letterSpacing: '-0.025em',
              color: WHITE,
              // Sized so the longest line never wraps awkwardly at 360px.
              fontSize: 'clamp(1.75rem, 4.1vw, 3.35rem)',
              lineHeight: 1.1,
              textWrap: 'balance',
            }}
          >
            If something happened to you abroad tonight, who would know?
          </h1>

          <p
            style={{
              margin: 'clamp(8px, 1.2vh, 16px) 0 0',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: RED,
              // Deliberately a touch larger than the question.
              fontSize: 'clamp(2.3rem, 5.4vw, 4.5rem)',
              lineHeight: 1.02,
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
        </div>
      </div>
    </section>
  );
}