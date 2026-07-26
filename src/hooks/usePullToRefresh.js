import { useEffect, useRef, useState } from 'react';

const PULL_RESISTANCE = 0.4;
const MAX_PULL_PX = 90;
const REFRESH_THRESHOLD_PX = 70;
const MIN_VISIBLE_MS = 500;

/**
 * `overscroll-behavior: none` (src/index.css) deliberately kills the native
 * iOS/Android bounce app-wide ("websites bounce, apps don't"), which also
 * removes the gesture patients expect for pull-to-refresh. This reimplements
 * just that gesture, scoped to when the page is already scrolled to the top.
 */
export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const startX = useRef(null);
  const tracking = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e) => {
      if (window.scrollY > 0 || refreshing) return;
      if (e.target.closest?.('[role="dialog"]')) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      tracking.current = false;
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const deltaY = e.touches[0].clientY - startY.current;
      const deltaX = e.touches[0].clientX - startX.current;
      if (!tracking.current) {
        if (deltaY <= 0 || Math.abs(deltaY) <= Math.abs(deltaX)) return;
        tracking.current = true;
      }
      if (window.scrollY > 0) {
        startY.current = null;
        tracking.current = false;
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.max(0, Math.min(deltaY * PULL_RESISTANCE, MAX_PULL_PX)));
    };

    const onTouchEnd = async () => {
      if (!tracking.current) {
        startY.current = null;
        return;
      }
      startY.current = null;
      tracking.current = false;

      if (pullDistance >= REFRESH_THRESHOLD_PX) {
        setRefreshing(true);
        const started = Date.now();
        try {
          await onRefresh?.();
        } finally {
          const elapsed = Date.now() - started;
          const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
          setTimeout(() => {
            setRefreshing(false);
            setPullDistance(0);
          }, remaining);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onRefresh, pullDistance, refreshing]);

  return { pullDistance, refreshing };
}
