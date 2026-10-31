import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useActiveCaseRecord } from '@/hooks/useActiveCaseRecord';
import { saveMcarePrefs } from '@/lib/mcarePreferences';
import { timeZoneForCountry } from '@/lib/countryTimeZones';
import {
  detectDeviceTimeZone, isValidTimeZone, nextBoundaryDelayMs, normalizeThemeMode,
  resolveResolvedTheme, resolveTimeZone, zoneClockLabel, zoneFriendlyName,
} from '@/lib/mobileTheme';
import { readStoredThemeMode, readTravelerTimeZone, writeStoredThemeMode } from '@/lib/themePreference';

/**
 * MobileThemeContext — the single source of truth for day/night across the
 * authenticated mobile app.
 *
 * It owns three things and nothing else: the traveller's chosen mode, the zone
 * the clock is read in, and the recomputation triggers. It never touches routes,
 * data, permissions or business logic — consumers read `resolved` ('day' |
 * 'night') and re-render, which is why a theme change cannot interrupt a
 * conversation or cause a reload.
 *
 * RECOMPUTATION IS EVENT-DRIVEN, NOT POLLED
 * - a single timer aimed at the exact next 06:00/18:00 boundary in the zone;
 * - app resume (visibilitychange), window focus, pageshow and reconnect, which
 *   is also where a changed device zone is detected — the platform has no
 *   timezone-change event, so this is the lightest honest equivalent;
 * - the active journey's destination country changing (react-query already
 *   caches it; the value simply arrives).
 * No background interval runs, and nothing is scheduled while the tab is hidden.
 */

const MAX_TICK_MS = 15 * 60 * 1000; // safety clamp for DST/clock drift

const MobileThemeContext = createContext(null);

export function MobileThemeProvider({ children }) {
  const { user } = useAuth();
  const { data: activeCase } = useActiveCaseRecord(user?.email);

  const [mode, setModeState] = useState('auto');
  const [now, setNow] = useState(() => new Date());
  const [deviceTimeZone, setDeviceTimeZone] = useState(() => detectDeviceTimeZone());
  const hydratedFor = useRef(null);

  // Hydrate once per account: profile first (it travels), then this device's
  // memo, then the documented default.
  useEffect(() => {
    const id = user?.id || 'guest';
    if (hydratedFor.current === id) return;
    hydratedFor.current = id;
    const fromProfile = normalizeThemeMode(user?.mcare_prefs?.themeMode);
    setModeState(fromProfile || readStoredThemeMode(id) || 'auto');
  }, [user]);

  const setMode = useCallback((next) => {
    const clean = normalizeThemeMode(next) || 'auto';
    setModeState(clean);
    writeStoredThemeMode(user?.id || 'guest', clean);
    // Best-effort: the local choice already applies, so a failed write costs
    // nothing this session and simply won't follow to the next device.
    if (user) saveMcarePrefs(user.mcare_prefs || {}, { themeMode: clean }).catch(() => {});
  }, [user]);

  const journeyTimeZone = useMemo(
    () => timeZoneForCountry(activeCase?.procedure_country),
    [activeCase?.procedure_country],
  );
  const travelerTimeZone = useMemo(() => readTravelerTimeZone(user), [user]);

  const zone = useMemo(
    () => resolveTimeZone({ journeyTimeZone, travelerTimeZone, deviceTimeZone }),
    [journeyTimeZone, travelerTimeZone, deviceTimeZone],
  );

  const resolved = useMemo(
    () => resolveResolvedTheme(mode, now, zone.timeZone),
    [mode, now, zone.timeZone],
  );

  // One timer, aimed at the real next boundary. Only while Auto is in charge.
  useEffect(() => {
    if (mode !== 'auto') return undefined;
    const delay = nextBoundaryDelayMs(new Date(), zone.timeZone);
    const wait = Math.max(1000, Math.min(delay ?? MAX_TICK_MS, MAX_TICK_MS));
    const timer = setTimeout(() => setNow(new Date()), wait);
    return () => clearTimeout(timer);
  }, [mode, zone.timeZone, now]);

  // Resume / focus / reconnect: re-read the clock AND the device zone. Cheap —
  // one Intl call — and deliberately not a periodic background poll.
  useEffect(() => {
    const revalidate = () => {
      setNow(new Date());
      const detected = detectDeviceTimeZone();
      setDeviceTimeZone((prev) => (prev === detected ? prev : detected));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', revalidate);
    window.addEventListener('pageshow', revalidate);
    window.addEventListener('online', revalidate);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('pageshow', revalidate);
      window.removeEventListener('online', revalidate);
    };
  }, []);

  const value = useMemo(() => ({
    mode,
    setMode,
    resolved,
    isNight: resolved === 'night',
    timeZone: zone.timeZone,
    source: zone.source,
    /** True when no usable zone exists — the UI must say so, not paper over it. */
    usingFallback: zone.source === 'fallback',
    clock: zoneClockLabel(now, zone.timeZone),
    zoneName: zoneFriendlyName(zone.timeZone),
    validZone: isValidTimeZone(zone.timeZone),
  }), [mode, setMode, resolved, zone.timeZone, zone.source, now]);

  return <MobileThemeContext.Provider value={value}>{children}</MobileThemeContext.Provider>;
}

export function useMobileTheme() {
  const ctx = useContext(MobileThemeContext);
  if (!ctx) throw new Error('useMobileTheme must be used inside MobileThemeProvider');
  return ctx;
}