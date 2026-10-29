import { useEffect, useRef, useState } from 'react';
import BotAvatar from '@/components/mcare-pilot/BotAvatar';

/**
 * Walkthrough — the designed response to a missed check-in, played step by step.
 *
 * Three rules govern this component and all three are deliberate:
 *
 * 1. Nothing plays until someone presses Play. The page must not appear to be
 *    doing anything on its own, because it is not — this is a designed
 *    sequence, not a live session, and the note above the player says so.
 * 2. Anything not yet built carries IN DEVELOPMENT next to its timestamp, in
 *    plain legible grey rather than something faded to the point of being
 *    missed. The honesty is the point.
 * 3. There is no input of any kind here: nothing that invites a visitor to
 *    type, no placeholder for a chat, no free-text field anywhere.
 *
 * Who is speaking is carried by the avatar, not by a label. Messages from
 * M-care sit beside it; the driver's replies sit in the same column without it.
 */

const STEPS = [
  {
    time: '21:40',
    from: 'bot',
    body: 'Evening. Checking in. How are you feeling after today?',
  },
  {
    time: '21:50',
    from: 'bot',
    body: 'Second check-in. No reply needed, just tap once so I know you\'re alright.',
  },
  {
    time: '22:05',
    from: 'bot',
    body: 'Third check-in missed. Calling you now.',
    escalation: true,
    development: true,
  },
  {
    time: '22:06',
    from: 'bot',
    body: 'Patient in room 412 is not answering after three check-ins. Can you attend, or send someone you trust?',
    escalation: true,
    development: true,
  },
  {
    time: '22:07',
    from: 'bot',
    body: 'Collect from the hotel, room 412. Accept within 90 seconds.',
  },
  {
    time: '22:09',
    from: 'driver',
    body: 'Accepted. Twelve minutes away.',
  },
  {
    time: '22:14',
    from: 'driver',
    body: 'Arrived. With the patient. Conscious, dehydrated, needs fluids.',
  },
];

const CLOSING = 'Thirty four minutes, start to finish. Every step recorded with a time. Part two.';

const TOTAL = STEPS.length + 1; // the closing card is the last thing revealed
const TYPING_MS = 950;
const BEAT_MS = 2000;

export default function Walkthrough() {
  const [index, setIndex] = useState(0);
  const [typing, setTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const threadRef = useRef(null);

  // Reduced motion is a promise, not a preference: show the finished thread
  // and never animate it into place.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    setReduced(mq.matches);
    const onChange = (event) => setReduced(event.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const shown = reduced ? TOTAL : index;
  const finished = shown >= TOTAL;

  // The play loop: the bot types, then speaks; anything else just arrives.
  useEffect(() => {
    if (!playing || reduced) return undefined;

    if (index >= TOTAL) {
      setPlaying(false);
      return undefined;
    }

    if (typing) {
      const timer = setTimeout(() => {
        setTyping(false);
        setIndex((n) => n + 1);
      }, TYPING_MS);
      return () => clearTimeout(timer);
    }

    if (STEPS[index]?.from === 'bot') {
      const timer = setTimeout(() => setTyping(true), TYPING_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setIndex((n) => n + 1), BEAT_MS);
    return () => clearTimeout(timer);
  }, [playing, index, typing, reduced]);

  // Keep the newest message in view inside the frame.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [shown, typing, reduced]);

  const play = () => {
    if (index >= TOTAL) return;
    setPlaying(true);
  };

  const restart = () => {
    setPlaying(false);
    setTyping(false);
    setIndex(0);
    threadRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div>
      <div className="grid gap-14 md:grid-cols-[1fr_372px] md:gap-20 lg:gap-28">
        {/* ── Left: what this is, and the controls ── */}
        <div>
          <h2 className="mp-h2-lg max-w-[17ch]">
            See what happens when a check-in is missed.
          </h2>

          <p className="mp-fine mt-6 max-w-[42ch]">
            This is a walkthrough of the designed response, not a live session. Anything marked
            in development is not built yet.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="mp-play"
              onClick={() => (playing ? setPlaying(false) : play())}
              disabled={reduced || finished}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="mp-ghost"
              onClick={restart}
              disabled={reduced || (shown === 0 && !typing)}
            >
              Restart
            </button>
          </div>
        </div>

        {/* ── Right: a bright screen in a dark room ── */}
        <div>
          <div className="mp-phone">
            <div className="mp-chat-head">
              <BotAvatar />
              <div>
                <div className="mp-chat-name">M-care</div>
                <div className="mp-chat-status">on shift</div>
              </div>
            </div>

            <div ref={threadRef} className="mp-thread" aria-live="polite" aria-atomic="false">
              <ol>
                {STEPS.slice(0, Math.min(shown, STEPS.length)).map((step) => (
                  <li key={step.time} className="mp-row mp-enter">
                    {step.from === 'bot' ? <BotAvatar /> : <div className="mp-row-gutter" />}

                    <div className="mp-row-body">
                      <div className="mp-stamp">
                        <span className="mp-mono mp-stamp-time">{step.time}</span>
                        {step.development && <span className="mp-dev">IN DEVELOPMENT</span>}
                      </div>
                      <p className={`mp-bubble ${step.escalation ? 'mp-bubble--escalation' : ''}`}>
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}

                {typing && (
                  <li className="mp-row">
                    <BotAvatar />
                    <div className="mp-row-body">
                      <div
                        className={`mp-typing ${playing ? '' : 'mp-typing--paused'}`}
                        aria-hidden="true"
                      >
                        <span className="mp-dot" />
                        <span className="mp-dot" />
                        <span className="mp-dot" />
                      </div>
                      <span className="sr-only">M-care is typing</span>
                    </div>
                  </li>
                )}

                {shown > STEPS.length && (
                  <li className="mp-row mp-enter">
                    <div className="mp-row-gutter" />
                    <div className="mp-row-body">
                      <p className="mp-close-card">{CLOSING}</p>
                    </div>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transcript: the whole sequence as text, for anyone who cannot play it ── */}
      <details className="mp-transcript mt-14 max-w-[720px]">
        <summary className="mp-fine">Full transcript</summary>

        <ol className="mt-6 space-y-5">
          {STEPS.map((step) => (
            <li key={`t-${step.time}`}>
              <p className="mp-transcript-stamp">
                <span className="mp-mono">{step.time}</span>
                {' · '}
                {step.from === 'bot' ? 'M-care' : 'Driver'}
                {step.development && ' · IN DEVELOPMENT'}
              </p>
              <p className="mp-body mt-1">{step.body}</p>
            </li>
          ))}
          <li>
            <p className="mp-body">{CLOSING}</p>
          </li>
        </ol>
      </details>
    </div>
  );
}