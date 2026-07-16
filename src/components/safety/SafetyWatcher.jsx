// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';

/**
 * SafetyWatcher — zero-render global reactive validation layer.
 *
 * Monitors the cart's combined risk profile on every change. When the
 * Safety Watcher detects a transition from a Safe/Review state to a
 * High Risk (RED) state, it triggers the REMEDIATION_REQUIRED pivot —
 * opening the SafetyPivotOverlay with automated substitution analysis
 * rather than issuing a hard stop.
 *
 * Also detects cold-start RED (cart was RED on page load from localStorage)
 * and opens the pivot immediately so the client always sees their options.
 *
 * Mount once inside <Router> + <CartProvider> (see App.jsx). Renders nothing.
 */
export default function SafetyWatcher() {
  const { safetyStatus, openPivot } = useCart();
  // null = not yet initialized (cold-start check pending)
  const prevLevelRef = useRef(null);

  useEffect(() => {
    const curr = safetyStatus?.level ?? 'GREEN';

    if (prevLevelRef.current === null) {
      // Cold-start: only open pivot if the user is already on a booking/procedure
      // path — not on the home page or marketing pages where no booking is in flight.
      prevLevelRef.current = curr;
      if (curr === 'RED') {
        const path = window.location.pathname;
        const isBookingPath = ['/booking', '/intake', '/checkout', '/procedures', '/discover', '/providers', '/deep-perfection'].some(p => path.startsWith(p));
        if (isBookingPath) {
          openPivot(safetyStatus?.violations ?? []);
        }
      }
      return;
    }

    const prev = prevLevelRef.current;
    prevLevelRef.current = curr;

    // Transition from any Safe/Review state → High Risk: trigger REMEDIATION_REQUIRED
    if (prev !== 'RED' && curr === 'RED') {
      openPivot(safetyStatus?.violations ?? []);
    }
  // openPivot is stable (defined outside render in CartContext); safetyStatus
  // is the reactive signal — intentional narrow dep array.
   
  }, [safetyStatus?.level]);

  return null;
}
