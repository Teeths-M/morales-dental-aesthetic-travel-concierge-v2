/**
 * useGuardianMode — Layer 4: Smart Check-in Scheduler (Silent Guardian)
 *
 * Board constraints applied:
 *  - NEVER polls GPS when not in an active journey
 *  - Daily check-in: 9 AM local time, active journey only
 *  - Nightly check-in: 9 PM local time, solo + active journey only
 *  - GPS silence escalation: 4h daytime / 2h nighttime, active journey only
 *  - Sleep hours (10 PM – 6 AM): no non-critical check-ins
 *
 * This hook manages SCHEDULING only — it does not send SMS directly.
 * Call `triggerCheckIn()` to invoke the backend edge function.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { isSystemPaused } from '@/lib/systemPause';

const CHECKIN_KEY      = 'morales_guardian_checkin';
const AM_CHECK_HOUR    = 9;
const PM_CHECK_HOUR    = 21;
const GPS_STALE_DAY_MS = 4 * 60 * 60_000;   // 4 hours daytime
const GPS_STALE_NGT_MS = 2 * 60 * 60_000;   // 2 hours nighttime
const SLEEP_START      = 22;
const SLEEP_END        = 6;

function isSleepHours(hour) {
  return hour >= SLEEP_START || hour < SLEEP_END;
}

function getLastCheckIn() {
  try {
    const v = localStorage.getItem(CHECKIN_KEY);
    return v ? new Date(v) : null;
  } catch { return null; }
}

function setLastCheckIn(ts) {
  try { localStorage.setItem(CHECKIN_KEY, ts || new Date().toISOString()); } catch {}
}

export function useGuardianMode({
  consultationId,
  travelingSolo,
  guardianModeOptedIn,
  isActiveJourney,
  isNight,
  lastGPSUpdateAt,
}) {
  const [checkInDue,   setCheckInDue]   = useState(false);
  const [gpsAlertDue,  setGpsAlertDue]  = useState(false);
  const [scheduleStatus, setStatus]     = useState('idle');
  const checkedTodayRef = useRef({ am: false, pm: false });

  const isGuardianMode = !!(travelingSolo && guardianModeOptedIn && isActiveJourney);

  // Determine if a scheduled check-in is due
  useEffect(() => {
    if (!isGuardianMode) { setCheckInDue(false); return; }

    const tick = () => {
      const now  = new Date();
      const hour = now.getHours();
      const min  = now.getMinutes();

      // Suppress non-critical check-ins during sleep hours
      if (isSleepHours(hour)) { setCheckInDue(false); return; }

      // 9 AM daily check-in
      if (hour === AM_CHECK_HOUR && min < 5 && !checkedTodayRef.current.am) {
        checkedTodayRef.current.am = true;
        setCheckInDue(true);
        setStatus('am_checkin_due');
        return;
      }

      // 9 PM nightly check-in (solo only, not group/partner)
      if (travelingSolo && hour === PM_CHECK_HOUR && min < 5 && !checkedTodayRef.current.pm) {
        checkedTodayRef.current.pm = true;
        setCheckInDue(true);
        setStatus('pm_checkin_due');
        return;
      }

      // Reset daily flags at midnight
      if (hour === 0 && min === 0) {
        checkedTodayRef.current = { am: false, pm: false };
      }
    };

    tick(); // check immediately
    const id = setInterval(tick, 60_000); // check every minute
    return () => clearInterval(id);
  }, [isGuardianMode, travelingSolo]);

  // GPS silence detection (only when active journey)
  useEffect(() => {
    if (!isGuardianMode || !lastGPSUpdateAt) { setGpsAlertDue(false); return; }

    const threshold = isNight ? GPS_STALE_NGT_MS : GPS_STALE_DAY_MS;
    const now       = Date.now();
    const staleMs   = now - new Date(lastGPSUpdateAt).getTime();

    if (staleMs > threshold) {
      const hour = new Date().getHours();
      if (!isSleepHours(hour)) {
        setGpsAlertDue(true);
        setStatus('gps_silence');
      }
    } else {
      setGpsAlertDue(false);
    }
  }, [isGuardianMode, isNight, lastGPSUpdateAt]);

  // Trigger a backend check-in (called by orchestrator or schedule)
  const triggerCheckIn = useCallback(async (reason = 'scheduled') => {
    if (!consultationId || isSystemPaused()) return;
    try {
      await base44.functions.invoke('guardianCheckIn', {
        consultation_id: consultationId,
        reason,
      });
      setLastCheckIn(new Date().toISOString());
      setCheckInDue(false);
    } catch {}
  }, [consultationId]);

  const acknowledgeCheckIn = useCallback(() => {
    setLastCheckIn(new Date().toISOString());
    setCheckInDue(false);
    setGpsAlertDue(false);
  }, []);

  return {
    isGuardianMode,
    checkInDue,
    gpsAlertDue,
    scheduleStatus,
    lastCheckIn: getLastCheckIn(),
    triggerCheckIn,
    acknowledgeCheckIn,
  };
}
