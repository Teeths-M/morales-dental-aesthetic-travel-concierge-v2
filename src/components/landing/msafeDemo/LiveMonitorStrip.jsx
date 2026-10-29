import React, { useEffect, useRef, useState } from 'react';
import { C, clockTime } from './theme';
import { LIVE_FEED, KIND_STYLE } from './liveFeed';

const TICK_MS = 5600;

/**
 * LiveMonitorStrip — the always-running half of the demo.
 *
 * While the scenarios play one situation at a time in the thread, this strip
 * keeps receiving updates on its own clock: a vital sign, a medication falling
 * due, a driver moving, weather turning. Two are kept on screen so the feed
 * reads as continuous rather than as a single alert.
 *
 * Paused off-screen (nobody needs a timer running below the fold) and rendered
 * statically under prefers-reduced-motion.
 */
export default function LiveMonitorStrip({ visible, reduced }) {
  const [events, setEvents] = useState(() => [{ ...LIVE_FEED[0], at: new Date() }]);
  const cursor = useRef(1);

  useEffect(() => {
    if (reduced) {
      setEvents(LIVE_FEED.slice(0, 2).map((item) => ({ ...item, at: new Date() })));
      return undefined;
    }
    if (!visible) return undefined;

    const tick = () => {
      const item = LIVE_FEED[cursor.current % LIVE_FEED.length];
      cursor.current += 1;
      setEvents((prev) => [...prev, { ...item, at: new Date() }].slice(-2));
    };

    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [visible, reduced]);

  return (
    <div
      style={{
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        background: '#FBF8F1',
        padding: '8px 18px 9px',
        minHeight: 74,
      }}
      aria-label="Live monitoring feed"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          className={reduced ? '' : 'msd-pulse'}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.greenInk,
            flexShrink: 0,
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: C.greenInk,
          }}
        >
          Live monitoring
        </p>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: C.faint, letterSpacing: '0.04em' }}>
          San José · post-op day 3
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {events.map((event, index) => {
          const style = KIND_STYLE[event.kind] || KIND_STYLE.care;
          return (
            <div
              key={`${event.text}-${index}`}
              className={reduced ? '' : 'msd-item'}
              style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}
            >
              <span
                style={{
                  flexShrink: 0,
                  background: style.bg,
                  color: style.ink,
                  borderRadius: 9999,
                  padding: '1px 7px',
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {event.label}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {event.text}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 9.5, color: C.faint, flexShrink: 0 }}>
                {clockTime(event.at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}