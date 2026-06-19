/**
 * useOfflineSOS — React hook for wilderness offline SOS flow.
 *
 * Browser limitations acknowledged:
 * - GPS works without internet (uses hardware).
 * - SMS can only open the SMS app with pre-filled text; cannot send silently.
 * - When internet returns, packet is synced via triggerSOS backend function.
 * - App cannot transmit through a true cellular void; SMS requires cellular signal.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  buildSosPacket,
  packetToSmsPayload,
  enqueuePacket,
  getUnsynced,
  markSynced,
  buildSmsDeepLink,
  getTwilioNumber,
} from './offlineSosPacket';

export function useOfflineSOS({
  caseId = '',
  userId = '',
  userEmail = '',
  activitySessionId = '',
  activityType = 'unknown',
  medicalCode = '',
  onSynced = null,
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsState, setGpsState] = useState('idle'); // idle | capturing | captured | failed
  const [gpsCoords, setGpsCoords] = useState(null); // { latitude, longitude, accuracy }
  const [packet, setPacket] = useState(null);
  const [smsPayload, setSmsPayload] = useState('');
  const [smsLink, setSmsLink] = useState('');
  const [sosState, setSosState] = useState('idle'); // idle | capturing_gps | ready | syncing | synced | error
  const [errorMsg, setErrorMsg] = useState('');
  const [hasTwilioNumber] = useState(!!getTwilioNumber());
  const syncingRef = useRef(false);

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // When internet returns, attempt to sync any queued packets
  useEffect(() => {
    if (isOnline) {
      syncQueuedPackets();
    }
  }, [isOnline]);

  const captureGPS = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS not available on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        (err) => {
          // Still resolve with null so flow continues without GPS
          resolve(null);
        },
        { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    });
  }, []);

  const triggerOfflineSOS = useCallback(async () => {
    setSosState('capturing_gps');
    setErrorMsg('');

    let coords = null;
    try {
      setGpsState('capturing');
      coords = await captureGPS();
      if (coords) {
        setGpsState('captured');
        setGpsCoords(coords);
      } else {
        setGpsState('failed');
      }
    } catch (_) {
      setGpsState('failed');
    }

    const p = buildSosPacket({
      caseId,
      userId,
      userEmail,
      activitySessionId,
      activityType,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      accuracyMeters: coords?.accuracy ?? null,
      medicalCode,
      emergencyType: 'wilderness_injury',
    });

    const payload = packetToSmsPayload(p);
    const link = buildSmsDeepLink(payload);

    setPacket(p);
    setSmsPayload(payload);
    setSmsLink(link);
    enqueuePacket(p);

    setSosState('ready');

    // If online right now, try immediate sync
    if (navigator.onLine) {
      await syncPacket(p);
    }

    return p;
  }, [caseId, userId, userEmail, activitySessionId, activityType, medicalCode, captureGPS]);

  const syncPacket = useCallback(async (p) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSosState('syncing');
    try {
      await base44.functions.invoke('triggerSOS', {
        trigger_type: 'wilderness_injury',
        case_id: p.case_ref !== 'NOCASE' ? caseId : '',
        patient_email: userEmail,
        patient_name: '',
        latitude: p.latitude,
        longitude: p.longitude,
        location_label: p.latitude ? `GPS: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` : 'Unknown',
        activity_type: p.activity_type,
        offline_packet_id: p.packet_id,
        emergency_type: p.emergency_type,
        activity_session_id: p.activity_session_id,
      });
      markSynced(p.packet_id);
      setSosState('synced');
      if (onSynced) onSynced(p);
    } catch (e) {
      setSosState('error');
      setErrorMsg('Sync failed. Keep the SMS option ready.');
    } finally {
      syncingRef.current = false;
    }
  }, [caseId, userEmail, onSynced]);

  const syncQueuedPackets = useCallback(async () => {
    const unsynced = getUnsynced();
    for (const p of unsynced) {
      if (!syncingRef.current) {
        await syncPacket(p);
      }
    }
  }, [syncPacket]);

  const copyPayload = useCallback(() => {
    if (smsPayload) {
      navigator.clipboard.writeText(smsPayload).catch(() => {});
    }
  }, [smsPayload]);

  return {
    isOnline,
    gpsState,
    gpsCoords,
    packet,
    smsPayload,
    smsLink,
    sosState,
    errorMsg,
    hasTwilioNumber,
    triggerOfflineSOS,
    copyPayload,
    syncQueuedPackets,
  };
}