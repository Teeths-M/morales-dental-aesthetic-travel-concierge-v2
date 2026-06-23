/**
 * useHandshakeTap
 * React hook for in-app tap-to-confirm handshakes.
 *
 * Mirrors the useOfflineSOS pattern:
 *   1. User taps confirm.
 *   2. GPS captured (best-effort, 12 s timeout).
 *   3. Packet written to localStorage queue immediately.
 *   4. If online → sync to confirmHandshake backend.
 *   5. When connectivity returns → replay any unsynced packets.
 *
 * Usage:
 *   const { confirmState, tap, isOnline, gpsState } = useHandshakeTap({
 *     checkpointId, tripId, caseId, handshakeType,
 *     userId, userName,
 *   });
 *
 * confirmState: 'idle' | 'capturing_gps' | 'pending' | 'syncing' | 'confirmed' | 'error'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  buildHandshakePacket,
  enqueueHandshake,
  getUnsyncedHandshakes,
  markHandshakeSynced,
} from './offlineHandshakeQueue';

export function useHandshakeTap({
  checkpointId   = '',
  tripId         = '',
  caseId         = '',
  handshakeType  = 'driver_pickup',
  userId         = '',
  userName       = '',
  onConfirmed    = null,  // callback(packet)
}) {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [gpsState,      setGpsState]      = useState('idle');       // idle|capturing|captured|failed
  const [gpsCoords,     setGpsCoords]     = useState(null);
  const [confirmState,  setConfirmState]  = useState('idle');       // idle|capturing_gps|pending|syncing|confirmed|error
  const [errorMsg,      setErrorMsg]      = useState('');
  const [lastPacket,    setLastPacket]    = useState(null);
  const syncingRef = useRef(false);

  // Online/offline tracking
  useEffect(() => {
    const up   = () => { setIsOnline(true);  syncQueued(); };
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);                                         // eslint-disable-line react-hooks/exhaustive-deps

  const captureGPS = useCallback(() => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
      }),
      () => resolve(null),          // GPS unavailable — still proceed without coords
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  }), []);

  const syncPacket = useCallback(async (packet) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setConfirmState('syncing');
    try {
      await base44.functions.invoke('confirmHandshake', {
        action:             'tap_confirm',
        checkpoint_id:      packet.checkpoint_id,
        gps_lat:            packet.gps_lat,
        gps_lng:            packet.gps_lng,
        gps_accuracy_m:     packet.gps_accuracy_m,
        offline_packet_id:  packet.offline_packet_id,
      });
      markHandshakeSynced(packet.offline_packet_id);
      setConfirmState('confirmed');
      if (onConfirmed) onConfirmed(packet);
    } catch (_) {
      setConfirmState('error');
      setErrorMsg('Sync failed — confirmation is queued and will retry when online.');
    } finally {
      syncingRef.current = false;
    }
  }, [onConfirmed]);

  const syncQueued = useCallback(async () => {
    const unsynced = getUnsyncedHandshakes();
    for (const p of unsynced) {
      if (!syncingRef.current) await syncPacket(p);
    }
  }, [syncPacket]);

  /** Main action: called when the user taps the confirm button */
  const tap = useCallback(async () => {
    if (confirmState !== 'idle') return;          // no double-taps
    setConfirmState('capturing_gps');
    setErrorMsg('');

    // Capture GPS
    let coords = null;
    try {
      setGpsState('capturing');
      coords = await captureGPS();
      setGpsState(coords ? 'captured' : 'failed');
      if (coords) setGpsCoords(coords);
    } catch (_) {
      setGpsState('failed');
    }

    // Build packet and enqueue locally first (works offline)
    const packet = buildHandshakePacket({
      checkpointId,
      tripId,
      caseId,
      handshakeType,
      confirmedBy:    userId,
      confirmedByName: userName,
      gpsLat:        coords?.latitude  ?? null,
      gpsLng:        coords?.longitude ?? null,
      gpsAccuracyM:  coords?.accuracy  ?? null,
      method:        'tap',
    });

    enqueueHandshake(packet);
    setLastPacket(packet);
    setConfirmState('pending');

    // Sync immediately if online
    if (navigator.onLine) {
      await syncPacket(packet);
    }
    // If offline: confirmState stays 'pending' until connectivity returns
  }, [confirmState, checkpointId, tripId, caseId, handshakeType,
      userId, userName, captureGPS, syncPacket]);

  return {
    isOnline,
    gpsState,
    gpsCoords,
    confirmState,
    errorMsg,
    lastPacket,
    tap,
  };
}
