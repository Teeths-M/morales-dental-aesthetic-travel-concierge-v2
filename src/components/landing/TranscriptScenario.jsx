import { useEffect, useRef, useState } from 'react';
import McareMark from './McareMark';
import { MCARE, YOU, OUTCOME, KIND_LABEL } from '@/lib/landingTranscript';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, RED, SANS } from './theme';

const TONE = {
  critical: RED,
  caution: GOLD,
  neutral: 'rgba(255,255,255,0.45)',
};

function Timestamp({ at }) {
  if (!at) return null;
  return (
    <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: '0.06em' }}>{at}</span>
  );
}

function McareBubble({ text, at }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ paddingTop: 2 }}>
        <McareMark size={26} glow={false} />
      </span>
      <div style={{ minWidth: 0, maxWidth: '82%' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.055)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '14px 14px 14px 4px',
            padding: '11px 14px',
            color: WHITE,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {text}
        </div>
        <div style={{ marginTop: 5, paddingLeft: 2 }}>
          <Timestamp at={at} />
        </div>
      </div>
    </div>
  );
}

function YouBubble({ text, at }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ minWidth: 0, maxWidth: '78%' }}>
        <div
          style={{
            background: 'rgba(212,175,55,0.10)',
            border: `1px solid rgba(212,175,55,0.22)`,
            borderRadius: '14px 14px 4px 14px',
            padding: '11px 14px',
            color: WHITE,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {text}
        </div>
        <div style={{ marginTop: 5, textAlign: 'right', paddingRight: 2 }}>
          <Timestamp at={at} />
        </div>
      </div>
    </div>
  );
}

function OutcomeBlock({ tone, title, text }) {
  const accent = TONE[tone] || TONE.neutral;
  return (
    <div
      style={{
        borderLeft: `2px solid ${accent}`,
        background: 'rgba(255,255,255,0.025)',
        borderRadius: '0 10px 10px 0',
        padding: '12px 15px',
      }}
      role="note"
    >
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: accent, letterSpacing: '0.01em' }}>
        {title}
      </p>
      <p style={{ margin: '5px 0 0', fontSize: 14, lineHeight: 1.6, color: BODY }}>{text}</p>
    </div>
  );
}

function Message({ message }) {
  if (message.from === OUTCOME) {
    return <OutcomeBlock tone={message.tone} title={message.title} text={message.text} />;
  }
  if (message.from === YOU) return <YouBubble text={message.text} at={message.at} />;
  return <McareBubble text={message.text} at={message.at} />;
}

/**
 * TranscriptScenario — one beat of the conversation, revealed when it comes into
 * view.
 *
 * The reveal is a one-way IntersectionObserver: once a scenario has played it
 * stays played, so scrolling back up does not re-animate anything. With
 * reduced motion requested there is no observer at all and every message is
 * simply present — the transcript remains fully readable, which is the point.
 */
export default function TranscriptScenario({ scenario }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      setShown(true);
      return undefined;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {/* Day divider — the only thing separating beats, so the whole run still
          reads as one conversation rather than five demos. */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '30px 0 22px' }}>
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: MUTED,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 999,
            padding: '5px 12px',
            whiteSpace: 'nowrap',
          }}
        >
          {scenario.day}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {scenario.messages.map((message, index) => (
          <div
            key={`${scenario.id}-${index}`}
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              transitionDelay: `${Math.min(index * 90, 540)}ms`,
            }}
          >
            <Message message={message} />
          </div>
        ))}
      </div>

      {/* The honesty caption. Always visible, never tucked into a tooltip. */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: `1px solid ${HAIRLINE}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 10px',
          alignItems: 'baseline',
          opacity: shown ? 1 : 0,
          transition: 'opacity 0.6s ease',
          transitionDelay: '340ms',
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, color: WHITE, letterSpacing: '0.02em' }}>
          {scenario.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: scenario.kind === 'live' ? GOLD : MUTED,
            border: `1px solid ${scenario.kind === 'live' ? 'rgba(212,175,55,0.4)' : HAIRLINE}`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          {KIND_LABEL[scenario.kind]}
        </span>
        <p style={{ margin: 0, flex: '1 1 260px', fontSize: 11.5, lineHeight: 1.65, color: MUTED, fontFamily: SANS }}>
          {scenario.footnote}
        </p>
      </div>
    </div>
  );
}