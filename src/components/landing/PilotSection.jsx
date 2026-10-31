import JoinPilotForm from './JoinPilotForm';
import AmbientVideo from './AmbientVideo';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, RED, SANS, SERIF, PILOT_VIDEO, PILOT_VIDEO_MOBILE, PILOT_POSTER } from './theme';

/**
 * PilotSection — the closing action, and the honest version of what the pilot is.
 *
 * Short on purpose. After a week of conversation, the visitor knows what M-Care
 * does; this section only has to make the next step feel small and to say
 * plainly what will and will not arrive in their inbox.
 */
export default function PilotSection() {
  return (
    <section
      id="pilot"
      aria-labelledby="pilot-heading"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#060B16',
        borderTop: `1px solid ${HAIRLINE}`,
        padding: 'clamp(52px, 10vh, 104px) clamp(20px, 5vw, 40px)',
        fontFamily: SANS,
      }}
    >
      {/* The pilot film sits behind the whole section, dimmed to a panel so the
          form and the small print keep their contrast. */}
      <AmbientVideo src={PILOT_VIDEO} mobileSrc={PILOT_VIDEO_MOBILE} poster={PILOT_POSTER} variant="panel" objectPosition="center 45%" />

      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
          Invitation only
        </p>

        <h2
          id="pilot-heading"
          style={{
            margin: '14px 0 0',
            fontFamily: SERIF,
            fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            color: WHITE,
          }}
        >
          Join the pilot
        </h2>

        <p style={{ margin: '16px 0 0', fontSize: 15.5, lineHeight: 1.75, color: BODY, maxWidth: '56ch' }}>
          We take a small number of travellers at a time — few enough that a person, not a queue, is
          watching each journey. Leave your email and we'll write when the next places open.
        </p>

        <div style={{ marginTop: 28, maxWidth: 520 }}>
          <JoinPilotForm source="landing_hero" />
        </div>

        <dl
          style={{
            margin: '28px 0 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 18,
            maxWidth: 560,
          }}
        >
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
              What you'll get
            </dt>
            <dd style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.65, color: BODY }}>
              One email when a place opens, and a conversation with the team before anything is booked.
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
              What you won't
            </dt>
            <dd style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.65, color: BODY }}>
              No newsletter, no drip sequence, no clinical advice by email. Ask to be removed and you are
              removed.
            </dd>
          </div>
        </dl>

        <p style={{ margin: '24px 0 0', fontSize: 12, lineHeight: 1.7, color: MUTED }}>
          We store your email address and nothing else. We do not ask for your name, your diagnosis or
          your travel dates on this page.
        </p>

        <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.7, color: RED }}>
          M-Care is a coordination service, not an emergency service. In an emergency, call local
          emergency services first.
        </p>
      </div>
    </section>
  );
}