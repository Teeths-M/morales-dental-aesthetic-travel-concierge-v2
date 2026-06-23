import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff, MapPin, RefreshCw } from 'lucide-react';
import { useHandshakeTap } from '@/offline/handshake/useHandshakeTap';
import { packetToSmsPayload } from '@/offline/handshake/offlineHandshakeQueue';

const TYPE_LABELS = {
  driver_pickup:      'Driver Pickup',
  airport_dropoff:    'Airport Drop-off',
  hotel_checkin:      'Hotel Check-in',
  clinic_arrival:     'Clinic Arrival',
  clinic_departure:   'Clinic Departure',
  airport_checkin:    'Airport Check-in',
  airport_boarding:   'Airport Boarding',
  hotel_checkout:     'Hotel Check-out',
  recovery_handoff:   'Recovery Handoff',
};

/**
 * HandshakeTapButton
 *
 * Standalone tap-to-confirm button for a transport handshake checkpoint.
 * Handles offline-first via useHandshakeTap; shows GPS status, SMS fallback,
 * and timeout state.
 *
 * Props:
 *   checkpointId  string  — HS_XXXXX from the backend (confirmHandshake create)
 *   tripId        string
 *   caseId        string
 *   handshakeType string  — e.g. 'driver_pickup'
 *   userId        string
 *   userName      string
 *   initialStatus string  — 'pending' | 'confirmed' | 'timeout' (from server record)
 *   onConfirmed   fn      — optional callback
 */
export default function HandshakeTapButton({
  checkpointId,
  tripId,
  caseId,
  handshakeType = 'driver_pickup',
  userId,
  userName,
  initialStatus = 'pending',
  onConfirmed,
}) {
  const { isOnline, gpsState, confirmState, errorMsg, lastPacket, tap } = useHandshakeTap({
    checkpointId, tripId, caseId, handshakeType,
    userId, userName, onConfirmed,
  });

  const label        = TYPE_LABELS[handshakeType] || handshakeType.replace(/_/g, ' ');
  const smsPayload   = lastPacket ? packetToSmsPayload(lastPacket) : `HANDSHAKE ${checkpointId}`;
  const isConfirmed  = confirmState === 'confirmed' || initialStatus === 'confirmed';
  const isTimedOut   = initialStatus === 'timeout' || initialStatus === 'escalated';
  const isPending    = !isConfirmed && !isTimedOut;
  const isSyncing    = confirmState === 'syncing';
  const isCapturing  = confirmState === 'capturing_gps';

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Handshake</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{label}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isConfirmed ? 'bg-emerald-100 text-emerald-700'
          : isTimedOut ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
        }`}>
          {isConfirmed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {isConfirmed ? 'Confirmed' : isTimedOut ? 'Timed Out' : 'Pending'}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Checkpoint ID */}
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg flex-1 truncate">
            {checkpointId || '—'}
          </code>
          {/* Connectivity badge */}
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
            isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* GPS status (shown while capturing or after) */}
        {(gpsState === 'capturing' || gpsState === 'captured' || gpsState === 'failed') && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
            gpsState === 'captured' ? 'bg-blue-50 text-blue-700'
            : gpsState === 'failed' ? 'bg-slate-50 text-slate-500'
            : 'bg-blue-50 text-blue-600 animate-pulse'
          }`}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {gpsState === 'capturing' ? 'Acquiring GPS location…'
              : gpsState === 'captured' ? 'GPS captured — location logged'
              : 'GPS unavailable — proceeding without coordinates'}
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{errorMsg}</p>
          </div>
        )}

        {/* Main action button */}
        {isPending && (
          <AnimatePresence mode="wait">
            {isConfirmed ? null : (
              <motion.button
                key="tap-btn"
                onClick={tap}
                disabled={isCapturing || isSyncing}
                whileTap={{ scale: 0.96 }}
                className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all shadow-lg
                  ${isCapturing || isSyncing
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 active:scale-95'
                  }`}
              >
                {isCapturing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Capturing GPS…
                  </span>
                ) : isSyncing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Confirming…
                  </span>
                ) : (
                  <>
                    <span className="text-2xl mr-2">👋</span>
                    Tap to Confirm {label}
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        )}

        {/* Confirmed state */}
        {isConfirmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <p className="font-bold text-emerald-700 text-sm">Handshake Confirmed</p>
            {!isOnline && (
              <p className="text-xs text-slate-500 text-center">
                Saved offline — will sync to server when you reconnect.
              </p>
            )}
          </motion.div>
        )}

        {/* Timed-out state */}
        {isTimedOut && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="font-bold text-red-700 text-sm">Handshake Timed Out</p>
            <p className="text-xs text-slate-500 max-w-xs">
              This checkpoint was not confirmed within 15 minutes. A replacement driver has been dispatched.
            </p>
          </div>
        )}

        {/* SMS fallback — shown when offline or as secondary option when pending */}
        {isPending && !isConfirmed && (
          <div className="border-t pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              SMS Fallback (if offline or button fails)
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-100 text-slate-700 font-mono text-xs px-3 py-2 rounded-xl truncate">
                {smsPayload}
              </code>
              <a
                href={`sms:?body=${encodeURIComponent(smsPayload)}`}
                className="flex-shrink-0 px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                SMS
              </a>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Send this text to your coordinator's shortcode number to confirm without internet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
