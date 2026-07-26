import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';

const EXIT_CONFIRM_WINDOW_MS = 2000;

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
  const { pivotViolations, closePivot } = useCart();
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handlePromise = CapacitorApp.addListener('backButton', () => {
      if (pivotViolations.length > 0) {
        closePivot();
        return;
      }
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
        return;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        toast('Press back again to exit');
      }
    });

    return () => {
      handlePromise.then((handle) => handle.remove());
    };
  }, [navigate, pivotViolations, closePivot]);
}
