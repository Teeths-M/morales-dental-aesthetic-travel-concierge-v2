import { useCallback, useEffect, useRef, useState } from 'react';
import { LAST_SEEN_KEY, LOCKED_KEY, enrolledKey, lockedOnReturn, lockedOnStart } from '@/lib/appLock';
import { PHONE_LOCK_CHANGED_EVENT, getPhoneLockStatus } from '@/lib/phoneLock';

/**
 * useAppLock — whether M-Care's screen is locked right now (rules: src/lib/appLock.js).
 *
 * Remembers, on this phone: whether this account has the lock on (and its passkey ids, for an offline unlock), when
 * the app was last on screen, and whether it is locked. A lock survives a reload until unlocked. The server's answer
 * wins: whenever the app is online it asks managePasskeys whether the lock is on.
 *
 * While the app doesn't know yet whether a just-signed-in account has the lock on, `checking` is true and the screen
 * is covered, so the account isn't shown for a moment before the lock appears. Offline, an account the phone has no
 * record of opens normally: there is nothing to check against, and every protected action still needs the server.
 */
const SEEN_TICK_MS = 30 * 1000;
const CHECK_TIMEOUT_MS = 8000;

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch { /* storage unavailable */ }
}

function readEnrolled(email) {
  const raw = email ? read(enrolledKey(email)) : null;
  if (!raw) return { known: false, enrolled: false, credentialIds: [] };
  try {
    const v = JSON.parse(raw);
    return { known: true, enrolled: !!v.enrolled, credentialIds: Array.isArray(v.credential_ids) ? v.credential_ids : [] };
  } catch {
    return { known: false, enrolled: false, credentialIds: [] };
  }
}

export function useAppLock(user) {
  const email = String(user?.email || '').toLowerCase();
  const [state, setState] = useState(() => readEnrolled(email));
  const [locked, setLocked] = useState(() => {
    const s = readEnrolled(email);
    return !!email && lockedOnStart({ enrolled: s.enrolled, lastSeen: read(LAST_SEEN_KEY), lockedFlag: read(LOCKED_KEY) === '1', now: Date.now() });
  });
  const [checking, setChecking] = useState(() => !!email && !readEnrolled(email).known && navigator.onLine);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const lock = useCallback(() => {
    write(LOCKED_KEY, '1');
    setLocked(true);
  }, []);

  const markUnlocked = useCallback(() => {
    write(LOCKED_KEY, null);
    write(LAST_SEEN_KEY, Date.now());
    setLocked(false);
  }, []);

  // A different account (or a sign-out) starts from what this phone remembers about it.
  useEffect(() => {
    const s = readEnrolled(email);
    setState(s);
    const startLocked = !!email && lockedOnStart({
      enrolled: s.enrolled, lastSeen: read(LAST_SEEN_KEY), lockedFlag: read(LOCKED_KEY) === '1', now: Date.now(),
    });
    if (startLocked) write(LOCKED_KEY, '1');
    setLocked(startLocked);
    setChecking(!!email && !s.known && navigator.onLine);
  }, [email]);

  const refresh = useCallback(async () => {
    if (!email || !navigator.onLine) { setChecking(false); return; }
    let timer;
    try {
      const status = await Promise.race([
        getPhoneLockStatus(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS); }),
      ]);
      const next = {
        known: true,
        enrolled: !!status?.enrolled,
        credentialIds: Array.isArray(status?.credential_ids) ? status.credential_ids : [],
      };
      write(enrolledKey(email), JSON.stringify({ enrolled: next.enrolled, credential_ids: next.credentialIds }));
      setState(next);
      if (!next.enrolled) {
        write(LOCKED_KEY, null);
        setLocked(false);
      } else if (!lockedRef.current && lockedOnStart({
        enrolled: true, lastSeen: read(LAST_SEEN_KEY), lockedFlag: read(LOCKED_KEY) === '1', now: Date.now(),
      })) {
        lock();
      }
    } catch {
      // Couldn't ask: keep what the phone remembers.
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  }, [email, lock]);

  useEffect(() => { refresh(); }, [refresh]);

  // Settings tells us when the lock was turned on or off on this phone.
  useEffect(() => {
    const onChanged = () => {
      // Setting the lock up counts as being here now, so it doesn't lock the moment it's turned on.
      write(LAST_SEEN_KEY, Date.now());
      refresh();
    };
    window.addEventListener(PHONE_LOCK_CHANGED_EVENT, onChanged);
    window.addEventListener('online', refresh);
    return () => {
      window.removeEventListener(PHONE_LOCK_CHANGED_EVENT, onChanged);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  // Away for 5 minutes or more locks it. "Last seen" only moves while the screen is open and unlocked.
  useEffect(() => {
    if (!email || !state.enrolled) return undefined;
    let hiddenAt = document.hidden ? Date.now() : null;
    const seen = () => { if (!lockedRef.current && !document.hidden) write(LAST_SEEN_KEY, Date.now()); };
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        if (!lockedRef.current) write(LAST_SEEN_KEY, hiddenAt);
        return;
      }
      if (lockedOnReturn({ enrolled: true, hiddenAt, now: Date.now() })) lock();
      hiddenAt = null;
      seen();
    };
    const onPageHide = () => { if (!lockedRef.current) write(LAST_SEEN_KEY, Date.now()); };
    seen();
    const tick = setInterval(seen, SEEN_TICK_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [email, state.enrolled, lock]);

  return {
    enrolled: state.enrolled,
    credentialIds: state.credentialIds,
    locked: !!email && state.enrolled && locked,
    checking: !!email && checking,
    markUnlocked,
  };
}
