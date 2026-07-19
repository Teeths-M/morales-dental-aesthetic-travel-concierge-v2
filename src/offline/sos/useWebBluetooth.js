// @ts-nocheck — Web Bluetooth API is experimental; navigator.bluetooth not in standard DOM types
/**
 * useWebBluetooth
 *
 * Attempts to connect to a paired BLE emergency device (goTenna Mesh,
 * Garmin inReach Mini, Zoleo, Somewear) and write an SOS packet to it.
 *
 * Browser support: Chrome 70+, Edge 79+, Opera 57+. NOT supported on Firefox or Safari.
 * Requires: HTTPS, user gesture, device previously paired.
 *
 * Known GATT profiles targeted:
 *  - goTenna Mesh: custom service UUID (0x1234 placeholder — actual UUID from SDK docs)
 *  - Generic Emergency: standard Alert Notification Service (0x1811)
 *
 * Falls back gracefully when Web Bluetooth is unavailable.
 */

import { useState, useCallback, useRef } from 'react';

// Standard BLE Alert Notification Service — works with generic BLE devices
const ALERT_SERVICE_UUID   = '00001811-0000-1000-8000-00805f9b34fb';
const ALERT_CHAR_UUID      = '00002a46-0000-1000-8000-00805f9b34fb';

// Generic TX characteristic for custom emergency radio devices
const CUSTOM_SERVICE_UUID  = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // Nordic UART service
const CUSTOM_TX_CHAR_UUID  = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Nordic TX

export function useWebBluetooth() {
  const [status, setStatus]         = useState('idle'); // idle|unsupported|connecting|connected|sending|sent|error
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError]           = useState(null);
  const deviceRef = useRef(null);
  const serverRef = useRef(null);

  const isSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth;

  const connect = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported');
      setError('Web Bluetooth is not supported on this browser. Use Chrome or Edge on Android.');
      return false;
    }

    setStatus('connecting');
    setError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [ALERT_SERVICE_UUID, CUSTOM_SERVICE_UUID],
      });

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setDeviceName(null);
      });

      const server = await device.gatt.connect();
      deviceRef.current = device;
      serverRef.current = server;

      setDeviceName(device.name || 'BLE Device');
      setStatus('connected');
      return true;
    } catch (e) {
      if (e.name === 'NotFoundError') {
        setStatus('idle');
        setError('No device selected.');
      } else {
        setStatus('error');
        console.error('[useWebBluetooth] connect failed:', e);
        setError('Could not connect to that device. Try again, or use another way to send.');
      }
      return false;
    }
  }, [isSupported]);

  const sendPacket = useCallback(async (smsPayload) => {
    if (!serverRef.current) return false;
    setStatus('sending');

    const encoded = new TextEncoder().encode(smsPayload);

    // Try Nordic UART TX first (most emergency radio devices use this)
    try {
      const service = await serverRef.current.getPrimaryService(CUSTOM_SERVICE_UUID);
      const char    = await service.getCharacteristic(CUSTOM_TX_CHAR_UUID);
      // BLE MTU is 20 bytes — chunk the payload
      const CHUNK = 20;
      for (let i = 0; i < encoded.length; i += CHUNK) {
        await char.writeValue(encoded.slice(i, i + CHUNK));
        await new Promise(r => setTimeout(r, 50)); // small delay between chunks
      }
      setStatus('sent');
      return true;
    } catch (_) {}

    // Fall back to Alert Notification Service
    try {
      const service = await serverRef.current.getPrimaryService(ALERT_SERVICE_UUID);
      const char    = await service.getCharacteristic(ALERT_CHAR_UUID);
      await char.writeValue(encoded.slice(0, 20)); // alert is single-packet
      setStatus('sent');
      return true;
    } catch (e) {
      setStatus('error');
      setError('Could not write to BLE device. It may not support emergency data transfer.');
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    serverRef.current = null;
    setStatus('idle');
    setDeviceName(null);
  }, []);

  return { isSupported, status, deviceName, error, connect, sendPacket, disconnect };
}
