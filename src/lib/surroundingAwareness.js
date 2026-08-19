/**
 * surroundingAwareness — arms/disarms the real background proximity engine
 * (src/hooks/useSurroundingAwareness.js + SurroundingAwarenessWatcher,
 * mounted globally in App.jsx) conversationally instead of only through the
 * dedicated settings panel on /nearby (SurroundingAwarenessPanel.jsx).
 *
 * A thin wrapper, not a second engine: setEnabled(true/false) is the same
 * module-level state both the panel's toggle and this conversational path
 * read/write, so an "on" said in chat and an "on" tapped on the panel are
 * exactly the same state, not two things that can drift out of sync.
 */

import { setEnabled } from '@/hooks/useSurroundingAwareness';

export function armSurroundingAwareness() {
  setEnabled(true);
}

export function disarmSurroundingAwareness() {
  setEnabled(false);
}
