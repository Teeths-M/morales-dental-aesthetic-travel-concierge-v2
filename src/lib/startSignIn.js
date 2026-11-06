import { base44 } from '@/api/base44Client';
import { hasPassedAgeGate } from '@/lib/ageGate';

/**
 * Start Google sign-in. A device that hasn't passed the date-of-birth check
 * goes to /login first, where the check runs, and then on to Google from there.
 *
 * Use this instead of calling base44.auth.loginWithProvider directly, so every
 * way into an account passes the same check. Login.jsx is the only other place
 * that starts a sign-in, and it only does so after the check.
 */
export function startGoogleSignIn(redirectPath = '/dashboard') {
  if (hasPassedAgeGate()) {
    base44.auth.loginWithProvider('google', redirectPath);
    return;
  }
  window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
