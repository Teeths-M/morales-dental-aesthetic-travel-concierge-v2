import { useEffect, useRef, useState } from 'react';

/**
 * Walkthrough — the designed response to a missed check-in, played step by step.
 *
 * Two rules govern this component and both are deliberate:
 *
 * 1. Nothing plays until someone presses Play. The page must not appear to be
 *    doing anything on its own, because it is not — this is a designed
 *    sequence, not a live session, and the note above the player says so.
 * 2. Anything not yet built carries IN DEVELOPMENT next to its timestamp, in
 *    plain legible grey rather than something faded to the point of being
 *    missed. The honesty is the point.
 *
 * There is no input of any kind here: nothing that invites a visitor to type,
 * no typing indicator, no placeholder for a chat.
 */

const STEPS = [
  {
    time: '21:40',
    label: 'M-care to the patient',
    body: 'Evening. Checking in. How are you feeling after today?',
  },
  {
    time: '21:50',
    label: 'M-care to the patient',
    body: 'Second check-in. If you are resting, send anything at all.',
  },
  {
    time: '22:05',
    label: 'M-care to the patient',
    body: 'Third check-in missed. Calling you now.',
    escalation: true,
    development: true,
  },
  {
    time: '22:06',
    label: 'M-care to the doctor',
    body: 'Patient in room 412 is not answering after three check-ins. Can you attend, or send someone you trust?',
    escalation: true,
    development: true,
  },
  {
    time: '22:07',
    label: 'M-care to the driver',
    body: 'Collect from the hotel, room 412. Accept within 90 seconds.',
    escalation: true,
  },
  {
    time: '22:09',
    label: 'Driver',
    body: 'Accepted. Twelve minutes away.',
  },
  {
    time: '22:14',
    label: 'Driver',
    body: 'Arrived. With the patient. Conscious, dehydrated, needs fluids.',
  },
];

const CLOSING = 'Thirty four minutes, start to finish. Every step recorded with a time. Part two.';

const TOTAL = STEPS.length + 1; // the closing card is the last thing revealed
const BEAT_MS = 2000;

export default function Walkthrough() {
  const [revealed, setRevealed] = useState(0);
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

  const shown = reduced ? TOTAL : revealed;
  const finished = shown >= TOTAL;

  // One step at a time, two seconds apart, pausing any time.
  useEffect(() => {
    if (!playing || reduced) return undefined;
    if (revealed >= TOTAL) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setRevealed((n) => Math.min(n + 1, TOTAL));
    }, BEAT_MS);
    return () => clearTimeout(timer);
  }, [playing, revealed, reduced]);

  // Keep the newest bubble in view inside the frame.
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [shown, reduced]);

  const play = () => {
    if (revealed >= TOTAL) return;
    if (revealed === 0) setRevealed(1);
    setPlaying(true);
  };

  const restart = () => {
    setPlaying(false);
    setRevealed(0);
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
              className="mp-ghost"
              onClick={() => (playing ? setPlaying(false) : play())}
              disabled={reduced || finished}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="mp-ghost"
              onClick={restart}
              disabled={reduced || shown === 0}
            >
              Restart
            </button>
          </div>
        </div>

        {/* ── Right: the frame ── */}
        <div>
          <div className="mp-phone">
            <div className="mp-phone-notch" aria-hidden="true" />

            <div
              ref={threadRef}
              className="mp-thread"
              aria-live="polite"
              aria-atomic="false"
            >
              <ol className="space-y-5">
                {STEPS.slice(0, Math.min(shown, STEPS.length)).map((step) => (
                  <li key={step.time} className="mp-enter">
                    <div className="mp-stamp">
                      <span className="mp-mono mp-stamp-time">{step.time}</span>
                      <span>{step.label}</span>
                      {step.development && <span className="mp-dev">IN DEVELOPMENT</span>}
                    </div>
                    <p className={`mp-bubble ${step.escalation ? 'mp-bubble--escalation' : ''}`}>
                      {step.body}
                    </p>
                  </li>
                ))}

                {shown > STEPS.length && (
                  <li className="mp-enter">
                    <p className="mp-close-card">{CLOSING}</p>
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

        <ol className="mt-6 space-y-4">
          {STEPS.map((step) => (
            <li key={`t-${step.time}`}>
              <div className="mp-stamp">
                <span className="mp-mono mp-stamp-time">{step.time}</span>
                <span>{step.label}</span>
                {step.development && <span className="mp-dev">IN DEVELOPMENT</span>}
              </div>
              <p className="mp-body">{step.body}</p>
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