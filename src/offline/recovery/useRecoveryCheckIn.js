/**
 * useRecoveryCheckIn
 * Hook for submitting daily recovery check-ins — offline-first.
 *
 * Lifecycle (mirrors Tasks 1 & 2):
 *   1. Patient fills form and taps Submit.
 *   2. Packet written to localStorage immediately (works offline).
 *   3. If online → call checkRecoveryAnomaly → mark synced.
 *   4. If offline → stays 'queued' until reconnect.
 *   5. On reconnect → replay all unsynced packets.
 *
 * Usage:
 *   const { form, setForm, submitState, anomalyResult, submit, isOnline }
 *     = useRecoveryCheckIn({ sessionId, tripId, caseId });
 *
 * submitState: 'idle' | 'queued' | 'syncing' | 'done' | 'error'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  buildRecoveryPacket,
  enqueueRecovery,
  getUnsyncedRecovery,
  markRecoverySynced,
} from './offlineRecoveryQueue';

const DEFAULT_FORM = {
  painLevel:   5,
  mobility:    3,
  appetite:    3,
  woundStatus: 'good',
  notes:       '',
};

export function useRecoveryCheckIn({ sessionId, tripId = '', caseId = '' }) {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [form,          setForm]          = useState(DEFAULT_FORM);
  const [submitState,   setSubmitState]   = useState('idle');
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const syncingRef = useRef(false);

  // Online/offline tracking
  useEffect(() => {
    const up   = () => { setIsOnline(true); syncQueued(); };
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);                    

  const syncPacket = useCallback(async (packet) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSubmitState('syncing');
    try {
      const res = await base44.functions.invoke('checkRecoveryAnomaly', {
        session_id:       packet.session_id,
        trip_id:          packet.trip_id,
        case_id:          packet.case_id,
        pain_level:       packet.pain_level,
        mobility:         packet.mobility,
        appetite:         packet.appetite,
        wound_status:     packet.wound_status,
        notes:            packet.notes,
        submitted_via:    'app',
        offline_packet_id: packet.offline_packet_id,
      });
      markRecoverySynced(packet.offline_packet_id);
      setAnomalyResult(res.data || null);
      setSubmitState('done');
    } catch (_) {
      setSubmitState('error');
      setErrorMsg('Sync failed — check-in is saved offline and will retry when connected.');
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const syncQueued = useCallback(async () => {
    const unsynced = getUnsyncedRecovery();
    for (const p of unsynced) {
      if (!syncingRef.current) await syncPacket(p);
    }
  }, [syncPacket]);

  const submit = useCallback(async () => {
    if (submitState !== 'idle' && submitState !== 'error') return;
    if (!sessionId) { setErrorMsg('No active recovery session found.'); return; }
    setErrorMsg('');

    const packet = buildRecoveryPacket({
      sessionId,
      tripId,
      caseId,
      painLevel:   form.painLevel,
      mobility:    form.mobility,
      appetite:    form.appetite,
      woundStatus: form.woundStatus,
      notes:       form.notes,
    });

    enqueueRecovery(packet);
    setSubmitState('queued');

    if (navigator.onLine) {
      await syncPacket(packet);
    }
    // If offline: stays 'queued' until reconnect triggers syncQueued
  }, [submitState, sessionId, tripId, caseId, form, syncPacket]);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setSubmitState('idle');
    setAnomalyResult(null);
    setErrorMsg('');
  }, []);

  return {
    isOnline,
    form,
    setForm,
    submitState,
    anomalyResult,
    errorMsg,
    submit,
    reset,
  };
}
