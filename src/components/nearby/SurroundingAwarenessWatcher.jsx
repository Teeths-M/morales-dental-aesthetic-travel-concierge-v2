import { useEffect } from 'react';
import { initIfEnabled, cleanup } from '@/hooks/useSurroundingAwareness';

/**
 * SurroundingAwarenessWatcher — global mount point for the proximity-detection
 * engine. Renders nothing. Mounted once in App.jsx alongside SafetyWatcher.
 *
 * On mount, starts watching if the user previously enabled it (persisted in
 * localStorage). On unmount (app closed), stops watching — honoring the
 * "while the app is open only" privacy boundary.
 *
 * The actual toggle UI lives on NearbyHelp (SurroundingAwarenessPanel), which
 * shares the same module-level state via useSurroundingAwareness.
 */
export default function SurroundingAwarenessWatcher() {
  useEffect(() => {
    initIfEnabled();
    return () => cleanup();
  }, []);
  return null;
}