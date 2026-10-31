import MSafeDemo from './msafeDemo/MSafeDemo';
import AmbientVideo from './AmbientVideo';
import { WHITE, BODY, MUTED, SANS, DEMO_VIDEO, DEMO_VIDEO_MOBILE, DEMO_POSTER } from './theme';

/**
 * McareTranscript — the product demonstration, and the only one on the page.
 *
 * The demonstration IS the product screen: the M-Safe workspace, cream and
 * gold, running one provider-verification session. A transcript in the page's
 * own dark chrome would have described the product; showing the workspace
 * shows it.
 */
export default function McareTranscript() {
  return (
    <section
      id="mcare-demo"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#060B16',
        padding: 'clamp(40px, 8vh, 88px) clamp(16px, 4vw, 32px)',
        fontFamily: SANS,
        scrollMarginTop: 16,
      }}
      aria-labelledby="mcare-transcript-heading"
    >
      {/* The demonstration film runs behind the section, dimmed to a panel so
          the workspace and the small print over it keep their contrast. */}
      <AmbientVideo src={DEMO_VIDEO} mobileSrc={DEMO_VIDEO_MOBILE} poster={DEMO_POSTER} variant="panel" objectPosition="center" />

      <div style={{ position: 'relative', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ maxWidth: 720 }}>
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
            The workspace below is running, not a still. It plays three situations the way M-Care handles
            them — a provider check, a missed check-in, a cancelled flight — one step at a time, in
            evidence rather than in badges.
          </p>
        </div>

        <div style={{ marginTop: 'clamp(28px, 5vh, 44px)' }}>
          <MSafeDemo />
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.7, color: MUTED, maxWidth: 760 }}>
          What you are watching is a scripted replay of the workspace: the tools, screens and flows it
          names are real parts of the system, while the clinicians and patients in it are illustrative,
          and nothing here was sent to a real doctor, driver, registry or emergency service. No patient
          information appears anywhere on this page.
        </p>
      </div>
    </section>
  );
}