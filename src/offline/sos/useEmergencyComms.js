/**
 * useEmergencyComms
 *
 * Unified Emergency Communications Cascade for Morales Safe-T4life™.
 *
 * Tries channels in priority order:
 *   1. Internet API     → triggerSOS backend (online only)
 *   2. Web Share API    → system share sheet (SMS, WhatsApp, Signal, etc.)
 *   3. SMS deeplink     → sms: URI, pre-filled body
 *   4. Bluetooth BLE    → paired goTenna/inReach/Zoleo
 *   5. Satellite UI     → iOS 16+/Android 14+ satellite instructions
 *   6. QR code          → visual beacon for someone with connectivity to scan
 *
 * Each channel is independent — triggering one does not block others.
 * All channels that can fire simultaneously DO fire simultaneously on "Send All".
 */

import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  buildSosPacket,
  packetToSmsPayload,
  buildSmsDeepLink,
  enqueuePacket,
  markSynced,
} from './offlineSosPacket';
import { useSatelliteAwareness } from './useSatelliteAwareness';
import { useWebBluetooth } from './useWebBluetooth';

export function useEmergencyComms({
  caseId = '',
  userId = '',
  userEmail = '',
  activitySessionId = '',
  activityType = 'unknown',
  medicalCode = '',
}) {
  const [packet, setPacket]               = useState(null);
  const [gpsState, setGpsState]           = useState('idle');
  const [channelStatus, setChannelStatus] = useState({
    internet:  'idle', // idle|sending|sent|failed
    share:     'idle',
    sms:       'idle',
    bluetooth: 'idle',
    satellite: 'idle',
    qr:        'idle',
  });
  const [qrDataUrl, setQrDataUrl]         = useState(null);
  const [smsLink, setSmsLink]             = useState('');
  const [smsPayload, setSmsPayload]       = useState('');
  const [cascadeActive, setCascadeActive] = useState(false);

  const satellite = useSatelliteAwareness(packet);
  const bluetooth = useWebBluetooth();

  const setChannel = (ch, status) =>
    setChannelStatus(prev => ({ ...prev, [ch]: status }));

  // ── Step 1: Capture GPS ─────────────────────────────────────────────────
  const captureGPS = useCallback(() =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    }), []);

  // ── Step 2: Build packet ────────────────────────────────────────────────
  const buildPacket = useCallback(async () => {
    setGpsState('capturing');
    const coords = await captureGPS();
    if (coords) setGpsState('captured'); else setGpsState('failed');

    const p = buildSosPacket({
      caseId, userId, userEmail, activitySessionId, activityType,
      latitude:       coords?.latitude    ?? null,
      longitude:      coords?.longitude   ?? null,
      accuracyMeters: coords?.accuracy    ?? null,
      medicalCode,
      emergencyType: 'emergency',
    });
    enqueuePacket(p);

    const payload = packetToSmsPayload(p);
    const link    = buildSmsDeepLink(payload);
    setSmsPayload(payload);
    setSmsLink(link);
    setPacket(p);
    return { p, payload, link };
  }, [caseId, userId, userEmail, activitySessionId, activityType, medicalCode, captureGPS]);

  // ── Channel: Internet API ───────────────────────────────────────────────
  const trySendInternet = useCallback(async (p) => {
    if (!navigator.onLine) { setChannel('internet', 'failed'); return; }
    setChannel('internet', 'sending');
    try {
      await base44.functions.invoke('triggerSOS', {
        trigger_type: p.emergency_type,
        case_id: caseId,
        patient_email: userEmail,
        latitude: p.latitude,
        longitude: p.longitude,
        location_label: p.latitude ? `GPS: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` : 'Unknown',
        activity_type: p.activity_type,
        offline_packet_id: p.packet_id,
      });
      markSynced(p.packet_id);
      setChannel('internet', 'sent');
    } catch (_) {
      setChannel('internet', 'failed');
    }
  }, [caseId, userEmail]);

  // ── Channel: Web Share API ──────────────────────────────────────────────
  const tryWebShare = useCallback(async (payload) => {
    if (!navigator.share) { setChannel('share', 'failed'); return; }
    setChannel('share', 'sending');
    try {
      await navigator.share({
        title: '🆘 MORALES EMERGENCY SOS',
        text: payload,
      });
      setChannel('share', 'sent');
    } catch (e) {
      // User cancelled — not a failure
      setChannel('share', e.name === 'AbortError' ? 'idle' : 'failed');
    }
  }, []);

  // ── Channel: SMS deeplink ───────────────────────────────────────────────
  const openSmsLink = useCallback((link) => {
    setChannel('sms', 'sending');
    window.location.href = link;
    setTimeout(() => setChannel('sms', 'sent'), 1500);
  }, []);

  // ── Channel: Bluetooth BLE ──────────────────────────────────────────────
  const tryBluetooth = useCallback(async (payload) => {
    setChannel('bluetooth', 'sending');
    let connected = bluetooth.status === 'connected';
    if (!connected) connected = await bluetooth.connect();
    if (!connected) { setChannel('bluetooth', 'failed'); return; }
    const ok = await bluetooth.sendPacket(payload);
    setChannel('bluetooth', ok ? 'sent' : 'failed');
  }, [bluetooth]);

  // ── Channel: QR Code (public API — no npm package needed) ─────────────
  const generateQr = useCallback(async (payload) => {
    setChannel('qr', 'sending');
    try {
      // qrserver.com is a free public API — works offline if response is cached
      const encoded = encodeURIComponent(payload);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=2&data=${encoded}`;
      // Pre-fetch and convert to data URL so it survives offline display
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setQrDataUrl(dataUrl);
      setChannel('qr', 'sent');
    } catch (_) {
      // Fallback: use direct URL (requires internet to display)
      const encoded = encodeURIComponent(payload);
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=2&data=${encoded}`);
      setChannel('qr', 'sent');
    }
  }, []);

  // ── MAIN: Trigger cascade ───────────────────────────────────────────────
  const triggerCascade = useCallback(async () => {
    setCascadeActive(true);

    const { p, payload, link } = await buildPacket();

    // Fire all available channels simultaneously
    const tasks = [
      trySendInternet(p),
      generateQr(payload),
    ];

    // Web Share — requires user gesture, fire after slight delay
    if (navigator.share) tasks.push(tryWebShare(payload));

    await Promise.allSettled(tasks);

    // SMS and Satellite are manual (require user tap) — mark as available
    if (link) setChannel('sms', 'idle');
    if (satellite.isSupported) setChannel('satellite', 'idle');
  }, [buildPacket, trySendInternet, tryWebShare, generateQr, satellite.isSupported]);

  return {
    // State
    packet,
    gpsState,
    channelStatus,
    qrDataUrl,
    smsLink,
    smsPayload,
    cascadeActive,
    // Satellite
    satellite,
    // Bluetooth
    bluetooth,
    // Actions
    triggerCascade,
    openSmsLink,
    tryBluetooth,
  };
}
