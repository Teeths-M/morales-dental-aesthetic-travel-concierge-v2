/**
 * useMcarePreferences — React hook that exposes the current user's M-Care
 * Voice & Privacy preferences and a setter that persists them to the User
 * entity via base44.auth.updateMe.
 *
 * Hydrates once from the auth context user (already loaded by AuthProvider),
 * then keeps local state in sync with each persisted update. A guest
 * (unauthenticated user) gets the defaults and a no-op setter, so the orb
 * still works for visitors without crashing.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { DEFAULT_MCARE_PREFS, normalizePrefs, prefsFromUser, saveMcarePrefs } from '@/lib/mcarePreferences';

export function useMcarePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_MCARE_PREFS);
  const [saving, setSaving] = useState(false);
  // Hydrate exactly once per user identity so a late-arriving auth update
  // doesn't clobber an in-flight local toggle.
  const hydratedFor = useRef(null);
  // update() below is memoized on [user] only (see its own comment) so its
  // closure would otherwise go stale between user changes — reading prefs
  // through a ref that's always current, instead of the closed-over prefs
  // variable, means a patch always merges onto the real latest prefs rather
  // than whatever prefs looked like the last time update() was re-created.
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  useEffect(() => {
    const id = user?.id || 'guest';
    if (hydratedFor.current === id) return;
    hydratedFor.current = id;
    setPrefs(prefsFromUser(user));
  }, [user]);

  const update = useCallback(async (patch) => {
    // Guests can't persist — keep the local toggle so the UI still reflects it
    // for the session, but don't claim to save.
    if (!user) {
      setPrefs((prev) => normalizePrefs({ ...prev, ...patch }));
      return;
    }
    setSaving(true);
    try {
      const merged = await saveMcarePrefs(prefsRef.current, patch);
      setPrefs(merged);
    } catch {
      // Persist failed (offline / session expired) — still reflect the
      // change locally for this session; it simply won't survive a reload.
      setPrefs((prev) => normalizePrefs({ ...prev, ...patch }));
    } finally {
      setSaving(false);
    }
  }, [user]);

  return { prefs, update, saving };
}
