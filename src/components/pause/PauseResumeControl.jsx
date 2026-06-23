import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  buildPausePacket,
  enqueuePause,
  getUnsyncedPause,
  markPauseSynced,
  setLocalPauseState,
  getLocalPauseState,
} from '@/offline/pause/offlinePauseQueue';

/**
 * PauseResumeControl
 *
 * Tap-to-pause / tap-to-resume the patient journey.
 * Offline-first: flips local state immediately, syncs to manageTripPause when online.
 * While paused: all Task 1–3 notifications are suppressed on the server.
 *
 * Props:
 *   tripId         string  — TravelRequest ID
 *   initialPaused  boolean — from server (passed in by parent)
 *   onPauseChange  fn(paused: boolean) — optional callback
 */
export default function PauseResumeControl({ tripId, initialPaused = false, onPauseChange }) {
  const [isOnline,  setIsOnline]  = useState(navigator.onLine);
  const [paused,    setPaused]    = useState(() => getLocalPauseState(tripId)?.paused ?? initialPaused);
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | synced | error
  const [reason,    setReason]    = useState('');
  const [showReason,setShowReason]= useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const syncingRef = useRef(false);

  // Sync server state on mount
  useEffect(() => {
    const local = getLocalPauseState(tripId);
    if (local.paused !== undefined) setPaused(local.paused);
    else setPaused(initialPaused);
  }, [tripId, initialPaused]);

  // Online tracking
  useEffect(() => {
    const up   = () => { setIsOnline(true);  syncQueued(); };
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);       // eslint-disable-line react-hooks/exhaustive-deps

  const syncPacket = useCallback(async (packet) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncState('syncing');
    try {
      await base44.functions.invoke('manageTripPause', {
        action:  packet.action,
        trip_id: packet.trip_id,
        reason:  packet.reason,
      });
      markPauseSynced(packet.offline_packet_id);
      setSyncState('synced');
    } catch (_) {
      setSyncState('error');
      setErrorMsg('Sync failed — state saved offline, will retry on reconnect.');
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const syncQueued = useCallback(async () => {
    const unsynced = getUnsyncedPause();
    for (const p of unsynced) {
      if (!syncingRef.current) await syncPacket(p);
    }
  }, [syncPacket]);

  const handlePause = async () => {
    if (paused || !tripId) return;
    setErrorMsg('');
    const now = new Date().toISOString();

    // Local-first flip
    setPaused(true);
    setLocalPauseState(tripId, true, reason, now);
    setShowReason(false);
    onPauseChange?.(true);

    const packet = buildPausePacket({ tripId, action: 'pause', reason, pausedAt: now });
    enqueuePause(packet);
    if (navigator.onLine) await syncPacket(packet);
    setReason('');
  };

  const handleResume = async () => {
    if (!paused || !tripId) return;
    setErrorMsg('');

    // Local-first flip
    setPaused(false);
    setLocalPauseState(tripId, false, '', null);
    onPauseChange?.(false);

    const packet = buildPausePacket({ tripId, action: 'resume', reason: '' });
    enqueuePause(packet);
    if (navigator.onLine) await syncPacket(packet);
  };

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${
        paused ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${paused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <p className={`text-sm font-semibold ${paused ? 'text-amber-800' : 'text-slate-700'}`}>
            {paused ? 'Journey paused — notifications suppressed' : 'Journey active'}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                   : 'bg-amber-50  text-amber-600  border border-amber-200'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Main action button */}
      <AnimatePresence mode="wait">
        {!paused ? (
          <motion.div key="pause-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {/* Reason input (shown before pausing) */}
            {showReason ? (
              <div className="space-y-2">
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason for pausing (optional — e.g. resting, family visit)"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handlePause}
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Pause className="w-4 h-4" /> Confirm Pause
                  </button>
                  <button onClick={() => { setShowReason(false); setReason(''); }}
                    className="px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowReason(true)}
                className="w-full py-3.5 rounded-2xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <Pause className="w-4 h-4" /> Pause Journey
              </button>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="resume-btn"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleResume}
            disabled={syncState === 'syncing'}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60"
          >
            {syncState === 'syncing'
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resuming…</>
              : <><Play className="w-4 h-4" /> Resume Journey</>
            }
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sync status */}
      {syncState === 'synced' && (
        <p className="text-[11px] text-emerald-600 text-center">
          {paused ? 'Journey paused' : 'Journey resumed'} — timings recalculated ✓
        </p>
      )}
      {!isOnline && (
        <p className="text-[11px] text-amber-600 text-center">
          State saved offline — will sync and recalculate when reconnected.
        </p>
      )}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Pause info */}
      {paused && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800">While paused:</p>
          <ul className="text-xs text-amber-700 space-y-0.5">
            <li>• Flight alerts are suppressed</li>
            <li>• Driver handshake timeouts are suppressed</li>
            <li>• Recovery check-in reminders are suppressed</li>
            <li>• Welcome messages are suppressed</li>
          </ul>
          <p className="text-xs text-amber-600 mt-1">
            On resume, all partner timings will be shifted forward by the pause duration.
          </p>
        </div>
      )}
    </div>
  );
}
