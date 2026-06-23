/**
 * useFlightTracking
 * Polls the TravelRequest flight status and pre-caches the welcome
 * payload when the flight reaches in_progress or landed status.
 *
 * Polling interval: every 5 minutes (matches pollActiveTripFlights cron).
 * On mount it performs an immediate check so the UI is current.
 *
 * Offline-first:
 *   - Welcome payload fetched from offlineWelcomeCache first.
 *   - When online + status changes to in_progress or landed, calls
 *     cacheWelcomePayload and writes result to localStorage.
 *   - On reconnect, replays any pending payload fetch.
 *
 * Usage:
 *   const {
 *     flightStatus, delayMinutes, welcomePayload, isLanded, isOnline
 *   } = useFlightTracking({ tripId });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { saveWelcomePayload, getWelcomePayload } from '@/offline/welcome/offlineWelcomeCache';

const POLL_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes

export function useFlightTracking({ tripId }) {
  const [isOnline,       setIsOnline]       = useState(navigator.onLine);
  const [flightStatus,   setFlightStatus]   = useState('scheduled');
  const [delayMinutes,   setDelayMinutes]   = useState(0);
  const [arrivalGate,    setArrivalGate]    = useState(null);
  const [arrivalTerminal,setArrivalTerminal]= useState(null);
  const [welcomePayload, setWelcomePayload] = useState(() => getWelcomePayload(tripId));
  const [isLoading,      setIsLoading]      = useState(false);
  const [lastPolledAt,   setLastPolledAt]   = useState(null);
  const intervalRef = useRef(null);
  const cachingRef  = useRef(false);

  const isLanded     = flightStatus === 'landed';
  const isInProgress = flightStatus === 'in_progress';
  const isDelayed    = flightStatus === 'delayed';

  // Online/offline tracking
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  /** Fetch and cache the welcome payload from the backend */
  const fetchWelcomePayload = useCallback(async () => {
    if (cachingRef.current || !tripId || !navigator.onLine) return;
    cachingRef.current = true;
    try {
      const res = await base44.functions.invoke('cacheWelcomePayload', {
        trip_id: tripId,
        trigger: 'useFlightTracking',
      });
      if (res.data?.payload) {
        saveWelcomePayload(tripId, res.data.payload);
        setWelcomePayload(res.data.payload);
      }
    } catch (_) {
      // Network failed — cached value (if any) will be used
    } finally {
      cachingRef.current = false;
    }
  }, [tripId]);

  /** Poll the TravelRequest for the latest flight status */
  const pollStatus = useCallback(async () => {
    if (!tripId || !navigator.onLine) return;
    setIsLoading(true);
    try {
      const trip = await base44.entities.TravelRequest.get(tripId);
      if (!trip) return;

      const prev = flightStatus;
      setFlightStatus(trip.flight_status  || 'scheduled');
      setDelayMinutes(trip.delay_minutes  || 0);
      setArrivalGate(trip.arrival_gate    || null);
      setArrivalTerminal(trip.arrival_terminal || null);
      setLastPolledAt(new Date().toISOString());

      // Pre-cache welcome when flight is active or has landed
      const shouldCache =
        (trip.flight_status === 'in_progress' || trip.flight_status === 'landed') &&
        !getWelcomePayload(tripId);

      if (shouldCache) {
        await fetchWelcomePayload();
      }

      // If we already have a cached payload update the status field so WelcomeScreen
      // reflects the latest arrival info (gate, terminal)
      if (trip.flight_status === 'landed' || trip.flight_status === 'in_progress') {
        const existing = getWelcomePayload(tripId);
        if (existing) {
          const updated = {
            ...existing,
            flight_status:    trip.flight_status,
            arrival_gate:     trip.arrival_gate     || existing.arrival_gate,
            arrival_terminal: trip.arrival_terminal || existing.arrival_terminal,
          };
          saveWelcomePayload(tripId, updated);
          setWelcomePayload(updated);
        }
      }
    } catch (_) {
      // Poll failed — use last known state
    } finally {
      setIsLoading(false);
    }
  }, [tripId, flightStatus, fetchWelcomePayload]);

  // Immediate poll on mount, then every 5 min
  useEffect(() => {
    if (!tripId) return;
    pollStatus();
    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [tripId]);               // eslint-disable-line react-hooks/exhaustive-deps

  // Re-poll when connectivity returns
  useEffect(() => {
    if (isOnline) pollStatus();
  }, [isOnline]);             // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isOnline,
    flightStatus,
    delayMinutes,
    arrivalGate,
    arrivalTerminal,
    welcomePayload,
    isLanded,
    isInProgress,
    isDelayed,
    isLoading,
    lastPolledAt,
    refetch: pollStatus,
    prefetchWelcome: fetchWelcomePayload,
  };
}
