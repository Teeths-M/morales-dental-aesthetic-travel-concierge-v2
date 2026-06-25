/**
 * WildernessSOSPanel
 * Offline-capable SOS panel for wilderness/adventure scenarios.
 * Uses useOfflineSOS hook. Handles GPS capture, packet creation,
 * SMS deep link, and online sync.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Wifi, WifiOff, MapPin, MessageSquare,
  Copy, CheckCircle2, RefreshCw, Loader2, Navigation, Info
} from 'lucide-react';
import { useOfflineSOS } from '@/offline/sos/useOfflineSOS';
import EmergencyCommsCascade from '@/components/emergency/EmergencyCommsCascade';

const STATE_LABELS = {
  idle: '',
  capturing_gps: 'Capturing GPS…',
  ready: 'SOS Packet Ready',
  syncing: 'Syncing to Morales…',
  synced: 'SOS Received by Morales',
  error: 'Sync Failed — Use SMS',
};

export default function WildernessSOSPanel({
  caseId = '',
  userId = '',
  userEmail = '',
  activitySessionId = '',
  activityType = 'unknown',
  medicalCode = '',
}) {
  const {
    isOnline, gpsState, gpsCoords, packet, smsPayload, smsLink,
    sosState, errorMsg, hasTwilioNumber, triggerOfflineSOS, copyPayload,
  } = useOfflineSOS({ caseId, userId, userEmail, activitySessionId, activityType, medicalCode });

  const [copied, setCopied] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const handleTrigger = async () => {
    setTriggered(true);
    await triggerOfflineSOS();
  };

  const handleCopy = () => {
    copyPayload();
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isTriggering = sosState === 'capturing_gps';

  return (
    <div className="rounded-2xl border-2 border-red-500 bg-red-950/60 overflow-hidden">
      {/* Header */}
      <div className="bg-red-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
          <div>
            <p className="text-white font-black text-sm uppercase tracking-wider">Wilderness SOS</p>
            <p className="text-red-200 text-[10px]">Canopy Collapse / Wilderness Injury Protocol</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
          isOnline
            ? 'bg-emerald-900/50 border-emerald-600/50 text-emerald-300'
            : 'bg-red-900/50 border-red-600/50 text-red-300'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'OFFLINE'}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Offline notice */}
        {!isOnline && (
          <div className="bg-amber-900/40 border border-amber-600/50 rounded-xl px-4 py-3 text-xs text-amber-300">
            <p className="font-semibold mb-0.5">No internet detected</p>
            <p>Morales can still create an SOS packet with your GPS coordinates. If SMS is available, send the emergency packet by text. When internet returns, the app will sync automatically.</p>
          </div>
        )}

        {/* Main trigger button */}
        {!triggered && sosState === 'idle' && (
          <button
            onClick={handleTrigger}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg py-5 rounded-2xl transition-all shadow-lg shadow-red-900/50 flex items-center justify-center gap-3"
          >
            <AlertTriangle className="w-6 h-6" />
            EMERGENCY SOS — I NEED RESCUE
          </button>
        )}

        {/* Capturing GPS */}
        {isTriggering && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
            <div>
              <p className="text-white font-semibold text-sm">Creating SOS Packet…</p>
              <p className="text-slate-400 text-xs">Capturing GPS coordinates</p>
            </div>
          </div>
        )}

        {/* GPS status */}
        {(sosState !== 'idle' && sosState !== 'capturing_gps') && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
            gpsCoords
              ? 'bg-emerald-900/30 border-emerald-600/40'
              : 'bg-amber-900/30 border-amber-600/40'
          }`}>
            <MapPin className={`w-4 h-4 flex-shrink-0 ${gpsCoords ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div className="flex-1 min-w-0">
              {gpsCoords ? (
                <>
                  <p className="text-emerald-300 text-xs font-semibold">GPS Captured ✓</p>
                  <p className="text-emerald-400 font-mono text-xs">
                    {gpsCoords.latitude.toFixed(5)}, {gpsCoords.longitude.toFixed(5)}
                    {gpsCoords.accuracy && <span className="ml-1 text-emerald-600">±{Math.round(gpsCoords.accuracy)}m</span>}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${gpsCoords.latitude},${gpsCoords.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 text-[10px] mt-0.5 hover:underline"
                  >
                    <Navigation className="w-2.5 h-2.5" /> Open in Maps
                  </a>
                </>
              ) : (
                <>
                  <p className="text-amber-300 text-xs font-semibold">No GPS Fix</p>
                  <p className="text-amber-400 text-xs">Packet created without coordinates. Include your location in SMS if known.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* State label */}
        {STATE_LABELS[sosState] && (
          <div className={`text-center text-sm font-semibold py-1 ${
            sosState === 'synced' ? 'text-emerald-400' :
            sosState === 'error' ? 'text-red-400' :
            'text-white'
          }`}>
            {sosState === 'syncing' && <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />}
            {sosState === 'synced' && <CheckCircle2 className="w-4 h-4 inline mr-2" />}
            {STATE_LABELS[sosState]}
          </div>
        )}

        {/* Packet ID */}
        {packet && (
          <div className="bg-slate-800/60 border border-slate-600/40 rounded-xl px-4 py-2.5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">SOS Packet ID</p>
            <p className="text-white font-mono text-sm">{packet.packet_id}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Created: {new Date(packet.created_at).toLocaleTimeString()}</p>
          </div>
        )}

        {/* SMS Actions */}
        <AnimatePresence>
          {smsPayload && (sosState === 'ready' || sosState === 'error' || sosState === 'synced') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl px-4 py-3">
                <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Emergency SMS Payload</p>
                <p className="text-white font-mono text-xs break-all leading-relaxed">{smsPayload}</p>
              </div>

              {/* Primary: Open SMS app */}
              <a
                href={smsLink}
                className="flex items-center justify-center gap-2.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
                aria-label="Send SOS by SMS"
              >
                <MessageSquare className="w-5 h-5" />
                Send SOS by SMS
              </a>

              {!hasTwilioNumber && (
                <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl px-4 py-3 text-xs text-amber-300">
                  <p className="font-semibold mb-1">⚠️ No emergency number configured</p>
                  <p>Send this message to your emergency contact or local rescue services. Copy the coordinates and share them any way available.</p>
                </div>
              )}

              {/* Copy fallback */}
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 w-full border border-slate-600/50 text-slate-300 hover:bg-slate-700/30 font-semibold py-3 rounded-xl transition-colors text-sm"
                aria-label="Copy SOS payload to clipboard"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to clipboard!' : 'Copy emergency payload'}
              </button>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-[10px] text-slate-500">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  The app cannot send SMS silently — it opens your SMS app with a pre-filled message.
                  You must press Send. GPS works without internet; SMS requires cellular signal.
                  {isOnline ? ' Morales servers have been notified.' : ' Morales will sync automatically when internet returns.'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Retry sync button */}
        {sosState === 'error' && isOnline && (
          <button
            onClick={triggerOfflineSOS}
            className="flex items-center justify-center gap-2 w-full border border-red-600/50 text-red-300 hover:bg-red-900/30 font-semibold py-2.5 rounded-xl text-xs"
            aria-label="Retry sync to Morales servers"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Sync to Morales
          </button>
        )}

        {/* Advanced comms cascade — 6-channel fallback */}
        <details className="group">
          <summary className="list-none flex items-center gap-2 cursor-pointer select-none py-2">
            <span className="text-xs font-semibold text-slate-400 group-open:text-white transition-colors">
              ▸ Advanced Emergency Comms — Satellite · BLE · QR · Web Share
            </span>
          </summary>
          <div className="mt-3 rounded-2xl p-4" style={{ background: '#060B16', border: '1px solid #2A3F4A' }}>
            <EmergencyCommsCascade
              caseId={caseId}
              userId={userId}
              userEmail={userEmail}
              activitySessionId={activitySessionId}
              activityType={activityType}
              medicalCode={medicalCode}
            />
          </div>
        </details>
      </div>
    </div>
  );
}