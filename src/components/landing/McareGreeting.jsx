import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import McareMark from './McareMark';
import JoinPilotForm from './JoinPilotForm';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, SANS } from './theme';

const SEEN_KEY = 'morales_pilot_greeting_seen';

/**
 * McareGreeting — M-Care says hello when the page opens, and asks for one thing.
 *
 * It appears in the lower-left rather than as a centred modal on purpose: the
 * first screen belongs to the question, and a dialog over it would bury the one
 * line the whole page exists to deliver. This pops and greets without ever
 * getting between a visitor and the headline.
 *
 * Shown once per session — on a page that also has a "Join the pilot" button in
 * three other places, reappearing would read as nagging rather than greeting.
 */
export default function McareGreeting() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      seen = false; // private mode: greet, but never persist
    }
    if (seen) return undefined;

    // On a phone the first screen belongs to the headline and the button, so
    // M-Care waits until the visitor actually starts reading instead of landing
    // on top of the action they are about to tap. On a desktop there is room to
    // say hello straight away.
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const onScroll = () => {
        if (window.scrollY > 120) {
          setOpen(true);
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* private mode — dismissal simply isn't remembered */
    }
  };

  if (!open || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="mcare-greeting-title"
      style={{
        position: 'fixed',
        // Anchored right: the hero's headline and CTA occupy the left of the
        // first screen, and the M-Care launcher already owns the bottom-left
        // corner. This is the only quiet place left that covers neither.
        right: 'clamp(12px, 3vw, 28px)',
        bottom: 'calc(clamp(12px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
        // Above page content, below the M-Care launcher (9000) so the orb is
        // never buried by its own greeting.
        zIndex: 8990,
        width: 'min(368px, calc(100vw - 24px))',
        background: 'rgba(8,14,26,0.94)',
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        fontFamily: SANS,
        animation: 'mcare-greeting-in 0.45s ease both',
      }}
    >
      <style>{`
        @keyframes mcare-greeting-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes mcare-greeting-in { from { opacity: 1; } to { opacity: 1; } }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <McareMark size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p id="mcare-greeting-title" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: WHITE }}>
            Hello — I'm M-Care.
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6, color: BODY }}>
            I look after the whole trip, not just the appointment. If you'd like an invitation to the
            pilot, leave your email and I'll come back to you when there's a place.
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Dismiss greeting"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            marginTop: -4,
            marginRight: -4,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: MUTED,
            fontSize: 17,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <JoinPilotForm source="landing_greeting" onDone={() => setTimeout(dismiss, 4200)} />
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button
          type="button"
          onClick={dismiss}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            fontSize: 12.5,
            color: MUTED,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Not now
        </button>
        <Link
          to="/pilot"
          onClick={dismiss}
          style={{ fontSize: 12.5, color: GOLD, textDecoration: 'none', fontWeight: 600 }}
        >
          What the pilot is →
        </Link>
      </div>
    </div>
  );
}