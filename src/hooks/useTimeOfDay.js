/**
 * useTimeOfDay — Layer 2: Time-of-Day Engine (Silent Guardian)
 *
 * Pure client-side. Uses device local time only.
 * NO GPS, NO hardware sensors, NO battery drain.
 * Updates every minute via setInterval.
 *
 * Returns:
 *   isNight       — true 6 PM – 6 AM (risk bonus applies)
 *   isSleepHours  — true 10 PM – 6 AM (suppress non-critical alerts)
 *   riskBonus     — +10 during night, 0 during day
 *   hour          — current local hour (0-23)
 *   timeLabel     — 'day' | 'evening' | 'night' | 'sleep'
 */
import { useState, useEffect } from 'react';

const EVENING_START = 18; // 6 PM
const NIGHT_START   = 20; // 8 PM  (deepens night mode)
const SLEEP_START   = 22; // 10 PM (suppress non-critical alerts)
const SLEEP_END     =  6; // 6 AM

function getTimeLabel(hour) {
  if (hour >= SLEEP_START || hour < SLEEP_END) return 'sleep';
  if (hour >= NIGHT_START)                     return 'night';
  if (hour >= EVENING_START)                   return 'evening';
  return 'day';
}

export function useTimeOfDay() {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const label        = getTimeLabel(hour);
  const isNight      = hour >= EVENING_START || hour < SLEEP_END;
  const isSleepHours = hour >= SLEEP_START   || hour < SLEEP_END;
  const riskBonus    = isNight ? 10 : 0;

  return { hour, isNight, isSleepHours, riskBonus, timeLabel: label };
}
