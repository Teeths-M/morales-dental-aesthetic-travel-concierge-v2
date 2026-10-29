import { useEffect, useState } from 'react';
import { SCENARIOS } from './script';

const HOLD_MS = 4600;

/**
 * useDemoPlayback — plays the scenarios like a session actually running:
 * one moment at a time, with the agent "working" in the pauses between them,
 * then holding on the final exchange before moving to the next situation.
 *
 * Nothing advances while the demo is off-screen, and with reduced motion the
 * whole conversation is simply present.
 */
export function useDemoPlayback({ visible, reduced }) {
  const [frame, setFrame] = useState({ index: 0, items: [] });
  const steps = SCENARIOS[frame.index].steps;

  useEffect(() => {
    if (!visible) return undefined;

    if (reduced) {
      if (frame.items.length !== steps.length) {
        setFrame((prev) => ({ ...prev, items: steps.map((step) => ({ ...step, at: new Date() })) }));
      }
      return undefined;
    }

    if (frame.items.length >= steps.length) {
      const timer = setTimeout(() => {
        setFrame((prev) => ({ index: (prev.index + 1) % SCENARIOS.length, items: [] }));
      }, HOLD_MS);
      return () => clearTimeout(timer);
    }

    const next = steps[frame.items.length];
    const timer = setTimeout(() => {
      setFrame((prev) => ({ ...prev, items: [...prev.items, { ...next, at: new Date() }] }));
    }, next.delay ?? 1200);
    return () => clearTimeout(timer);
  }, [visible, reduced, frame.index, frame.items.length, steps]);

  const typing = !reduced
    && visible
    && frame.items.length < steps.length
    && steps[frame.items.length].kind === 'text';

  const select = (index) => setFrame({ index, items: [] });

  return {
    scenarioIndex: frame.index,
    scenario: SCENARIOS[frame.index],
    items: frame.items,
    typing,
    select,
  };
}