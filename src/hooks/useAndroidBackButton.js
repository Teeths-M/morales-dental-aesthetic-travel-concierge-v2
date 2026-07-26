import { useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { toast } from 'sonner';
import { CartContext } from '@/context/CartContext';

const EXIT_CONFIRM_WINDOW_MS = 2000;
const PIVOT_CLOSE_COOLDOWN_MS = 350;

/**
 * Pure — true when `now` is close enough to `lastPress` to count as the
 * confirming second press rather than a fresh first one. Exported for unit
 * testing; the hook itself is native-only and can't be exercised directly.
 */
export function isExitConfirmPress(now, lastPress, windowMs = EXIT_CONFIRM_WINDOW_MS) {
  return now - lastPress < windowMs;
}

/**
 * Android hardware back button — inert on web/PWA (Capacitor.isNativePlatform()
 * gate). Registering this listener takes full control of the back press; there
 * is no "call preventDefault and let default happen" — every case must be
 * handled explicitly or the press does nothing.
 *
 * Priority: close the one app-wide overlay (SafetyPivotOverlay, via CartContext
 * — the only globally-reachable modal in this app) → navigate back if this SPA
 * session has history → otherwise require a second press within 2s to exit
 * (standard Android convention, and safer than an instant exit on a medical
 * app where "something important was on screen" is a live possibility).
 *
 * Does not close arbitrary open Dialog/Sheet components — each owns local
 * `open` state with no central registry, so this can't reach them. Closing
 * those on back-press would need a global modal registry, a separate change.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  // Read CartContext directly (not via useCart) so the hook degrades gracefully
  // if the provider is unavailable — e.g. during Vite HMR when a replaced
  // CartContext module creates a new context object that doesn't match the one
  // the already-mounted CartProvider used. The pivot-close behaviour is a
  // nice-to-have; navigate-back and exit must still work without it.
  const cart = useContext(CartContext);
  const pivotViolations = cart?.pivotViolations;
  const closePivot = cart?.closePivot;
  const lastBackPressRef = useRef(0);
  const pivotClosedAtRef = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handlePromise = CapacitorApp.addListener('backButton', () => {
      const now = Date.now();
      // Swallow a rapid second press landing while SafetyPivotOverlay's own
      // exit animation is still playing (~300-400ms) — without this, it falls
      // through to navigate(-1)/exit while the overlay is still visually on screen.
      if (now - pivotClosedAtRef.current < PIVOT_CLOSE_COOLDOWN_MS) {
        return;
      }
      if (pivotViolations && pivotViolations.length > 0 && closePivot) {
        closePivot();
        pivotClosedAtRef.current = now;
        return;
      }
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
        return;
      }
      if (isExitConfirmPress(now, lastBackPressRef.current)) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        toast('Press back again to exit');
      }
    });

    return () => {
      handlePromise.then((handle) => handle.remove());
    };
  }, [navigate, cart]);
}