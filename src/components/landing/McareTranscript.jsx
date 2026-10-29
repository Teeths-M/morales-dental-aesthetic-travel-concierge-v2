import TranscriptScenario from './TranscriptScenario';
import McareMark from './McareMark';
import { SCENARIOS, CLOSING, MCARE } from '@/lib/landingTranscript';
import { WHITE, BODY, MUTED, HAIRLINE, SANS } from './theme';

/**
 * McareTranscript — the product demonstration, and the only one on the page.
 *
 * One surface, one header, one continuous run of conversation with day dividers
 * between beats. There are deliberately no cards, no grids and no per-feature
 * panels: the argument is that this is a single agent carrying a single journey,
 * and the layout has to be the same shape as that claim.
 */
export default function McareTranscript() {
  return (
    <section
      style={{ background: '#060B16', padding: 'clamp(40px, 8vh, 88px) clamp(16px, 4vw, 32px)', fontFamily: SANS }}
      aria-labelledby="mcare-transcript-heading"
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#D4AF37',
          }}
        >
          One agent, start to finish
        </p>

        <h2
          id="mcare-transcript-heading"
          style={{
            margin: '14px 0 0',
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: WHITE,
          }}
        >
          A week of one journey, as M-Care actually handles it.
        </h2>

        <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.7, color: BODY, maxWidth: '58ch' }}>
          This is a demonstration transcript, not a live session. Each moment below says plainly whether
          the capability behind it is real and shipping, or staged for the illustration.
        </p>

        <div
          style={{
            marginTop: 'clamp(28px, 5vh, 44px)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.022)',
            overflow: 'hidden',
          }}
        >
          {/* Conversation header — establishes whose conversation this is. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '16px clamp(16px, 3vw, 24px)',
              borderBottom: `1px solid ${HAIRLINE}`,
              background: 'rgba(6,11,22,0.5)',
            }}
          >
            <McareMark size={30} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: WHITE }}>M-Care</p>
              <p style={{ margin: 0, fontSize: 11, color: MUTED, letterSpacing: '0.04em' }}>
                Morales care concierge
              </p>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: MUTED,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 4,
                padding: '3px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              Demonstration
            </span>
          </div>

          <div style={{ padding: 'clamp(20px, 4vw, 30px) clamp(16px, 3vw, 26px) clamp(26px, 4vw, 34px)' }}>
            {SCENARIOS.map((scenario) => (
              <TranscriptScenario key={scenario.id} scenario={scenario} />
            ))}

            {/* The closing line lands as the last thing M-Care says. */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 28 }}>
              <span style={{ paddingTop: 2 }}>
                <McareMark size={26} glow={false} />
              </span>
              <p
                style={{
                  margin: 0,
                  padding: '11px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'rgba(255,255,255,0.055)',
                  border: `1px solid ${HAIRLINE}`,
                  color: WHITE,
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: '82%',
                }}
              >
                {CLOSING}
              </p>
            </div>
          </div>
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.7, color: MUTED }}>
          No patient information appears anywhere on this page. Nothing in the transcript was sent to a
          real doctor, driver, registry or emergency service.
        </p>
      </div>
    </section>
  );
}