import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Car, Phone, Stethoscope, CloudSun, MapPin, FileText, ShieldCheck, CreditCard, Plane, Search, Loader2,
  Check, AlertTriangle, WifiOff, Mic, Keyboard, History,
} from 'lucide-react';
import LivingRing from './LivingRing';
import { GOLD, NIGHT, GLASS, WORDMARK_FONT } from '../panelPalette';
import {
  SOS_COUNTDOWN_SECONDS, DOUBLE_TAP_MS, RING_DONE_MS, ringCenterFor, ringShouldSleep, createDoubleTapDetector,
} from '@/lib/livingRing';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

/**
 * RingScreen — M-Care's own full-screen app as one living screen (Portia's "Living Ring", Nov 6).
 *
 * The golden ring is M-Care's only face. Asleep: just the ring and "M-CARE" on navy. Awake: the ring rises to the
 * top, the conversation flows up under it, and three buttons sit at the bottom: History, Talk and Type. A double tap
 * on Talk starts a 5-second SOS countdown that any tap cancels.
 *
 * Everything real stays in MCareOrb (the agent conversation, voice, Talk Mode, safety checks, sign-ups, the SOS send
 * itself). This screen only lays it out: MCareOrb hands in the conversation and the message box as finished pieces,
 * plus what M-Care is really doing (orbState, the running tool), and this screen never invents a state of its own.
 */

// The ring's centre icon for each task (src/lib/livingRing.js's taskForTool).
const TASK_ICONS = {
  car: Car, call: Phone, doctor: Stethoscope, weather: CloudSun, location: MapPin, document: FileText,
  safety: ShieldCheck, payment: CreditCard, travel: Plane, search: Search, working: Loader2,
};

// How big the ring is while awake, as a share of its asleep size.
const AWAKE_SCALE = { empty: 0.66, conversation: 0.48, typing: 0.28, sos: 0.8 };
// Much of the ring's canvas is soft glow around it; the space it takes in the layout is a bit smaller.
const RING_FOOTPRINT = 0.8;
const SOS_HINT_KEY = 'morales_ring_sos_hint_seen';

/** M-Care's mark beside its replies on the ring screen: a small, still golden ring (one canvas is enough). */
export function RingAvatar({ size = 28 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box',
      border: '2px solid #E8C25A',
      boxShadow: '0 0 10px rgba(232,194,90,0.55), inset 0 0 6px rgba(232,194,90,0.45)',
      background: 'radial-gradient(circle, rgba(6,11,22,0.9) 55%, rgba(232,194,90,0.12) 100%)',
    }} />
  );
}

function readHintSeen() {
  try { return localStorage.getItem(SOS_HINT_KEY) === '1'; } catch { return true; }
}

function CenterIcon({ center, sosCount }) {
  if (center === 'sos') {
    return (
      <span aria-hidden="true" style={{ fontSize: 120, fontWeight: 200, color: '#FECACA', fontFamily: WORDMARK_FONT, lineHeight: 1, textShadow: '0 0 30px rgba(239,68,68,0.7)' }}>
        {sosCount ?? ''}
      </span>
    );
  }
  if (center === 'thinking') {
    return (
      <span aria-hidden="true" className="ring-thinking" style={{ display: 'flex', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: GOLD, boxShadow: `0 0 14px ${GOLD}`, animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
    );
  }
  const Icon = center === 'done' ? Check
    : center === 'alert' ? AlertTriangle
      : center === 'offline' ? WifiOff
        : TASK_ICONS[center];
  if (!Icon) return null;
  const color = center === 'alert' ? '#FBBF24' : center === 'offline' ? '#9AA6B2' : center === 'done' ? '#86EFAC' : '#F6DE8A';
  return (
    <Icon
      aria-hidden="true"
      className={center === 'working' ? 'ring-spin' : undefined}
      style={{ width: 64, height: 64, color, filter: `drop-shadow(0 0 16px ${color})` }}
      strokeWidth={1.5}
    />
  );
}

export default function RingScreen({
  orbState = 'idle',
  toolName = null,
  statusText = '',
  statusTone = 'active',
  amplitude = null,
  hasConversation = false,
  busy = false,
  activityKey = '',
  doneToken = 0,
  talkActive = false,
  talkDelayed = false,
  talkHint = 'Speak naturally to M-Care',
  typing = false,
  canCloseTyping = true,
  onCloseTyping,
  onTalk,
  onType,
  onHistory,
  onSos,
  sosSending = false,
  conversation = null,
  composer = null,
}) {
  const reduced = usePrefersReducedMotion();
  const areaRef = useRef(null);
  const composerRef = useRef(null);
  const [area, setArea] = useState({ w: 360, h: 640 });
  const [awake, setAwake] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const detectorRef = useRef(createDoubleTapDetector());
  const [sosCount, setSosCount] = useState(null);
  const [notice, setNotice] = useState('');
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const [justCompleted, setJustCompleted] = useState(false);

  const sosActive = sosCount != null || sosSending;

  // The area under the wordmark, measured so the ring's size follows the real screen.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const noteActivity = () => { lastActivityRef.current = Date.now(); };

  // Something new in the conversation (a reply, a journey update, a scanned ad's greeting) wakes the screen.
  useEffect(() => {
    noteActivity();
    setAwake(true);
  }, [activityKey]);

  // Anything that keeps M-Care busy keeps the screen awake, and wakes it.
  useEffect(() => {
    if (busy || sosActive) { noteActivity(); setAwake(true); }
  }, [busy, sosActive]);

  // Falls asleep after a quiet spell (longer once there's a conversation to read), never while busy.
  useEffect(() => {
    if (!awake) return undefined;
    const id = setInterval(() => {
      if (ringShouldSleep({ idleMs: Date.now() - lastActivityRef.current, hasConversation, busy: busy || sosActive || typing })) {
        setAwake(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [awake, hasConversation, busy, sosActive, typing]);

  // Any key wakes it; while awake, keys count as activity.
  useEffect(() => {
    const onKey = () => { noteActivity(); setAwake(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The check mark in the ring's centre. MCareOrb moves doneToken only when a task that was running finished with a
  // success status, so a failed task never shows a tick.
  useEffect(() => {
    if (!doneToken) return undefined;
    setJustCompleted(true);
    const id = setTimeout(() => setJustCompleted(false), RING_DONE_MS);
    return () => clearTimeout(id);
  }, [doneToken]);

  // The SOS countdown: one step a second, a short buzz on each where the phone supports it, then the send.
  useEffect(() => {
    if (sosCount == null) return undefined;
    if (sosCount <= 0) {
      setSosCount(null);
      onSos?.();
      return undefined;
    }
    try { navigator.vibrate?.(40); } catch { /* not every phone can */ }
    const id = setTimeout(() => setSosCount((n) => (n == null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [sosCount, onSos]);

  // Any tap anywhere (the see-through cancel layer below, so the tap does nothing else), or Escape, cancels.
  const cancelSos = () => {
    setSosCount(null);
    setNotice('SOS cancelled. Nothing was sent.');
  };
  useEffect(() => {
    if (sosCount == null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cancelSos(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sosCount != null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(id);
  }, [notice]);

  // The message box closes again when it's empty and the traveller taps somewhere else (not inside it, and not in a
  // dialog it opened, such as the vault upload).
  useEffect(() => {
    if (!typing) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (composerRef.current?.contains(t)) return;
      if (t instanceof Element && t.closest('[role="dialog"], [role="alertdialog"]')) return;
      if (canCloseTyping) onCloseTyping?.();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [typing, canCloseTyping, onCloseTyping]);

  const delayedTalkRef = useRef(0);
  useEffect(() => () => clearTimeout(delayedTalkRef.current), []);
  const startSosCountdown = () => {
    setNotice('');
    setSosCount(SOS_COUNTDOWN_SECONDS);
  };
  const handleTalk = () => {
    noteActivity();
    if (!hintSeen) {
      setHintSeen(true);
      try { localStorage.setItem(SOS_HINT_KEY, '1'); } catch { /* best effort */ }
    }
    const kind = detectorRef.current.tap(performance.now());
    if (talkDelayed) {
      // Where Talk opens the message box (a browser that can't listen), the box would cover the Talk button before a
      // second tap could land, so a single tap waits out the double-tap window first.
      clearTimeout(delayedTalkRef.current);
      if (kind === 'double') startSosCountdown();
      else delayedTalkRef.current = setTimeout(() => onTalk?.(), DOUBLE_TAP_MS + 20);
      return;
    }
    // The first tap acts at once, so Talk never feels slower; a second tap within 400 ms undoes it (Talk is a toggle,
    // so its one call here is the undo) and starts the SOS countdown instead.
    onTalk?.();
    if (kind === 'double') startSosCountdown();
  };

  // Ring size: big and centred while asleep, smaller toward the top while awake.
  const base = Math.max(160, Math.min(area.w * 0.98, area.h * 0.85, 480));
  const scaleKey = sosActive ? 'sos' : typing ? 'typing' : hasConversation ? 'conversation' : 'empty';
  const scale = awake ? AWAKE_SCALE[scaleKey] : 1;
  const zoneHeight = awake ? Math.round(base * scale * RING_FOOTPRINT) : area.h;

  const ringState = sosActive ? 'sos' : orbState;
  const center = sosActive ? 'sos' : ringCenterFor({ orbState, toolName, justCompleted });

  const line = sosCount != null
    ? `Sending help in ${sosCount}… tap anywhere to cancel`
    : sosSending ? 'Sending your SOS…'
      : notice || statusText;
  const lineTone = sosActive ? 'sos' : notice ? 'active' : statusTone;
  const lineColor = lineTone === 'sos' ? '#FCA5A5' : lineTone === 'caution' ? '#FBBF24' : NIGHT.goldInk;

  const transition = reduced ? 'none' : 'height 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease';
  /** @type {React.CSSProperties} */
  const sideButton = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    cursor: 'pointer', color: NIGHT.ink, fontSize: 13, fontWeight: 500, padding: 4, minWidth: 64,
  };
  const sideDisc = {
    width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: GLASS.card, border: '1px solid rgba(212,175,55,0.45)', boxShadow: '0 0 14px rgba(212,175,55,0.18)',
  };

  return (
    // The soft lift in the navy sits behind the ring: mid-screen while it sleeps, toward the top while awake.
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: `radial-gradient(ellipse at 50% ${awake ? 22 : 52}%, #0F1A2C 0%, ${NIGHT.canvas} 62%)`, overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, textAlign: 'center', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)', paddingBottom: 6 }}>
        <span style={{ fontFamily: WORDMARK_FONT, fontSize: 15, fontWeight: 300, letterSpacing: '0.42em', paddingLeft: '0.42em', color: 'rgba(243,245,247,0.82)' }}>
          M-CARE
        </span>
      </div>

      <div ref={areaRef} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flexShrink: 0, height: zoneHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', transition, overflow: 'visible', pointerEvents: 'none' }}>
          <div style={{ width: base, height: base, flexShrink: 0, transform: `scale(${scale})`, transition }}>
            <LivingRing state={ringState} size={Math.round(base)} amplitude={amplitude} reduced={reduced} label={line || 'M-Care'}>
              <CenterIcon center={center} sosCount={sosCount} />
            </LivingRing>
          </div>
        </div>

        <div
          aria-hidden={awake ? undefined : true}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', opacity: awake ? 1 : 0, pointerEvents: awake ? 'auto' : 'none', transition: reduced ? 'none' : 'opacity 0.45s ease' }}
        >
          <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 22, textAlign: 'center', fontSize: 14, fontWeight: 500, color: lineColor, padding: '0 16px' }}>
            {line}
          </p>

          {/* The conversation flows up under the ring and fades out at its top edge. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {conversation}
          </div>

          <div style={{ flexShrink: 0, paddingBottom: typing ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
            {/* The message box is always there, folded away until Type opens it, so Type can put the cursor in it
                within the tap itself: a phone only brings up its keyboard for a field focused during the tap. */}
            <div ref={composerRef} style={typing ? undefined : { height: 0, overflow: 'hidden', opacity: 0 }}>
              {composer}
            </div>
            {!typing && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', maxWidth: 420, margin: '0 auto', padding: '8px 16px 0' }}>
                  <button type="button" onClick={() => { noteActivity(); onHistory?.(); }} className="ms-press" style={sideButton} aria-label="History: your past conversations">
                    <span style={sideDisc}><History style={{ width: 23, height: 23, color: '#F6DE8A' }} strokeWidth={1.6} /></span>
                    History
                  </button>
                  <button
                    type="button"
                    onClick={handleTalk}
                    className="ms-press"
                    aria-pressed={talkActive}
                    aria-label={talkActive ? 'Stop talking with M-Care' : 'Talk to M-Care. Tap twice quickly for SOS'}
                    style={{ ...sideButton, gap: 8 }}
                  >
                    <span className={talkActive && !reduced ? 'ring-talk-live' : undefined} style={{
                      width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'radial-gradient(circle at 50% 40%, #1A2438 0%, #0A101C 70%)',
                      border: `2px solid ${talkActive ? '#F6DE8A' : GOLD}`,
                      boxShadow: talkActive
                        ? '0 0 0 6px rgba(212,175,55,0.16), 0 0 34px rgba(246,222,138,0.65)'
                        : '0 0 0 6px rgba(212,175,55,0.08), 0 0 24px rgba(212,175,55,0.4)',
                    }}>
                      <Mic style={{ width: 32, height: 32, color: '#F6DE8A' }} strokeWidth={1.6} />
                    </span>
                    {talkActive ? 'Listening' : 'Talk'}
                  </button>
                  <button type="button" onClick={() => { noteActivity(); onType?.(); }} className="ms-press" style={sideButton} aria-label="Type a message">
                    <span style={sideDisc}><Keyboard style={{ width: 23, height: 23, color: '#F6DE8A' }} strokeWidth={1.6} /></span>
                    Type
                  </button>
                </div>
                <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 13, color: NIGHT.muted }}>
                  {hintSeen ? talkHint : 'Tap Talk twice anytime for SOS'}
                </p>
              </>
            )}
          </div>
        </div>

        {!awake && (
          <button
            type="button"
            aria-label="Wake M-Care"
            onClick={() => { noteActivity(); setAwake(true); }}
            style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
          />
        )}
      </div>

      {sosCount != null && (
        <button
          type="button"
          aria-label={`Cancel SOS. Sending help in ${sosCount} seconds`}
          onClick={cancelSos}
          autoFocus
          style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
        />
      )}

      <style>{`
        @keyframes ringThinking { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-6px); } }
        .ring-thinking > span { animation: ringThinking 1.2s ease-in-out infinite; }
        @keyframes ringSpin { to { transform: rotate(360deg); } }
        .ring-spin { animation: ringSpin 1.6s linear infinite; }
        @keyframes ringTalkLive { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .ring-talk-live { animation: ringTalkLive 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ring-thinking > span, .ring-spin, .ring-talk-live { animation: none; }
        }
      `}</style>
    </div>
  );
}
