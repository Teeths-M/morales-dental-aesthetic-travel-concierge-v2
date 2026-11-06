import React, { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home'));

/**
 * "/" — the website's home page, except inside the standalone mobile app.
 *
 * Installed on a phone (the native wrapper, or the home-screen app on iOS and
 * Android), the app opens straight on the M-Care companion instead of the
 * marketing site. Every browser visit, and every other route, is untouched.
 */
function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  // Neither is in the browser's type definitions: Capacitor is the native wrapper's own global, and
  // navigator.standalone is Safari's flag for a home-screen app.
  if (/** @type {any} */ (window).Capacitor?.isNativePlatform?.()) return true;
  if (/** @type {any} */ (window.navigator).standalone === true) return true;
  return ['standalone', 'fullscreen', 'minimal-ui'].some(
    (mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches
  );
}

export default function HomeEntry() {
  if (isStandaloneApp()) return <Navigate to="/m-care" replace />;
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}