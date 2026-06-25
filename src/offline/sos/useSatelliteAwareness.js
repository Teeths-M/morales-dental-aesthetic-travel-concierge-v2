/**
 * useSatelliteAwareness
 *
 * Detects whether the user's device likely supports Emergency SOS via Satellite
 * (iPhone 14+ running iOS 16+, or select Android 14+ devices with SatelliteManager).
 *
 * Browser limitation: Web apps cannot invoke satellite communication programmatically.
 * What we CAN do:
 *  1. Detect likely capability
 *  2. Build a pre-formatted emergency message the patient copies into the system satellite UI
 *  3. Show exact step-by-step instructions per platform
 *
 * @param {object} packet — offlineSosPacket built by buildSosPacket()
 */

import { useMemo } from 'react';

function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  // iOS version extraction
  const iosMatch = ua.match(/OS (\d+)_(\d+)/);
  const iosMajor = iosMatch ? parseInt(iosMatch[1], 10) : 0;

  // Android version extraction
  const androidMatch = ua.match(/Android (\d+)/);
  const androidMajor = androidMatch ? parseInt(androidMatch[1], 10) : 0;

  return { isIOS, isAndroid, iosMajor, androidMajor };
}

export function useSatelliteAwareness(packet) {
  const { isIOS, isAndroid, iosMajor, androidMajor } = useMemo(detectPlatform, []);

  // iPhone 14+/iOS 16+ has Emergency SOS via Satellite built in
  const iOSSatelliteSupported = isIOS && iosMajor >= 16;
  // Android satellite via SatelliteManager — Android 14+ select devices (Pixel 9 series)
  const androidSatelliteSupported = isAndroid && androidMajor >= 14;

  const isSupported = iOSSatelliteSupported || androidSatelliteSupported;
  const platform = iOSSatelliteSupported ? 'ios' : androidSatelliteSupported ? 'android' : null;

  // Build a compact satellite message from the packet
  const satelliteMessage = useMemo(() => {
    if (!packet) return '';
    const lat = packet.latitude != null ? packet.latitude.toFixed(5) : '?';
    const lng = packet.longitude != null ? packet.longitude.toFixed(5) : '?';
    const parts = [
      'MORALES MEDICAL EMERGENCY',
      `Patient: ${packet.user_ref || 'UNKNOWN'}`,
      `Case: ${packet.case_ref || 'UNKNOWN'}`,
      `GPS: ${lat}, ${lng}`,
      `Type: ${packet.emergency_type?.replace(/_/g, ' ').toUpperCase() || 'EMERGENCY'}`,
    ];
    if (packet.medical_code) parts.push(`Medical: ${packet.medical_code}`);
    parts.push(`ID: ${packet.packet_id}`);
    return parts.join('\n');
  }, [packet]);

  const instructions = useMemo(() => {
    if (platform === 'ios') return [
      'Hold the Side button + Volume button for 5 seconds until the Emergency SOS slider appears.',
      'Drag the "Emergency SOS via Satellite" slider.',
      'Follow the on-screen arrows to point your iPhone at the sky.',
      'When prompted to describe your emergency, paste the message below.',
      'Apple relays this to emergency services and to your emergency contacts.',
    ];
    if (platform === 'android') return [
      'Hold the Power button for 3 seconds.',
      'Tap "Emergency SOS" in the power menu.',
      'Select "Send via Satellite" if available.',
      'Paste the message below into the emergency description field.',
      'Point the device at the open sky for best signal.',
    ];
    return [
      'Satellite emergency SOS is not detected on this device.',
      'Use SMS, WhatsApp, or the QR code option instead.',
      'If you have a Garmin inReach, Spot, or Zoleo, copy the message and send it manually.',
    ];
  }, [platform]);

  return {
    isSupported,
    platform,
    satelliteMessage,
    instructions,
  };
}
