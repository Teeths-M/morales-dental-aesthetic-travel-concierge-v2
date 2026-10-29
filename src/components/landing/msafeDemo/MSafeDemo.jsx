import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import DemoSidebar from './DemoSidebar';
import DemoHeader from './DemoHeader';
import DemoThread from './DemoThread';
import LiveMonitorStrip from './LiveMonitorStrip';
import { SCENARIOS } from './script';
import { useDemoPlayback } from './useDemoPlayback';
import { C } from './theme';

const PROMPTS = [
  'Ask M-Safe anything…',
  'Where is my driver right now?',
  'Was the surgeon’s licence checked?',
  'What do I eat before surgery?',
];

/**
 * MSafeDemo — the landing page's product demonstration, drawn as the M-Safe
 * workspace itself and PLAYED rather than pictured: provider checks resolve one
 * at a time, a missed check-in escalates, a cancelled flight is re-planned, and
 * the session moves between the three on its own.
 *
 * Everything is illustrative and labelled as such beneath the panel. Nothing
 * here calls a function or touches a record.
 */
export default function MSafeDemo() {
  const shellRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const { scenarioIndex, scenario, items, typing, select } = useDemoPlayback({ visible, reduced });

  // Only run while on screen — an off-screen loop animates for nobody.
  useEffect(() => {
    const node = shellRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!visible || reduced) return undefined;
    const timer = setInterval(() => setPromptIndex((index) => (index + 1) % PROMPTS.length), 4200);
    return () => clearInterval(timer);
  }, [visible, reduced]);

  const completed = new Set(items.filter((item) => item.completes !== undefined).map((item) => item.completes));

  return (
    <div
      ref={shellRef}
      className="msd-shell"
      style={{
        background: C.ground,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        overflow: 'hidden',
        fontFamily: C.sans,
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      }}
    >
      <DemoSidebar scenarios={SCENARIOS} activeIndex={scenarioIndex} onSelect={select} />

      <div className="msd-main">
        <DemoHeader />

        {/* The other half of the promise: the journey being watched while
            nobody is asking a question. */}
        <LiveMonitorStrip visible={visible} reduced={reduced} />

        <div className="msd-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p
              className="msd-scene"
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: C.goldInk,
                textTransform: 'uppercase',
              }}
            >
              {scenario.scene}
            </p>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: C.faint, letterSpacing: '0.1em' }}>
              {scenarioIndex + 1} / {SCENARIOS.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            {scenario.pills.map((label, index) => {
              const done = completed.has(index);
              return (
                <span
                  key={label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: done ? C.greenBg : '#F0EDE6',
                    border: `1px solid ${done ? C.greenBorder : C.border}`,
                    color: done ? C.greenInk : C.soft,
                    borderRadius: 9999,
                    padding: '3px 9px',
                    fontSize: 10,
                    fontWeight: 600,
                    transition: 'background 240ms ease, color 240ms ease',
                  }}
                >
                  {label}
                  {done ? (
                    <Check className="w-2.5 h-2.5" strokeWidth={4} />
                  ) : (
                    <span className="msd-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: C.faint }} />
                  )}
                </span>
              );
            })}
          </div>

          <DemoThread items={items} typing={typing} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderTop: `1px solid ${C.border}`,
            background: C.card,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: `1px solid ${C.border}`,
              borderRadius: 9999,
              padding: '9px 14px',
              fontSize: 12.5,
              color: promptIndex === 0 ? C.faint : C.soft,
              background: C.sidebar,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 400ms ease',
            }}
          >
            {PROMPTS[promptIndex]}
          </div>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4B978, #BE9A45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 10px rgba(190,154,69,0.4)',
            }}
          >
            <ArrowRight className="w-4 h-4" style={{ color: '#FFFFFF' }} />
          </div>
        </div>
      </div>

      <style>{`
        .msd-shell { display: grid; grid-template-columns: 236px 1fr; align-items: stretch; min-height: 540px; }
        .msd-sidebar { display: flex; flex-direction: column; padding: 18px 15px; }
        .msd-main { display: flex; flex-direction: column; min-width: 0; background: #FFFFFF; }
        .msd-body { flex: 1; min-height: 0; padding: 15px 18px 18px; display: flex; flex-direction: column; }
        .msd-thread { display: flex; flex-direction: column; gap: 9px; margin-top: 13px; }

        @keyframes msd-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .msd-item { animation: msd-in 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }

        @keyframes msd-dot { 0%, 80%, 100% { opacity: 0.28; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
        .msd-dot { animation: msd-dot 1.15s ease-in-out infinite; }

        @keyframes msd-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(60,179,113,0.5); } 50% { box-shadow: 0 0 0 4px rgba(60,179,113,0); } }
        .msd-pulse { animation: msd-pulse 2.2s ease-out infinite; }

        @media (max-width: 860px) {
          .msd-shell { grid-template-columns: 1fr; min-height: 0; }
          .msd-sidebar { display: none; }
          .msd-icons { display: none !important; }
        }
        @media (max-width: 520px) {
          .msd-title { font-size: 11.5px; }
          .msd-scene { font-size: 8.5px !important; letter-spacing: 0.1em !important; }
          .msd-body { padding: 13px 12px 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .msd-item, .msd-dot, .msd-pulse { animation: none !important; }
        }
      `}</style>
    </div>
  );
}