import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  enqueueHandshake,
  buildHandshakePacket,
  flushHandshakeQueue,
  HANDSHAKE_TYPES,
} from '@/offline/handshake/offlineHandshakeQueue';

const GOLD = '#D4AF37';

const HANDSHAKE_LABELS = [
  null, // index 0 unused
  'My Driver Has Arrived — Confirm Pickup',
  'I\'m at the Airport — Confirm Drop-off',
  'Arrived at Destination Airport',
  'Confirm Hotel Check-In',
  'Clinic Check-In',
  'Confirm Companion Meal Delivery',
  'Confirm Return Transport',
  'Arrived at Home Airport',
  'I\'m Safely Home',
];

// Human-friendly "what happens next" shown after each confirmation
const NEXT_STEP_HINTS = [
  null,
  'Next: airport drop-off when you arrive.',        // after HS1
  'Next: your Morales team meets you at arrivals.', // after HS2
  'Next: hotel check-in — rest up!',                // after HS3
  'Next: clinic visit — your doctor is ready.',     // after HS4
  'Next: companion delivery — recovery begins.',    // after HS5
  'Next: return transport — heading home!',         // after HS6
  'Next: home airport arrival.',                    // after HS7
  'Next: home drop-off — almost there!',            // after HS8
  null,                                             // HS9 = complete
];

// HANDSHAKE_TYPES now comes from offlineHandshakeQueue so the queue writer and
// the queue flusher can never drift apart — a mismatch there produced packets
// the server rejects as "must be 1-9", stuck in the queue forever.

/**
 * HandshakeButton
 *
 * Props:
 *   tripId      — TravelRequest.id
 *   caseId      — CaseRecord.id (optional, for audit)
 *   currentStep — 0-9 (last completed step)
 *   user        — auth user object { id, email, full_name }
 *   onComplete  — callback({ current_step, is_complete })
 *   shortcode   — Twilio shortcode number string (optional, shown in SMS fallback)
 */
export default function HandshakeButton({ tripId, caseId, currentStep = 0, user, onComplete, shortcode }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const nextStep = currentStep + 1;
  const isDone = currentStep >= 9;
  const label = isDone ? 'Journey Complete — The Golden M is Yours' : (HANDSHAKE_LABELS[nextStep] || '');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function getGps() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      const timer = setTimeout(() => resolve(null), 2500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy });
        },
        () => { clearTimeout(timer); resolve(null); }
      );
    });
  }

  // Flushing now lives in offlineHandshakeQueue.flushHandshakeQueue, shared
  // with the global reconnect listener registered in AppLayout. The private
  // copy that used to live here was only ever reachable from inside handleTap.

  async function handleTap() {
    if (isDone || loading) return;
    setLoading(true);
    try {
      const gps = await getGps();

      if (!navigator.onLine) {
        // Offline path: enqueue and show SMS fallback instruction
        const packet = buildHandshakePacket({
          checkpointId:    `LOCAL_HS${nextStep}`,
          tripId:          tripId || '',
          caseId:          caseId || '',
          handshakeType:   HANDSHAKE_TYPES[nextStep] || 'driver_pickup',
          confirmedBy:     user?.id || '',
          confirmedByName: user?.full_name || user?.email || '',
          gpsLat:          gps?.lat    ?? null,
          gpsLng:          gps?.lng    ?? null,
          gpsAccuracyM:    gps?.accuracy_m ?? null,
          method:          'web',
        });
        enqueueHandshake(packet);
        showToast(`Saved! We'll confirm this step when you reconnect. ${NEXT_STEP_HINTS[nextStep] || ''}`, 'queued');
      } else {
        // Sync any previously queued handshakes first
        await flushHandshakeQueue(base44).catch(() => {});

        const result = await base44.functions.invoke('completeHandshake', {
          trip_id:          tripId,
          handshake_number: nextStep,
          gps_location:     gps,
          trigger_method:   'app',
        });

        const data = result?.data ?? result;
        if (!data?.success) throw new Error(data?.error || 'Confirmation failed');

        showToast(
          data.is_complete
            ? '🏆 You made it! Welcome home — The Golden M is yours!'
            : `✅ Confirmed! ${NEXT_STEP_HINTS[nextStep] || 'Your journey continues.'}`
        );
        onComplete?.({ current_step: data.current_step, is_complete: data.is_complete });
      }
    } catch (e) {
      showToast(e.message || 'Could not confirm handshake. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleTap}
        disabled={isDone || loading}
        className="w-full rounded-2xl py-4 px-6 font-semibold text-base transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-default min-h-[52px]"
        style={{
          background: isDone ? GOLD : loading ? '#a07c20' : GOLD,
          color: '#060B16',
          fontSize: 15,
          letterSpacing: '-0.01em',
          boxShadow: isDone ? 'none' : '0 4px 20px rgba(212,175,55,0.35)',
        }}
      >
        {loading ? 'Confirming…' : label}
      </button>

      {!isDone && shortcode && (
        <p className="text-center text-xs" style={{ color: '#64748b' }}>
          Or text <span className="font-semibold" style={{ color: GOLD }}>HS{nextStep} {tripId}</span> to {shortcode}
        </p>
      )}

      {toast && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium text-center"
          style={{
            background: toast.type === 'error' ? '#1a0a0a' : toast.type === 'queued' ? '#0C1A1D' : '#0a1a0a',
            border: `1px solid ${toast.type === 'error' ? '#7f1d1d' : toast.type === 'queued' ? '#2A3F4A' : '#14532d'}`,
            color: toast.type === 'error' ? '#fca5a5' : toast.type === 'queued' ? '#94a3b8' : '#86efac',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
