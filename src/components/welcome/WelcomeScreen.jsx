import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Wifi, WifiOff, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import HandshakeTapButton from '@/components/handshake/HandshakeTapButton';
import { useFlightTracking } from '@/hooks/useFlightTracking';

// ── STUB: Call Concierge routing ───────────────────────────────────────────────
// TO ACTIVATE WITH LIVE TWILIO VOICE:
//   1. Set MORALES_LOCAL_CONCIERGE_NUMBERS in Base44 env (JSON map country→number)
//      e.g. { "TH": "+6621234567", "MX": "+525512345678" }
//   2. Replace the tel: link below with a Twilio Programmable Voice API call
//      that routes to the correct local number for the destination country.
//   3. Alternatively, use Twilio Flex to route to an on-call agent.
function buildCallLink(conciergePhone) {
  if (!conciergePhone) return null;
  return `tel:${conciergePhone}`;
}

const STATUS_LABELS = {
  scheduled:   { label: 'On Schedule',  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  delayed:     { label: 'Delayed',      color: 'text-amber-600',  bg: 'bg-amber-50'  },
  in_progress: { label: 'In the Air',   color: 'text-violet-600', bg: 'bg-violet-50' },
  landed:      { label: 'Landed',       color: 'text-emerald-600',bg: 'bg-emerald-50'},
  cancelled:   { label: 'Cancelled',    color: 'text-red-600',    bg: 'bg-red-50'    },
  unknown:     { label: 'Status TBD',   color: 'text-slate-400',  bg: 'bg-slate-50'  },
};

/**
 * WelcomeScreen
 *
 * Displayed when the patient's flight lands (or from the Morales app
 * during arrival). Shows:
 *   - Localized greeting pre-cached in offlineWelcomeCache
 *   - Flight status + gate/terminal info
 *   - Driver card with photo
 *   - "Call Concierge" (stub Twilio routing)
 *   - HandshakeTapButton (Task 1) for driver pickup confirmation
 *
 * Props:
 *   tripId          string  — TravelRequest ID
 *   pickupCheckpointId string — HS_XXXXX from confirmHandshake.create
 *   userId          string
 *   userName        string
 */
export default function WelcomeScreen({
  tripId,
  pickupCheckpointId,
  userId,
  userName,
}) {
  const {
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
    refetch,
  } = useFlightTracking({ tripId });

  const [showCulturalNote, setShowCulturalNote] = useState(false);

  const status      = STATUS_LABELS[flightStatus] || STATUS_LABELS.unknown;
  const callLink    = buildCallLink(welcomePayload?.concierge_phone);
  const gate        = arrivalGate    || welcomePayload?.arrival_gate    || null;
  const terminal    = arrivalTerminal|| welcomePayload?.arrival_terminal|| null;
  const driverName  = welcomePayload?.driver_name    || 'your driver';
  const driverPhoto = welcomePayload?.driver_photo_url || null;
  const greeting    = welcomePayload?.greeting        || null;
  const driverLine  = welcomePayload?.driver_line     || null;
  const culturalNote= welcomePayload?.cultural_note   || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Morales Concierge
        </div>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          isOnline ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline — cached data'}
        </div>
      </div>

      <div className="px-5 pb-10 space-y-5 max-w-md mx-auto">
        {/* Flight status pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isInProgress || isLanded ? 'animate-pulse' : ''} bg-current`} />
          {status.label}
          {isDelayed && delayMinutes > 0 && ` · +${delayMinutes} min`}
        </div>

        {/* Gate / terminal */}
        {(gate || terminal) && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {terminal && <span>Terminal {terminal}</span>}
            {terminal && gate && <span className="text-slate-600">·</span>}
            {gate && <span>Gate {gate}</span>}
          </div>
        )}

        {/* Greeting */}
        <AnimatePresence mode="wait">
          {greeting ? (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <h1 className="text-2xl font-semibold leading-snug text-white">
                {greeting}
              </h1>
              {driverLine && (
                <p className="text-slate-300 text-sm leading-relaxed">{driverLine}</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="h-7 bg-slate-700 rounded-xl w-3/4 animate-pulse" />
              <div className="h-5 bg-slate-700 rounded-xl w-full animate-pulse" />
              <div className="h-5 bg-slate-700 rounded-xl w-2/3 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cultural note (collapsible) */}
        {culturalNote && (
          <button
            onClick={() => setShowCulturalNote(v => !v)}
            className="flex items-start gap-2 text-left w-full"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-amber-400">
                Cultural greeting note {showCulturalNote ? '▲' : '▼'}
              </span>
              <AnimatePresence>
                {showCulturalNote && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="text-xs text-slate-400 mt-1 leading-relaxed overflow-hidden"
                  >
                    {culturalNote}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </button>
        )}

        {/* Driver card */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
          {driverPhoto ? (
            <img
              src={driverPhoto}
              alt={driverName}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-600 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚗</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your Driver</p>
            <p className="font-semibold text-white text-base truncate">{driverName}</p>
            <p className="text-xs text-slate-400 mt-0.5">Waiting at the arrivals exit</p>
          </div>
        </div>

        {/* Call Concierge */}
        {callLink ? (
          <a
            href={callLink}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 font-semibold text-white transition-colors"
          >
            <Phone className="w-5 h-5" />
            Call Concierge
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-slate-700 text-slate-400 font-semibold text-sm">
            <Phone className="w-5 h-5" />
            {/* STUB — concierge phone not configured for this destination */}
            Call Concierge (Contact coordinator for number)
          </div>
        )}

        {/* Tap-to-handshake — Task 1 component reused directly */}
        {pickupCheckpointId && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Confirm Driver Pickup
            </p>
            <HandshakeTapButton
              checkpointId={pickupCheckpointId}
              tripId={tripId}
              handshakeType="driver_pickup"
              userId={userId}
              userName={userName}
              initialStatus="pending"
            />
          </div>
        )}

        {/* Footer: cache status + manual refresh */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 pt-2">
          <span>
            {welcomePayload?.cached_at
              ? `Cached ${new Date(welcomePayload.cached_at).toLocaleTimeString([], { timeStyle: 'short' })}`
              : 'Not yet cached'}
          </span>
          <button
            onClick={refetch}
            disabled={isLoading || !isOnline}
            className="flex items-center gap-1 disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {lastPolledAt ? 'Refresh' : 'Check status'}
          </button>
        </div>
      </div>
    </div>
  );
}
